import {
  ErrorCode,
  MAX_LINE_QUANTITY,
  sumCents,
  type BulkAddFailure,
  type Cart,
  type CartItem,
  type CartWarning,
  type CartPricing,
  type OutOfStockDetails,
  type StoreCode,
  type StoreSwitchPreview,
  storeFromCode,
} from '@store/shared';

import { db, type Tx } from '../../db/client.ts';
import { AppError, conflict, notFound } from '../../lib/errors.ts';
import { bundleComponentsOf, listActiveShippingMethods } from '../checkout/repo.ts';
import { estimateRule, priceBeforeThreshold } from '../checkout/shipping.ts';
import { currentStore } from '../i18n/context.ts';
import * as promotions from '../promotions/service.ts';
import { customerKey, isRedeemed, trialLimit } from '../trials/service.ts';

import { getOrCreateUserCart, guestExpiry, userExpiry } from './identity.ts';
import * as repo from './repo.ts';

// Picks the picture for a line: the variant's own image first (the red one, if it is red), then a
// general product image, then whatever the product has. `images` arrives sorted by sort_order.
function pickImage(images: repo.ImageRow[], line: repo.LineRow): repo.ImageRow | undefined {
  return (
    images.find((i) => i.productId === line.productId && i.variantId === line.variantId) ??
    images.find((i) => i.productId === line.productId && i.variantId === null) ??
    images.find((i) => i.productId === line.productId)
  );
}

// ---------- stock planning across lines ----------
//
// Stock belongs to COMPONENTS, and one component can sit in several lines (a kit holding 1 rope
// plus 3 ropes on their own). Checking each line alone would pass a cart that checkout's merged
// reservation then refuses, so every check here works on per-variant demand across the whole cart.
interface StockPlan {
  partsOf(variantId: string): { variantId: string; qty: number }[];
  free: Map<string, number>;
}

async function planStock(tx: Tx, variantIds: string[]): Promise<StockPlan> {
  const kits = await bundleComponentsOf(tx, variantIds);
  const partsOf = (variantId: string) => kits.get(variantId) ?? [{ variantId, qty: 1 }];
  const free = await repo.freeUnits(tx, [
    ...new Set(variantIds.flatMap((v) => partsOf(v).map((p) => p.variantId))),
  ]);
  return { partsOf, free };
}

function addDemand(plan: StockPlan, demand: Map<string, number>, variantId: string, qty: number) {
  for (const p of plan.partsOf(variantId)) {
    demand.set(p.variantId, (demand.get(p.variantId) ?? 0) + p.qty * qty);
  }
}

// How many units of this line still fit once `demand` (the other lines) has taken its share.
function capacity(plan: StockPlan, demand: Map<string, number>, variantId: string): number {
  let fit = Number.POSITIVE_INFINITY;
  for (const p of plan.partsOf(variantId)) {
    const left = (plan.free.get(p.variantId) ?? 0) - (demand.get(p.variantId) ?? 0);
    fit = Math.min(fit, Math.floor(Math.max(0, left) / p.qty));
  }
  return Number.isFinite(fit) ? fit : 0;
}

// Demand of every line in the cart except the one for `exceptVariantId` (the line being changed).
async function demandOfOthers(
  tx: Tx,
  cartId: string,
  exceptVariantId: string,
  variantId: string,
): Promise<{ plan: StockPlan; demand: Map<string, number> }> {
  const others = (await repo.listItems(tx, cartId)).filter((i) => i.variantId !== exceptVariantId);
  const plan = await planStock(tx, [variantId, ...others.map((i) => i.variantId)]);
  const demand = new Map<string, number>();
  for (const i of others) addDemand(plan, demand, i.variantId, i.quantity);
  return { plan, demand };
}

