import { and, asc, count, desc, eq, gt, inArray, isNull, lt, lte, ne, or, sql } from 'drizzle-orm';

import { db, type Tx } from '../../db/client.ts';
import {
  bulkTiers,
  discountCodes,
  discountRedemptions,
  flashSaleItems,
  flashSales,
  giftRules,
  inventory,
  orderPromotions,
  orders,
  payments,
  priceHistory,
  productImages,
  productVariants,
  products,
} from '../../db/schema/index.ts';
import { currentStore } from '../i18n/context.ts';
import { priceIn } from '../i18n/prices.ts';

type Run = typeof db | Tx;

export type CodeRow = typeof discountCodes.$inferSelect;

export async function findCode(run: Run, code: string): Promise<CodeRow | undefined> {
  // citext: matches whatever case the shopper typed.
  const [row] = await run.select().from(discountCodes).where(eq(discountCodes.code, code));
  return row;
}

// Locks the code row so two checkouts racing for the last use of a capped code queue up: the
// second one counts the first one's redemption.
export async function lockCode(tx: Tx, id: string): Promise<CodeRow | undefined> {
  const [row] = await tx.select().from(discountCodes).where(eq(discountCodes.id, id)).for('update');
  return row;
}

// A threshold in a currency: EUR is the base column, any other currency its `by_currency` entry.
// undefined means the rule has no amount there and so does not apply (nothing is converted).
export function amountIn(
  eurCents: number,
  byCurrency: Record<string, number>,
  currency: string,
): number | undefined {
  return currency === 'EUR' ? eurCents : byCurrency[currency];
}

export async function activeTiers(run: Run, currency: string = currentStore().currency) {
  const rows = await run
    .select()
    .from(bulkTiers)
    .where(eq(bulkTiers.active, true))
    .orderBy(asc(bulkTiers.minCents));
  return rows
    .flatMap((t) => {
      const minCents = amountIn(t.minCents, t.minByCurrency, currency);
      return minCents === undefined ? [] : [{ id: t.id, minCents, percent: t.percent }];
    })
    .sort((a, b) => a.minCents - b.minCents);
}

// The active gift rule with what the cart needs to show the gift, and whether one can be given:
// the variant and product must be on sale and at least one unit free to reserve. A gift with no
// price in the currency is not sold in that store, so it is not given there either (it would be
// recorded at 0 and the "worth X" line would be wrong): no rule in that currency.
export async function activeGift(run: Run, currency: string = currentStore().currency) {
  const [row] = await run
    .select({
      id: giftRules.id,
      thresholdCents: giftRules.thresholdCents,
      thresholdByCurrency: giftRules.thresholdByCurrency,
      variantId: giftRules.variantId,
      productId: products.id,
      productName: products.name,
      variantName: productVariants.name,
      sku: productVariants.sku,
      priceCents: sql<number | null>`${priceIn(currency)}`,
      variantStatus: productVariants.status,
      productStatus: products.status,
      stock: inventory.quantity,
      reserved: inventory.reserved,
    })
    .from(giftRules)
    .innerJoin(productVariants, eq(productVariants.id, giftRules.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(inventory, eq(inventory.variantId, giftRules.variantId))
    .where(eq(giftRules.active, true))
    .limit(1);
  if (!row) return undefined;
  // No threshold in this currency: no gift rule here.
  const thresholdCents = amountIn(row.thresholdCents, row.thresholdByCurrency, currency);
  if (thresholdCents === undefined) return undefined;
  const priceCents = row.priceCents;
  if (priceCents === null) return undefined;
  const [image] = await run
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.productId, row.productId))
    .orderBy(asc(productImages.sortOrder))
    .limit(1);
  const available =
    row.variantStatus === 'active' &&
    row.productStatus === 'active' &&
    (row.stock ?? 0) - (row.reserved ?? 0) > 0;
  return { ...row, priceCents, thresholdCents, available, imageUrl: image?.url ?? null };
}

