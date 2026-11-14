import { and, asc, count, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import {
  bulkTiers,
  discountCodes,
  discountRedemptions,
  flashSaleItems,
  flashSales,
  giftRules,
  productVariants,
  products,
  variantPrices,
} from '../../db/schema/index.ts';

// Admin-side queries for the promotion rules. The shopper-facing reads live in repo.ts.

export type CodeValues = Omit<
  typeof discountCodes.$inferInsert,
  'id' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'ownerUserId'
>;

const liveRedemptions = sql<number>`(
  select count(*)::int from ${discountRedemptions}
  where ${discountRedemptions.codeId} = ${discountCodes.id} and ${discountRedemptions.releasedAt} is null
)`;

const codeColumns = {
  id: discountCodes.id,
  code: discountCodes.code,
  kind: discountCodes.kind,
  value: discountCodes.value,
  minSpendCents: discountCodes.minSpendCents,
  valueByCurrency: discountCodes.valueByCurrency,
  minSpendByCurrency: discountCodes.minSpendByCurrency,
  startsAt: discountCodes.startsAt,
  endsAt: discountCodes.endsAt,
  maxUses: discountCodes.maxUses,
  perCustomerMax: discountCodes.perCustomerMax,
  excludeSaleItems: discountCodes.excludeSaleItems,
  firstOrderOnly: discountCodes.firstOrderOnly,
  active: discountCodes.active,
  archivedAt: discountCodes.archivedAt,
  createdAt: discountCodes.createdAt,
  liveRedemptions,
};

export const listCodes = () =>
  db.select(codeColumns).from(discountCodes).orderBy(desc(discountCodes.createdAt));

export async function getCode(id: string) {
  const [row] = await db.select(codeColumns).from(discountCodes).where(eq(discountCodes.id, id));
  return row;
}

export async function insertCode(values: CodeValues) {
  const [row] = await db.insert(discountCodes).values(values).returning({ id: discountCodes.id });
  return row!.id;
}

export async function updateCode(id: string, values: CodeValues) {
  const rows = await db
    .update(discountCodes)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(discountCodes.id, id))
    .returning({ id: discountCodes.id });
  return rows.length > 0;
}

// Any redemption row at all, released or not: an order still points at the code.
export async function redemptionRows(codeId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(discountRedemptions)
    .where(eq(discountRedemptions.codeId, codeId));
  return row?.n ?? 0;
}

export async function archiveCode(id: string) {
  await db
    .update(discountCodes)
    .set({ archivedAt: new Date(), active: false, updatedAt: new Date() })
    .where(and(eq(discountCodes.id, id), isNull(discountCodes.archivedAt)));
}

export async function deleteCode(id: string) {
  await db.delete(discountCodes).where(eq(discountCodes.id, id));
}

// ----- tiers -----
export const listTiers = () => db.select().from(bulkTiers).orderBy(asc(bulkTiers.minCents));

type TierValues = {
  minCents: number;
  // Left out: an update keeps the stored map.
  minByCurrency?: Record<string, number> | undefined;
  percent: number;
  active: boolean;
};

export async function insertTier(values: TierValues) {
  const [row] = await db.insert(bulkTiers).values(values).returning();
  return row!;
}

export async function updateTier(id: string, values: TierValues) {
  const [row] = await db
    .update(bulkTiers)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(bulkTiers.id, id))
    .returning();
  return row;
}

export async function deleteTier(id: string) {
  const rows = await db
    .delete(bulkTiers)
    .where(eq(bulkTiers.id, id))
    .returning({ id: bulkTiers.id });
  return rows.length > 0;
}

// ----- gift -----
const giftColumns = {
  id: giftRules.id,
  thresholdCents: giftRules.thresholdCents,
  thresholdByCurrency: giftRules.thresholdByCurrency,
  variantId: giftRules.variantId,
  sku: productVariants.sku,
  productName: products.name,
  variantName: productVariants.name,
};

export async function activeGiftRule() {
  const [row] = await db
    .select(giftColumns)
    .from(giftRules)
    .innerJoin(productVariants, eq(productVariants.id, giftRules.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(giftRules.active, true));
  return row;
}

export async function findVariant(by: { id: string } | { sku: string }) {
  const [row] = await db
    .select({
      id: productVariants.id,
      status: productVariants.status,
      productStatus: products.status,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where('id' in by ? eq(productVariants.id, by.id) : eq(productVariants.sku, by.sku));
  return row;
}

// The currencies a variant has a price in (EUR always, via the trigger; others only if set).
export async function variantCurrencies(variantId: string): Promise<string[]> {
  const rows = await db
    .select({ currency: variantPrices.currency })
    .from(variantPrices)
    .where(eq(variantPrices.variantId, variantId));
  return rows.map((r) => r.currency);
}

// Updates the one active rule, or creates it. The partial unique index decides a race.
// `thresholdByCurrency` left out keeps the stored map (a new rule starts with none).
export async function setGiftRule(
  thresholdCents: number,
  variantId: string,
  thresholdByCurrency?: Record<string, number>,
) {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: giftRules.id })
      .from(giftRules)
      .where(eq(giftRules.active, true))
      .for('update');
    if (current) {
      await tx
        .update(giftRules)
        .set({ thresholdCents, variantId, thresholdByCurrency, updatedAt: new Date() })
        .where(eq(giftRules.id, current.id));
    } else {
      await tx
        .insert(giftRules)
        .values({ thresholdCents, variantId, thresholdByCurrency, active: true });
    }
  });
}