// Builds the priced, stock-checked view of a cart and repairs the stored rows to match. Must run
// inside a transaction (the caller's, so a mutation can return its own result) because it takes
// the cart row lock: reading and repairing concurrently with an add could otherwise clamp a line
// against stale stock.
//
// Repairs are persisted, not just reported, so the cart converges: a clamped quantity stays
// clamped and an archived variant stays gone, and the warning is shown once (in the response that
// caused the repair), not forever.
export async function loadCart(tx: Tx, cartId: string): Promise<Cart> {
  // The cart is priced in the store view of THIS request, so a shopper who switches store sees the
  // same lines re-priced (a line with no price in the new currency drops out with a warning). The
  // store the cart was last shown in is remembered on the row, nothing more.
  const store = currentStore();
  const currency = store.currency;
  // Flash sales activate lazily on read (before the cart lock, so the sale rows are never locked
  // while holding it).
  await promotions.syncFlashSales(tx);
  const cartRow = await repo.lockCart(tx, cartId);
  // A currency switch re-prices every line, which is not a "the price moved" surprise: the
  // remembered prices are replaced quietly below.
  const switched = cartRow !== undefined && cartRow.currency !== currency;
  if (cartRow && (cartRow.storeView !== store.code || cartRow.currency !== currency)) {
    await repo.setStore(tx, cartId, store.code, currency);
  }
  const lines = await repo.listLines(tx, cartId, currency);
  const images = await repo.listImages(tx, [...new Set(lines.map((l) => l.productId))]);

  const plan = await planStock(
    tx,
    lines.map((l) => l.variantId),
  );
  const demand = new Map<string, number>();
  const warnings: CartWarning[] = [];
  const removeIds: string[] = [];
  const items: CartItem[] = [];
  let weightGrams = 0;
  let requiresVetApproval = false;
  const purchasableLines: { total: number; qty: number }[] = [];
  const pricingLines: promotions.PricingLineInput[] = [];

  for (const line of lines) {
    const base = {
      variantId: line.variantId,
      productName: line.productName,
      variantName: line.variantName,
    };

    // Archived (or draft) products and variants cannot be bought; drop the line and say so.
    // (Or with no price in this store's currency: it was added in another store view.)
    if (
      line.variantStatus !== 'active' ||
      line.productStatus !== 'active' ||
      line.priceCents === null
    ) {
      removeIds.push(line.itemId);
      warnings.push({ code: 'VARIANT_UNAVAILABLE', ...base });
      continue;
    }

    // What is left for this line after the lines above it took their components (a kit and its
    // own part on a separate line draw on the same units).
    const available = capacity(plan, demand, line.variantId);
    const maxQty = Math.min(MAX_LINE_QUANTITY, available);
    let quantity = line.quantity;

    if (available === 0) {
      // Kept (greyed out in the UI) rather than deleted: silently losing a line is worse than
      // showing it as sold out, and stock may come back.
      warnings.push({ code: 'OUT_OF_STOCK', ...base });
    } else if (quantity > maxQty) {
      warnings.push({ code: 'QTY_REDUCED', ...base, previousQuantity: quantity, quantity: maxQty });
      await repo.setItemQuantity(tx, line.itemId, maxQty);
      quantity = maxQty;
    }

    // Warn once when the catalog price moved since the shopper last saw it, then remember the new
    // price so the next read is calm. A null memory (line predates the column) is filled quietly.
    if (line.lastSeenPriceCents !== line.priceCents) {
      if (line.lastSeenPriceCents !== null && !switched) {
        warnings.push({
          code: 'PRICE_CHANGED',
          ...base,
          previousUnitPriceCents: line.lastSeenPriceCents,
          unitPriceCents: line.priceCents,
        });
      }
      await repo.setLastSeenPrice(tx, line.itemId, line.priceCents);
    }

    // Only what the shopper can actually buy takes stock from the lines below.
    if (available > 0) addDemand(plan, demand, line.variantId, quantity);

    const image = pickImage(images, line);
    const lineTotal = line.priceCents * quantity;
    items.push({
      id: line.itemId,
      variantId: line.variantId,
      productId: line.productId,
      productName: line.productName,
      productSlug: line.productSlug,
      variantName: line.variantName,
      sku: line.sku,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt ?? null,
      unitPriceCents: line.priceCents,
      quantity,
      lineTotalCents: lineTotal,
      available,
      maxQty,
    });

    // Sold-out lines are shown but never counted: the subtotal is what can actually be bought.
    if (available > 0) {
      purchasableLines.push({ total: lineTotal, qty: quantity });
      if (line.requiresVetApproval) requiresVetApproval = true;
      pricingLines.push({
        variantId: line.variantId,
        productId: line.productId,
        quantity,
        unitPriceCents: line.priceCents,
        // Trial sizes and kits both price at their own fixed price.
        isTrial: line.isTrial || line.isBundle,
      });
      weightGrams += line.weightGrams * quantity;
    }
  }

  await repo.deleteItems(tx, removeIds);

  const rule = estimateRule(await listActiveShippingMethods(tx, currency));
  const { pricing } = await promotions.price(tx, {
    currency,
    lines: pricingLines,
    userId: cartRow?.userId ?? null,
    email: null,
    code: cartRow?.discountCode ?? null,
    shipping: {
      methodCents: rule ? priceBeforeThreshold(rule, weightGrams) : 0,
      freeOverCents: rule?.freeOverCents ?? null,
    },
  });

  return {
    items,
    currency,
    subtotalCents: sumCents(purchasableLines.map((l) => l.total)),
    itemCount: purchasableLines.reduce((n, l) => n + l.qty, 0),
    weightGrams,
    warnings,
    pricing,
    requiresVetApproval,
  };
}