// Live (not released) redemptions of a code, in total and for one customer.
// `exceptOrderId`: a pending order being re-placed (a second "pay" click) must not count its own
// earlier redemption against the cap.
export async function countRedemptions(
  run: Run,
  codeId: string,
  customerKey: string,
  exceptOrderId?: string,
): Promise<{ total: number; mine: number }> {
  const live = and(
    eq(discountRedemptions.codeId, codeId),
    isNull(discountRedemptions.releasedAt),
    exceptOrderId ? ne(discountRedemptions.orderId, exceptOrderId) : undefined,
  );
  const [total] = await run.select({ n: count() }).from(discountRedemptions).where(live);
  const [mine] = await run
    .select({ n: count() })
    .from(discountRedemptions)
    .where(and(live, eq(discountRedemptions.customerKey, customerKey)));
  return { total: total?.n ?? 0, mine: mine?.n ?? 0 };
}

const PLACED = ['paid', 'awaiting_vet_approval', 'processing', 'shipped', 'delivered'] as const;

// Orders the customer has really placed (paid at some point), for first-order-only codes.
export async function countPlacedOrders(run: Run, userId: string | null, email: string | null) {
  const who = userId ? eq(orders.userId, userId) : email ? eq(orders.email, email) : undefined;
  if (!who) return 0;
  const [row] = await run
    .select({ n: count() })
    .from(orders)
    .where(and(who, inArray(orders.status, [...PLACED])));
  return row?.n ?? 0;
}

export async function activeGiftVariantId(run: Run): Promise<string | undefined> {
  const [row] = await run
    .select({ variantId: giftRules.variantId })
    .from(giftRules)
    .where(eq(giftRules.active, true))
    .limit(1);
  return row?.variantId;
}

// ---------- order snapshot ----------

export async function replaceOrderPromotions(
  tx: Tx,
  orderId: string,
  rows: Omit<typeof orderPromotions.$inferInsert, 'orderId'>[],
): Promise<void> {
  await tx.delete(orderPromotions).where(eq(orderPromotions.orderId, orderId));
  if (rows.length > 0) {
    await tx.insert(orderPromotions).values(rows.map((r) => ({ ...r, orderId })));
  }
}

export async function listOrderPromotions(run: Run, orderId: string) {
  return run
    .select()
    .from(orderPromotions)
    .where(eq(orderPromotions.orderId, orderId))
    .orderBy(asc(orderPromotions.createdAt), asc(orderPromotions.id));
}

// The order's redemption, rewritten with the order: none if the code no longer applies.
export async function replaceRedemption(
  tx: Tx,
  orderId: string,
  redemption: { codeId: string; customerKey: string } | null,
): Promise<void> {
  await tx.delete(discountRedemptions).where(eq(discountRedemptions.orderId, orderId));
  if (redemption) await tx.insert(discountRedemptions).values({ ...redemption, orderId });
}

export async function releaseRedemptions(tx: Tx, orderId: string): Promise<void> {
  await tx
    .update(discountRedemptions)
    .set({ releasedAt: new Date() })
    .where(and(eq(discountRedemptions.orderId, orderId), isNull(discountRedemptions.releasedAt)));
}

export async function wasPaid(run: Run, orderId: string): Promise<boolean> {
  const [row] = await run
    .select({ n: count() })
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, 'succeeded')));
  return (row?.n ?? 0) > 0;
}

// ---------- flash sales ----------

export type FlashSaleRow = typeof flashSales.$inferSelect;

// A cheap read-only check, so a request with nothing to sync costs one indexed SELECT and no
// transaction.
export async function hasSalesToSync(run: Run, now: Date): Promise<boolean> {
  const [row] = await run
    .select({ id: flashSales.id })
    .from(flashSales)
    .where(
      or(
        and(eq(flashSales.status, 'scheduled'), lte(flashSales.startsAt, now)),
        and(inArray(flashSales.status, ['scheduled', 'active']), lte(flashSales.endsAt, now)),
      ),
    )
    .limit(1);
  return row !== undefined;
}

