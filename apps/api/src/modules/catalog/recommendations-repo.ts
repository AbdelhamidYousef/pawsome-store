import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { stockQuantity, stockReserved } from '../../db/available.ts';
import { db } from '../../db/client.ts';
import {
  bundleItems,
  inventory,
  orderItems,
  orders,
  productRelations,
  productVariants,
  products,
} from '../../db/schema/index.ts';
import { currentStore } from '../i18n/context.ts';
import { hasPriceIn, priceIn } from '../i18n/prices.ts';

export interface ProductRef {
  id: string;
  categoryId: string;
  brandId: string | null;
}

export async function findActiveProductRef(slug: string): Promise<ProductRef | undefined> {
  const [row] = await db
    .select({ id: products.id, categoryId: products.categoryId, brandId: products.brandId })
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.status, 'active')));
  return row;
}

// The editor's picks, in the editor's order.
export async function editorialIds(
  productId: string,
  kind: 'bought_together' | 'related',
): Promise<string[]> {
  const rows = await db
    .select({ id: productRelations.relatedId })
    .from(productRelations)
    .where(and(eq(productRelations.productId, productId), eq(productRelations.kind, kind)))
    .orderBy(asc(productRelations.sortOrder), asc(productRelations.relatedId));
  return rows.map((r) => r.id);
}

// Products that share a paid order with this one, most orders first. "Paid" is the shared
// isPaidOrLater rule (the caller passes its statuses), so a cancelled or unpaid order never
// counts. Counting distinct orders (not units) stops one big order from outvoting many small ones.
export async function coPurchasedIds(
  productId: string,
  paidStatuses: readonly (typeof orders.$inferSelect.status)[],
  limit: number,
): Promise<string[]> {
  const mine = alias(orderItems, 'mine');
  const myVariant = alias(productVariants, 'my_variant');
  const theirs = alias(orderItems, 'theirs');
  const theirVariant = alias(productVariants, 'their_variant');
  const rows = await db
    .select({
      productId: theirVariant.productId,
      orders: sql<number>`count(distinct ${theirs.orderId})::int`,
    })
    .from(mine)
    .innerJoin(myVariant, eq(myVariant.id, mine.variantId))
    .innerJoin(orders, eq(orders.id, mine.orderId))
    .innerJoin(theirs, eq(theirs.orderId, mine.orderId))
    .innerJoin(theirVariant, eq(theirVariant.id, theirs.variantId))
    .where(
      and(
        eq(myVariant.productId, productId),
        ne(theirVariant.productId, productId),
        inArray(orders.status, [...paidStatuses]),
      ),
    )
    .groupBy(theirVariant.productId)
    .orderBy(desc(sql`count(distinct ${theirs.orderId})`), asc(theirVariant.productId))
    .limit(limit);
  return rows.map((r) => r.productId);
}

// Same category, the same brand first, then the newest: stable and explainable.
export async function sameCategoryIds(ref: ProductRef, limit: number): Promise<string[]> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.status, 'active'),
        ne(products.id, ref.id),
        eq(products.categoryId, ref.categoryId),
        // A kit made of the viewed product is not "something else you may like".
        sql`not exists (
          select 1 from ${bundleItems} bi
          join ${productVariants} bv on bv.id = bi.bundle_variant_id
          join ${productVariants} cv on cv.id = bi.component_variant_id
          where bv.product_id = ${products.id} and cv.product_id = ${ref.id}
        )`,
      ),
    )
    .orderBy(
      ref.brandId ? sql`(${products.brandId} = ${ref.brandId}) desc nulls last` : sql`1`,
      desc(products.createdAt),
      asc(products.id),
    )
    .limit(limit);
  return rows.map((r) => r.id);
}

export interface SellableVariantRow {
  productId: string;
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  currency: string;
}

// Per product, the variant a one-click add should use: the default one if it can be bought, else
// the cheapest in stock. Never a trial sample, never a sold-out or inactive variant.
export async function sellableVariants(
  productIds: string[],
): Promise<Map<string, SellableVariantRow>> {
  if (productIds.length === 0) return new Map();
  const rows = await db
    .select({
      productId: productVariants.productId,
      id: productVariants.id,
      sku: productVariants.sku,
      name: productVariants.name,
      priceCents: priceIn(),
      currency: sql<string>`${currentStore().currency}::char(3)`,
      isDefault: productVariants.isDefault,
    })
    .from(productVariants)
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(
      and(
        inArray(productVariants.productId, productIds),
        eq(productVariants.status, 'active'),
        eq(productVariants.isTrial, false),
        hasPriceIn(),
        sql`coalesce(${stockQuantity(productVariants.id)} - ${stockReserved(productVariants.id)}, 0) > 0`,
      ),
    )
    .orderBy(
      asc(productVariants.productId),
      desc(productVariants.isDefault),
      asc(priceIn()),
      asc(productVariants.id),
    );
  const byProduct = new Map<string, SellableVariantRow>();
  for (const row of rows) {
    if (byProduct.has(row.productId)) continue;
    byProduct.set(row.productId, {
      productId: row.productId,
      id: row.id,
      sku: row.sku,
      name: row.name,
      priceCents: row.priceCents,
      currency: row.currency,
    });
  }
  return byProduct;
}
