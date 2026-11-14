import {
  ErrorCode,
  formatMoney,
  type AdminBulkTier,
  type AdminBulkTierParsed,
  type AdminDiscountCode,
  type AdminDiscountCodeParsed,
  type AdminFlashSale,
  type AdminFlashSaleInputParsed,
  type AdminGiftRule,
} from '@store/shared';

import { db } from '../../db/client.ts';
import { uniqueViolation } from '../../lib/db-errors.ts';
import { conflict, notFound, validation } from '../../lib/errors.ts';

import * as repo from './admin-repo.ts';
import { syncFlashSales } from './service.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CodeRowShape = NonNullable<Awaited<ReturnType<typeof repo.getCode>>>;

const toCode = (r: CodeRowShape): AdminDiscountCode => ({
  ...r,
  startsAt: r.startsAt?.toISOString() ?? null,
  endsAt: r.endsAt?.toISOString() ?? null,
  archivedAt: r.archivedAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

const toValues = (input: AdminDiscountCodeParsed): repo.CodeValues => ({
  ...input,
  // Only a fixed amount has a value per currency. A PUT that turns a fixed code into a percent or
  // free-shipping one usually leaves the map out ("keep it"), which would keep a stale GBP amount
  // that a later switch back to fixed would silently revive: clear it instead.
  valueByCurrency: input.kind === 'fixed' ? input.valueByCurrency : {},
  startsAt: input.startsAt ? new Date(input.startsAt) : null,
  endsAt: input.endsAt ? new Date(input.endsAt) : null,
});

// The unique index is on the citext column, so "paws10" and "PAWS10" collide here too. Mapping
// the violation (not only pre-checking) also covers two admins saving the same code at once.
async function mapDuplicate<T>(work: () => Promise<T>, message: string): Promise<T> {
  try {
    return await work();
  } catch (err) {
    if (uniqueViolation(err) !== undefined) throw conflict(ErrorCode.CONFLICT, message);
    throw err;
  }
}

const DUPLICATE_CODE = 'A code with that name already exists (codes are not case-sensitive).';

export async function listCodes(): Promise<AdminDiscountCode[]> {
  return (await repo.listCodes()).map(toCode);
}

export async function createCode(input: AdminDiscountCodeParsed): Promise<AdminDiscountCode> {
  const id = await mapDuplicate(() => repo.insertCode(toValues(input)), DUPLICATE_CODE);
  return getCode(id);
}

export async function getCode(id: string): Promise<AdminDiscountCode> {
  const row = await repo.getCode(id);
  if (!row) throw notFound('Discount code not found');
  return toCode(row);
}

export async function updateCode(
  id: string,
  input: AdminDiscountCodeParsed,
): Promise<AdminDiscountCode> {
  const found = await mapDuplicate(() => repo.updateCode(id, toValues(input)), DUPLICATE_CODE);
  if (!found) throw notFound('Discount code not found');
  return getCode(id);
}

// "Delete" keeps history: a code that any order ever used is archived (it stops working and
// leaves the active list), one that was never used is removed for good.
export async function deleteCode(id: string): Promise<'deleted' | 'archived'> {
  await getCode(id);
  if ((await repo.redemptionRows(id)) > 0) {
    await repo.archiveCode(id);
    return 'archived';
  }
  await repo.deleteCode(id);
  return 'deleted';
}

// ----- bulk tiers -----
const DUPLICATE_TIER = 'There is already a tier for that spend. Edit it instead.';

const toTier = (r: {
  id: string;
  minCents: number;
  minByCurrency: Record<string, number>;
  percent: number;
  active: boolean;
}): AdminBulkTier => ({
  id: r.id,
  minCents: r.minCents,
  minByCurrency: r.minByCurrency,
  percent: r.percent,
  active: r.active,
});

export async function listTiers() {
  return (await repo.listTiers()).map(toTier);
}
export async function createTier(input: AdminBulkTierParsed) {
  return toTier(await mapDuplicate(() => repo.insertTier(input), DUPLICATE_TIER));
}
export async function updateTier(id: string, input: AdminBulkTierParsed) {
  const row = await mapDuplicate(() => repo.updateTier(id, input), DUPLICATE_TIER);
  if (!row) throw notFound('Tier not found');
  return toTier(row);
}
export async function deleteTier(id: string) {
  if (!(await repo.deleteTier(id))) throw notFound('Tier not found');
}

// ----- gift rule -----
export const getGiftRule = async (): Promise<AdminGiftRule | null> =>
  (await repo.activeGiftRule()) ?? null;

export async function setGiftRule(input: {
  thresholdCents: number;
  thresholdByCurrency?: Record<string, number> | undefined;
  variant: string;
}): Promise<AdminGiftRule> {
  const variant = await repo.findVariant(
    UUID.test(input.variant) ? { id: input.variant } : { sku: input.variant },
  );
  if (!variant) {
    throw validation({
      formErrors: [],
      fieldErrors: { variant: ['No variant has that SKU or id'] },
    });
  }
  if (variant.status !== 'active' || variant.productStatus !== 'active') {
    throw validation({
      formErrors: [],
      fieldErrors: { variant: ['That variant is not active, so it cannot be given away'] },
    });
  }
  // A threshold in a currency the gift has no price in would never give it (the engine skips such
  // a gift, see the decisions log): say so now instead of saving a rule that silently does nothing.
  // A PUT that leaves the map out keeps the stored one, so that is the map to check.
  const thresholds =
    input.thresholdByCurrency ?? (await repo.activeGiftRule())?.thresholdByCurrency ?? {};
  const priced = new Set(await repo.variantCurrencies(variant.id));
  const unpriced = Object.keys(thresholds).filter((c) => !priced.has(c));
  if (unpriced.length > 0) {
    const list = unpriced.join(', ');
    throw validation({
      formErrors: [],
      fieldErrors: {
        thresholdByCurrency: [
          `The gift has no ${list} price, so it would never be given there. Add a ${list} price to the variant, or leave the ${list} threshold empty.`,
        ],
      },
    });
  }
  await mapDuplicate(
    () => repo.setGiftRule(input.thresholdCents, variant.id, input.thresholdByCurrency),
    'Another admin just set a gift rule. Reload and try again.',
  );
  const rule = await repo.activeGiftRule();
  return rule!;
}

export async function clearGiftRule(): Promise<void> {
  if ((await repo.clearGiftRule()) === 0) throw notFound('There is no active gift rule');
}

// ----- flash sales (step 18.8b) -----
// Editing rules: a scheduled sale is edited freely; once it is active its prices and items are
// frozen (shoppers are paying them, and its Omnibus references are fixed), so the only changes are
// an earlier end or ending it now; an ended sale is history. Status is brought up to date first
// (syncFlashSales) so "scheduled" really means it has not started.

type SaleRowShape = NonNullable<Awaited<ReturnType<typeof repo.getSale>>>;

const toSale = (s: SaleRowShape): AdminFlashSale => ({
  id: s.id,
  name: s.name,
  startsAt: s.startsAt.toISOString(),
  endsAt: s.endsAt.toISOString(),
  status: s.status,
  itemCount: s.items.length,
  items: s.items.map(({ saleId: _saleId, ...item }) => item),
  createdAt: s.createdAt.toISOString(),
});

export async function listSales(): Promise<AdminFlashSale[]> {
  await syncFlashSales(db);
  return (await repo.listSales()).map(toSale);
}

export async function getSale(id: string): Promise<AdminFlashSale> {
  const row = await repo.getSale(db, id);
  if (!row) throw notFound('Flash sale not found');
  return toSale(row);
}

const fieldError = (field: string, message: string) =>
  validation({ formErrors: [], fieldErrors: { [field]: [message] } });

// Resolves each item's SKU/id and applies the price rules, collecting every problem at once so
// the form can mark all the rows (keys like "items.2.variant").
async function resolveItems(items: AdminFlashSaleInputParsed['items']) {
  const ids = items.map((i) => i.variant).filter((v) => UUID.test(v));
  const skus = items.map((i) => i.variant).filter((v) => !UUID.test(v));
  const found = await repo.findVariantsWithPrice(db, ids, skus);
  const byKey = new Map<string, (typeof found)[number]>();
  for (const v of found) {
    byKey.set(v.id.toLowerCase(), v);
    byKey.set(v.sku.toLowerCase(), v);
  }
  const fieldErrors: Record<string, string[]> = {};
  const seen = new Set<string>();
  const out: { variantId: string; salePriceCents: number }[] = [];
  items.forEach((item, i) => {
    const v = byKey.get(item.variant.toLowerCase());
    if (!v) {
      fieldErrors[`items.${i}.variant`] = ['No variant has that SKU or id'];
      return;
    }
    if (v.status !== 'active' || v.productStatus !== 'active') {
      fieldErrors[`items.${i}.variant`] = ['That variant is not active, so it cannot go on sale'];
    } else if (seen.has(v.id)) {
      fieldErrors[`items.${i}.variant`] = ['This variant is already in the sale'];
    } else if (item.salePriceCents >= v.priceCents) {
      fieldErrors[`items.${i}.salePriceCents`] = [
        `The sale price must be below the regular price (${formatMoney(v.priceCents, 'EUR')})`,
      ];
    }
    seen.add(v.id);
    out.push({ variantId: v.id, salePriceCents: item.salePriceCents });
  });
  if (Object.keys(fieldErrors).length > 0) throw validation({ formErrors: [], fieldErrors });
  return out;
}

const notEditable = (status: string) =>
  conflict(
    ErrorCode.CONFLICT,
    status === 'active'
      ? 'This sale is running. Its items and prices are locked: you can end it earlier or end it now.'
      : 'This sale has ended and stays as history.',
  );

export async function createSale(input: AdminFlashSaleInputParsed): Promise<AdminFlashSale> {
  const items = await resolveItems(input.items);
  const id = await repo.insertSale(
    { name: input.name, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) },
    items,
  );
  return getSale(id);
}

export async function updateSale(
  id: string,
  input: AdminFlashSaleInputParsed,
): Promise<AdminFlashSale> {
  await syncFlashSales(db);
  const items = await resolveItems(input.items);
  const result = await repo.replaceScheduledSale(
    id,
    { name: input.name, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) },
    items,
  );
  if (result === 'missing') throw notFound('Flash sale not found');
  if (result !== 'ok') throw notEditable(result.status);
  return getSale(id);
}