// What `GET /cart` answers for a visitor who has no cart yet (nothing is stored for them).
export function emptyCart(): Cart {
  return {
    items: [],
    currency: currentStore().currency,
    subtotalCents: 0,
    itemCount: 0,
    weightGrams: 0,
    warnings: [],
    pricing: EMPTY_PRICING,
    requiresVetApproval: false,
  };
}

const EMPTY_PRICING: CartPricing = {
  code: null,
  lines: [],
  adjustments: [],
  discountCents: 0,
  merchandiseCents: 0,
  shippingEstimateCents: 0,
  totalEstimateCents: 0,
  gift: null,
  progress: { freeShipping: null, gift: null, nextTier: null },
  notices: [],
};

export async function getCart(cartId: string): Promise<Cart> {
  return db.transaction((tx) => loadCart(tx, cartId));
}

// The lines that would drop if the shopper switched to `storeCode`: still buyable, but with no price
// in that store's currency. Read-only (no lock, no repair), so asking changes nothing; the store
// switcher shows the answer and the shopper decides. A switch within one currency drops nothing.
export async function previewStoreSwitch(
  cartId: string | undefined,
  storeCode: StoreCode,
): Promise<StoreSwitchPreview> {
  const target = storeFromCode(storeCode);
  if (!cartId || !target) return { dropped: [] };
  const lines = await db.transaction((tx) => repo.listLines(tx, cartId, target.currency));
  return {
    dropped: lines
      .filter(
        (l) =>
          l.priceCents === null && l.variantStatus === 'active' && l.productStatus === 'active',
      )
      .map((l) => ({
        variantId: l.variantId,
        productName: l.productName,
        variantName: l.variantName,
      })),
  };
}

// ---------- mutations ----------

// Every mutation runs as: open a transaction, lock the cart row, change it, and return the freshly
// loaded cart from the same transaction. The lock queues concurrent requests on this cart, so two
// simultaneous "add 3" calls against 5 in stock are checked one after the other (the second sees
// the first's rows) instead of both passing a check-then-insert and overselling. The whole cart
// goes back in the response so the UI needs one round trip, never a second GET that could show a
// state the mutation did not produce.
//
// `cartId` here is always the caller's own (see `withCart`): nothing in this file accepts a cart
// id from the request.
async function mutate(
  cartId: string,
  change: (tx: Tx, cart: repo.CartRow) => Promise<void>,
): Promise<Cart> {
  return db.transaction(async (tx) => {
    const cart = await repo.lockCart(tx, cartId);
    if (!cart) throw notFound('Cart not found');
    await change(tx, cart);
    await repo.setExpiry(tx, cartId, cart.userId ? userExpiry() : guestExpiry());
    return loadCart(tx, cartId);
  });
}

function outOfStock(details: OutOfStockDetails) {
  const message =
    details.maxQty === 0
      ? 'This item is sold out'
      : `Only ${details.maxQty} available, and you already have ${details.inCart} in your cart`;
  return conflict(ErrorCode.OUT_OF_STOCK, message, details);
}

// The cart-level half of the trial rule: at most 1 of a trial variant in the cart, and none if the
// signed-in customer already had it. (A guest's history is unknown until checkout asks for their
// email, so checkout repeats the check; see checkout/service.ts.)
async function assertTrialAddable(tx: Tx, cart: repo.CartRow, variantId: string, total: number) {
  if (total > 1) throw trialLimit(variantId, 'A trial size is limited to one per customer');
  if (cart.userId && (await isRedeemed(tx, customerKey(cart.userId, ''), variantId))) {
    throw trialLimit(variantId, 'You have already had this trial size');
  }
}