// Switching off removes the row: an off rule would still RESTRICT deleting its variant, and
// orders keep the gift as copied values, not a reference.
export async function clearGiftRule() {
  const rows = await db
    .delete(giftRules)
    .where(eq(giftRules.active, true))
    .returning({ id: giftRules.id });
  return rows.length;
}

// ----- flash sales -----
// Only name, window, status and the items' sale prices are written here. reference_cents and
// price_history belong to activation (service.syncFlashSales), never to an admin edit.
type Run = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>;

const saleItemColumns = {
  id: flashSaleItems.id,
  saleId: flashSaleItems.saleId,
  variantId: flashSaleItems.variantId,
  sku: productVariants.sku,
  productName: products.name,
  variantName: productVariants.name,
  regularCents: productVariants.priceCents,
  salePriceCents: flashSaleItems.salePriceCents,
  referenceCents: flashSaleItems.referenceCents,
};

export async function listSales() {
  const sales = await db.select().from(flashSales).orderBy(desc(flashSales.startsAt));
  return withItems(db, sales);
}

export async function getSale(run: Run, id: string) {
  const sales = await run.select().from(flashSales).where(eq(flashSales.id, id));
  return (await withItems(run, sales))[0];
}

async function withItems(run: Run, sales: (typeof flashSales.$inferSelect)[]) {
  if (sales.length === 0) return [];
  const items = await run
    .select(saleItemColumns)
    .from(flashSaleItems)
    .innerJoin(productVariants, eq(productVariants.id, flashSaleItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      inArray(
        flashSaleItems.saleId,
        sales.map((s) => s.id),
      ),
    )
    .orderBy(asc(productVariants.sku));
  return sales.map((s) => ({ ...s, items: items.filter((i) => i.saleId === s.id) }));
}

export async function findVariantsWithPrice(run: Run, ids: string[], skus: string[]) {
  const cond = [
    ids.length ? inArray(productVariants.id, ids) : undefined,
    skus.length ? inArray(productVariants.sku, skus) : undefined,
  ].filter((c) => c !== undefined);
  if (cond.length === 0) return [];
  return run
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      priceCents: productVariants.priceCents,
      status: productVariants.status,
      productStatus: products.status,
      productName: products.name,
      variantName: productVariants.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(or(...cond));
}

type SaleValues = { name: string; startsAt: Date; endsAt: Date };
type ItemValues = { variantId: string; salePriceCents: number }[];

export async function insertSale(values: SaleValues, items: ItemValues) {
  return db.transaction(async (tx) => {
    const [sale] = await tx.insert(flashSales).values(values).returning({ id: flashSales.id });
    await tx.insert(flashSaleItems).values(items.map((i) => ({ ...i, saleId: sale!.id })));
    return sale!.id;
  });
}

// Locks the row, so a sync that activates the sale at the same moment cannot interleave with the
// edit: whoever gets the lock second sees the other's status.
export async function lockSale(tx: Run, id: string) {
  const [row] = await tx.select().from(flashSales).where(eq(flashSales.id, id)).for('update');
  return row;
}

export async function replaceScheduledSale(
  id: string,
  values: SaleValues,
  items: ItemValues,
): Promise<'ok' | 'missing' | { status: string }> {
  return db.transaction(async (tx) => {
    const row = await lockSale(tx, id);
    if (!row) return 'missing' as const;
    if (row.status !== 'scheduled') return { status: row.status };
    await tx
      .update(flashSales)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(flashSales.id, id));
    await tx.delete(flashSaleItems).where(eq(flashSaleItems.saleId, id));
    await tx.insert(flashSaleItems).values(items.map((i) => ({ ...i, saleId: id })));
    return 'ok' as const;
  });
}

export type MoveEnd =
  | { kind: 'missing' }
  | { kind: 'status'; status: string }
  | { kind: 'refused'; message: string }
  | { kind: 'moved' };

// `decide` returns the new end, or the sentence explaining why it cannot move.
export async function moveActiveEnd(
  id: string,
  decide: (row: typeof flashSales.$inferSelect) => Date | { refuse: string },
): Promise<MoveEnd> {
  return db.transaction(async (tx): Promise<MoveEnd> => {
    const row = await lockSale(tx, id);
    if (!row) return { kind: 'missing' };
    if (row.status !== 'active') return { kind: 'status', status: row.status };
    const next = decide(row);
    if (!(next instanceof Date)) return { kind: 'refused', message: next.refuse };
    await tx
      .update(flashSales)
      .set({ endsAt: next, updatedAt: new Date() })
      .where(eq(flashSales.id, id));
    return { kind: 'moved' };
  });
}

export async function deleteScheduledSale(
  id: string,
): Promise<'ok' | 'missing' | { status: string }> {
  return db.transaction(async (tx) => {
    const row = await lockSale(tx, id);
    if (!row) return 'missing' as const;
    if (row.status !== 'scheduled') return { status: row.status };
    await tx.delete(flashSales).where(eq(flashSales.id, id));
    return 'ok' as const;
  });
}