export async function deleteSale(id: string): Promise<void> {
  await syncFlashSales(db);
  const result = await repo.deleteScheduledSale(id);
  if (result === 'missing') throw notFound('Flash sale not found');
  if (result !== 'ok') {
    throw conflict(
      ErrorCode.CONFLICT,
      result.status === 'active'
        ? 'A running sale cannot be deleted. End it instead.'
        : 'An ended sale stays as history and cannot be deleted.',
    );
  }
}

// Moves an active sale's end earlier. Ending "now" reuses it with the current time; the sync then
// closes the sale and records the price going back to regular, exactly as a natural end does.
async function moveEnd(id: string, requested: Date | 'now'): Promise<AdminFlashSale> {
  await syncFlashSales(db);
  const now = new Date();
  let at = now;
  const result = await repo.moveActiveEnd(id, (row) => {
    // A sale that started this very millisecond still needs an end after its start.
    at =
      requested === 'now'
        ? new Date(Math.max(now.getTime(), row.startsAt.getTime() + 1))
        : requested;
    if (at.getTime() >= row.endsAt.getTime())
      return { refuse: 'A running sale can only end earlier, not later.' };
    if (requested !== 'now' && at.getTime() <= now.getTime()) {
      return { refuse: 'That time has passed. Use "End now" to stop the sale.' };
    }
    return at;
  });
  if (result.kind === 'missing') throw notFound('Flash sale not found');
  if (result.kind === 'refused') throw fieldError('endsAt', result.message);
  if (result.kind === 'status') throw notEditable(result.status);
  // Only ending now closes the sale here; an earlier (future) end is left to its time.
  if (requested === 'now') await syncFlashSales(db, new Date(Math.max(at.getTime(), Date.now())));
  return getSale(id);
}

export const shortenSale = (id: string, endsAt: string) => moveEnd(id, new Date(endsAt));
export const endSaleNow = (id: string) => moveEnd(id, 'now');

export async function lookupVariant(sku: string) {
  const [v] = await repo.findVariantsWithPrice(
    db,
    UUID.test(sku) ? [sku] : [],
    UUID.test(sku) ? [] : [sku],
  );
  if (!v) throw notFound('No variant has that SKU or id');
  return {
    variantId: v.id,
    sku: v.sku,
    productName: v.productName,
    variantName: v.variantName,
    regularCents: v.priceCents,
  };
}