// One line of an add, inside the caller's transaction. Throws the same errors for a single add and
// for each line of a bulk add.
async function addLine(
  tx: Tx,
  cart: repo.CartRow,
  cartId: string,
  variantId: string,
  quantity: number,
): Promise<void> {
  const stock = await repo.findPurchasable(tx, variantId);
  if (!stock) throw notFound('Product variant not found');
  // Stock left for this variant once the OTHER lines (kits expanded) have their share.
  const others = await demandOfOthers(tx, cartId, variantId, variantId);
  const maxQty = Math.min(MAX_LINE_QUANTITY, capacity(others.plan, others.demand, variantId));

  const existing = await repo.findItemByVariant(tx, cartId, variantId);
  const inCart = existing?.quantity ?? 0;
  if (stock.isTrial) await assertTrialAddable(tx, cart, variantId, inCart + quantity);
  // Adding is cumulative (the contract says "adds to existing qty"), and the total is what is
  // checked: 3 in the cart plus 3 more must fit in stock together.
  if (inCart + quantity > maxQty) {
    throw outOfStock({ variantId, maxQty, inCart, requested: quantity });
  }
  if (existing) {
    await repo.setItemQuantity(tx, existing.id, inCart + quantity, stock.priceCents);
  } else await repo.insertItem(tx, cartId, variantId, quantity, stock.priceCents);
}

export async function addItem(cartId: string, variantId: string, quantity: number): Promise<Cart> {
  return mutate(cartId, (tx, cart) => addLine(tx, cart, cartId, variantId, quantity));
}

// All or nothing: every line is tried inside ONE transaction and the problems of every line are
// collected, so the shopper hears about all of them at once, and if any line fails the throw rolls
// the whole transaction back (no half-filled cart). Each failure keeps its own code, so the web can
// say "sold out" for one line and "one per customer" for another.
export async function addItems(
  cartId: string,
  lines: { variantId: string; quantity: number }[],
): Promise<Cart> {
  return mutate(cartId, async (tx, cart) => {
    const failures: BulkAddFailure[] = [];
    for (const line of lines) {
      try {
        await addLine(tx, cart, cartId, line.variantId, line.quantity);
      } catch (err) {
        if (!(err instanceof AppError)) throw err;
        const details = err.details as { maxQty?: number } | undefined;
        failures.push({
          variantId: line.variantId,
          code:
            err.code === ErrorCode.OUT_OF_STOCK || err.code === ErrorCode.TRIAL_LIMIT
              ? err.code
              : 'NOT_FOUND',
          message: err.message,
          ...(typeof details?.maxQty === 'number' && { maxQty: details.maxQty }),
        });
      }
    }
    if (failures.length > 0) {
      throw conflict(ErrorCode.CONFLICT, 'Some items could not be added', { failures });
    }
  });
}

// Sets an absolute quantity; 0 deletes the line.
export async function updateItem(cartId: string, itemId: string, quantity: number): Promise<Cart> {
  return mutate(cartId, async (tx, cart) => {
    const item = await repo.findItemInCart(tx, cartId, itemId);
    if (!item) throw notFound('Cart item not found');
    if (quantity === 0) {
      await repo.deleteItems(tx, [item.id]);
      return;
    }
    const stock = await repo.findPurchasable(tx, item.variantId);
    if (!stock) throw notFound('Product variant not found');
    if (stock.isTrial) await assertTrialAddable(tx, cart, item.variantId, quantity);
    const others = await demandOfOthers(tx, cartId, item.variantId, item.variantId);
    const maxQty = Math.min(
      MAX_LINE_QUANTITY,
      capacity(others.plan, others.demand, item.variantId),
    );
    if (quantity > maxQty) {
      throw outOfStock({
        variantId: item.variantId,
        maxQty,
        inCart: item.quantity,
        requested: quantity,
      });
    }
    await repo.setItemQuantity(tx, item.id, quantity, stock.priceCents);
  });
}

export async function removeItem(cartId: string, itemId: string): Promise<Cart> {
  return mutate(cartId, async (tx) => {
    const item = await repo.findItemInCart(tx, cartId, itemId);
    if (!item) throw notFound('Cart item not found');
    await repo.deleteItems(tx, [item.id]);
  });
}