// UPDATE ... RETURNING: a row flips exactly once, so with two concurrent callers only one gets it
// back and only that one writes its history. A sale whose whole window has already passed is not
// activated (it was never offered, so its price must not enter the Omnibus history); the end
// step below closes it.
export async function activateDueSales(run: Run, now: Date): Promise<FlashSaleRow[]> {
  return run
    .update(flashSales)
    .set({ status: 'active', updatedAt: sql`now()` })
    .where(
      and(
        eq(flashSales.status, 'scheduled'),
        lte(flashSales.startsAt, now),
        gt(flashSales.endsAt, now),
      ),
    )
    .returning();
}

// Returns the sales that were ACTIVE and are now ended (their prices went back to normal, which
// the history must record). A scheduled sale that is closed unopened returns nothing.
export async function endDueSales(run: Run, now: Date): Promise<FlashSaleRow[]> {
  const ended = await run
    .update(flashSales)
    .set({ status: 'ended', updatedAt: sql`now()` })
    .where(and(eq(flashSales.status, 'active'), lte(flashSales.endsAt, now)))
    .returning();
  await run
    .update(flashSales)
    .set({ status: 'ended', updatedAt: sql`now()` })
    .where(and(eq(flashSales.status, 'scheduled'), lte(flashSales.endsAt, now)));
  return ended;
}

export async function basePrices(run: Run, variantIds: string[]): Promise<Map<string, number>> {
  if (variantIds.length === 0) return new Map();
  const rows = await run
    .select({ id: productVariants.id, priceCents: productVariants.priceCents })
    .from(productVariants)
    .where(inArray(productVariants.id, variantIds));
  return new Map(rows.map((r) => [r.id, r.priceCents]));
}

export async function listSaleItems(run: Run, saleIds: string[]) {
  if (saleIds.length === 0) return [];
  return run.select().from(flashSaleItems).where(inArray(flashSaleItems.saleId, saleIds));
}

export type HistoryPoint = { priceCents: number; validFrom: Date };

// Base and sale prices strictly before `before` (member prices are not a price the public saw).
// Newest first, so the first row is the price in effect.
export async function priceHistoryBefore(
  run: Run,
  variantIds: string[],
  before: Date,
): Promise<Map<string, HistoryPoint[]>> {
  const out = new Map<string, HistoryPoint[]>();
  if (variantIds.length === 0) return out;
  const rows = await run
    .select({
      variantId: priceHistory.variantId,
      priceCents: priceHistory.priceCents,
      validFrom: priceHistory.validFrom,
    })
    .from(priceHistory)
    .where(
      and(
        inArray(priceHistory.variantId, variantIds),
        inArray(priceHistory.kind, ['base', 'sale']),
        lt(priceHistory.validFrom, before),
      ),
    )
    .orderBy(desc(priceHistory.validFrom), desc(priceHistory.createdAt));
  for (const r of rows) {
    const list = out.get(r.variantId) ?? [];
    list.push({ priceCents: r.priceCents, validFrom: r.validFrom });
    out.set(r.variantId, list);
  }
  return out;
}

export async function insertPriceHistory(
  run: Run,
  rows: (typeof priceHistory.$inferInsert)[],
): Promise<void> {
  if (rows.length > 0) await run.insert(priceHistory).values(rows);
}

export async function setReference(run: Run, itemId: string, referenceCents: number | null) {
  await run
    .update(flashSaleItems)
    .set({ referenceCents, updatedAt: sql`now()` })
    .where(eq(flashSaleItems.id, itemId));
}

export interface ActiveSaleRow {
  productId: string;
  variantId: string;
  saleId: string;
  salePriceCents: number;
  referenceCents: number | null;
  basePriceCents: number;
  endsAt: Date;
}

// The sale price that applies right now to each variant. Status alone is not trusted: the window
// is checked too, so a sale is over at exactly its ends_at even if no sync has run yet. Trial
// sizes are left out (they are fixed-price in the engine) and so is any "sale" that is not lower
// than the regular price. Overlapping sales: the lowest price wins, then the earliest end.
export async function activeSales(
  run: Run,
  by: { variantIds: string[] } | { productIds: string[] },
  now: Date,
  currency: string = currentStore().currency,
): Promise<ActiveSaleRow[]> {
  // Flash-sale prices are EUR amounts and there is no sale price per currency in v1: in any other
  // store a sale simply does not apply (never converted, never struck through).
  if (currency !== 'EUR') return [];
  const scope =
    'variantIds' in by
      ? by.variantIds.length > 0
        ? inArray(productVariants.id, by.variantIds)
        : undefined
      : by.productIds.length > 0
        ? inArray(productVariants.productId, by.productIds)
        : undefined;
  if (!scope) return [];
  return run
    .selectDistinctOn([flashSaleItems.variantId], {
      productId: productVariants.productId,
      variantId: flashSaleItems.variantId,
      saleId: flashSales.id,
      salePriceCents: flashSaleItems.salePriceCents,
      referenceCents: flashSaleItems.referenceCents,
      basePriceCents: productVariants.priceCents,
      endsAt: flashSales.endsAt,
    })
    .from(flashSaleItems)
    .innerJoin(flashSales, eq(flashSales.id, flashSaleItems.saleId))
    .innerJoin(productVariants, eq(productVariants.id, flashSaleItems.variantId))
    .where(
      and(
        scope,
        eq(flashSales.status, 'active'),
        lte(flashSales.startsAt, now),
        gt(flashSales.endsAt, now),
        eq(productVariants.isTrial, false),
        eq(productVariants.status, 'active'),
        sql`${flashSaleItems.salePriceCents} < ${productVariants.priceCents}`,
      ),
    )
    .orderBy(flashSaleItems.variantId, asc(flashSaleItems.salePriceCents), asc(flashSales.endsAt));
}

export interface MemberPriceRow {
  productId: string;
  variantId: string;
  memberPriceCents: number;
}

// Member prices that really are lower than the regular price (the engine ignores any other),
// for active, non-trial variants (a trial size is fixed-price).
export async function memberPrices(
  run: Run,
  by: { variantIds: string[] } | { productIds: string[] },
  currency: string = currentStore().currency,
): Promise<MemberPriceRow[]> {
  // Member prices are EUR-only in v1 (see activeSales).
  if (currency !== 'EUR') return [];
  const ids = 'variantIds' in by ? by.variantIds : by.productIds;
  if (ids.length === 0) return [];
  return run
    .select({
      productId: productVariants.productId,
      variantId: productVariants.id,
      memberPriceCents: sql<number>`${productVariants.memberPriceCents}`,
    })
    .from(productVariants)
    .where(
      and(
        'variantIds' in by
          ? inArray(productVariants.id, ids)
          : inArray(productVariants.productId, ids),
        eq(productVariants.isTrial, false),
        eq(productVariants.status, 'active'),
        sql`${productVariants.memberPriceCents} is not null`,
        sql`${productVariants.memberPriceCents} < ${productVariants.priceCents}`,
      ),
    );
}

export async function bannerSale(run: Run, now: Date): Promise<FlashSaleRow | undefined> {
  const [active] = await run
    .select()
    .from(flashSales)
    .where(
      and(
        eq(flashSales.status, 'active'),
        lte(flashSales.startsAt, now),
        gt(flashSales.endsAt, now),
      ),
    )
    .orderBy(asc(flashSales.endsAt), asc(flashSales.id))
    .limit(1);
  if (active) return active;
  const [next] = await run
    .select()
    .from(flashSales)
    .where(and(eq(flashSales.status, 'scheduled'), gt(flashSales.startsAt, now)))
    .orderBy(asc(flashSales.startsAt), asc(flashSales.id))
    .limit(1);
  return next;
}