// Applies a code only if it would really do something now; otherwise refuses with a kind reason
// and leaves the cart as it was. A code that later stops applying (cart shrank, code expired)
// stays on the cart and the pricing notices explain why it is not counted.
export async function applyCode(cartId: string, code: string): Promise<Cart> {
  return mutate(cartId, async (tx) => {
    await repo.setDiscountCode(tx, cartId, code);
    const trial = await loadCart(tx, cartId);
    const refusal = promotions.codeRefusal(
      trial.pricing,
      await promotions.findCode(tx, code),
      code,
      trial.currency,
    );
    if (refusal) throw promotions.codeError(refusal);
  });
}

export async function removeCode(cartId: string): Promise<Cart> {
  return mutate(cartId, (tx) => repo.setDiscountCode(tx, cartId, null));
}

export async function clear(cartId: string): Promise<Cart> {
  return mutate(cartId, (tx) => repo.deleteAllItems(tx, cartId));
}

// ---------- merge on login ----------

export interface MergeResult {
  /** Guest lines that ended up in the user's cart (added or summed). */
  merged: number;
  /** Of those, how many were limited by stock or the 99 cap. */
  clamped: number;
  /** Guest lines left behind because the variant is archived, not on sale or sold out. */
  dropped: number;
}

// Moves a guest cart into the user's active cart when they sign in or register. The rules, which
// are deterministic (same inputs, same result, whatever order requests arrive in):
//   1. Only a live guest cart merges: active, ownerless, not expired. Anything else is a no-op, so
//      a stale or foreign cookie can never pull someone else's cart into an account.
//   2. Quantities for the same variant are SUMMED, then limited to min(99, available stock).
//   3. A merge never lowers what the user already had: the result is at least their old quantity,
//      even if stock has since dropped (the next cart read applies the usual QTY_REDUCED clamp).
//   4. A guest line whose variant is archived, not on sale or sold out is dropped, never added.
//   5. Variants only the guest had are added; variants only the user had are untouched.
//   6. The guest cart is marked `merged` (its rows stay as provenance) so it cannot merge twice.
//   7. All of it is one transaction: a failure leaves both carts exactly as they were.
// Lock order is always guest cart first, then user cart. Mutations lock a single cart, so no
// request ever waits for these two in the opposite order (no deadlock), and two simultaneous
// logins carrying the same guest cookie queue on the guest lock, the second sees `merged` and
// does nothing (no double count).
export async function mergeGuestCart(guestCartId: string, userId: string): Promise<MergeResult> {
  return db.transaction(async (tx) => {
    const result: MergeResult = { merged: 0, clamped: 0, dropped: 0 };

    const guest = await repo.lockCart(tx, guestCartId);
    const live =
      guest && guest.userId === null && guest.status === 'active' && guest.expiresAt > new Date();
    if (!guest || !live) return result;

    const userCart = await getOrCreateUserCart(userId, tx);
    await repo.lockCart(tx, userCart.id);

    for (const line of await repo.listItems(tx, guest.id)) {
      const stock = await repo.findPurchasable(tx, line.variantId);
      // A trial size merges as at most one unit, and not at all if the account already had it.
      const trialCap = stock?.isTrial
        ? (await isRedeemed(tx, customerKey(userId, ''), line.variantId))
          ? 0
          : 1
        : MAX_LINE_QUANTITY;
      const maxQty = stock ? Math.min(trialCap, stock.available) : 0;
      const existing = await repo.findItemByVariant(tx, userCart.id, line.variantId);
      const had = existing?.quantity ?? 0;

      const wanted = had + line.quantity;
      const quantity = Math.max(had, Math.min(wanted, maxQty));
      if (quantity === 0) {
        result.dropped += 1;
        continue;
      }
      // A merge is not the shopper looking at a price: the user's own line keeps what it
      // remembered, and a guest-only line brings its memory along, so a pending change still warns.
      if (existing) await repo.setItemQuantity(tx, existing.id, quantity);
      else {
        await repo.insertItem(tx, userCart.id, line.variantId, quantity, line.lastSeenPriceCents);
      }
      result.merged += 1;
      if (quantity < wanted) result.clamped += 1;
    }

    await repo.setExpiry(tx, userCart.id, userExpiry());
    await repo.markStatus(guest.id, 'merged', tx);
    return result;
  });
}
