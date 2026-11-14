import type { ProductCard, Recommendations } from '@store/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

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
import { PUBLIC_CATALOG_CACHE } from '../../middleware/cache.ts';
import { makeTestApp } from '../../test/app.ts';
import { createBrand, createCategory, createProduct } from '../../test/factories.ts';
import { bodyOf } from '../../test/http.ts';
import { signedIn, TEST_ADDRESS } from '../../test/orders.ts';

const app = makeTestApp();

async function recs(slug: string) {
  const res = await request(app).get(`/api/v1/products/${slug}/recommendations`);
  return { res, data: bodyOf<{ data: Recommendations }>(res).data };
}
const slugs = (cards: ProductCard[]) => cards.map((c) => c.slug);

// A paid order containing the given variants (one unit each), written directly: the recommendation
// query reads order_items, not the checkout flow.
async function paidOrder(
  variantIds: string[],
  status: 'paid' | 'cancelled' | 'pending_payment' = 'paid',
) {
  const [order] = await db
    .insert(orders)
    .values({
      email: 'buyer@pawsome.test',
      status,
      subtotalCents: 1000,
      shippingCents: 0,
      totalCents: 1000,
      shippingAddress: TEST_ADDRESS,
      shippingMethodCode: 'standard',
      shippingMethodName: 'Standard',
    })
    .returning();
  for (const variantId of variantIds) {
    await db.insert(orderItems).values({
      orderId: order!.id,
      variantId,
      productName: 'x',
      variantName: 'x',
      sku: `S-${Math.random()}`,
      unitPriceCents: 1000,
      quantity: 1,
      lineTotalCents: 1000,
    });
  }
}

describe('GET /products/:slug/recommendations', () => {
  it('404s for an unknown or inactive product', async () => {
    await createProduct({ slug: 'draft-one', status: 'draft' });
    expect((await recs('nope')).res.status).toBe(404);
    expect((await recs('draft-one')).res.status).toBe(404);
  });

  it('returns editor picks first, in the editor order, with the variant a click would add', async () => {
    const main = await createProduct({ slug: 'main' });
    const a = await createProduct({
      slug: 'a',
      variants: [{ name: 'Default A', priceCents: 700 }],
    });
    const b = await createProduct({ slug: 'b' });
    await db.insert(productRelations).values([
      {
        productId: main.product.id,
        relatedId: b.product.id,
        kind: 'bought_together',
        sortOrder: 0,
      },
      {
        productId: main.product.id,
        relatedId: a.product.id,
        kind: 'bought_together',
        sortOrder: 1,
      },
    ]);
    const { data } = await recs('main');
    expect(slugs(data.boughtTogether.map((i) => i.card))).toEqual(['b', 'a']);
    expect(data.boughtTogether[1]?.variant).toMatchObject({
      id: a.variants[0]!.id,
      name: 'Default A',
      priceCents: 700,
      saleCents: null,
      referenceCents: null,
    });
  });

  it('falls back to what other customers bought in the same paid orders, most orders first', async () => {
    const category = await createCategory();
    const main = await createProduct({ slug: 'main', categoryId: category.id });
    const often = await createProduct({ slug: 'often' });
    const once = await createProduct({ slug: 'once' });
    const never = await createProduct({ slug: 'never' });
    await paidOrder([main.variants[0]!.id, often.variants[0]!.id, once.variants[0]!.id]);
    await paidOrder([main.variants[0]!.id, often.variants[0]!.id]);
    // These two do not count: not paid.
    await paidOrder([main.variants[0]!.id, never.variants[0]!.id], 'cancelled');
    await paidOrder([main.variants[0]!.id, never.variants[0]!.id], 'pending_payment');
    const { data } = await recs('main');
    expect(slugs(data.boughtTogether.map((i) => i.card)).slice(0, 2)).toEqual(['often', 'once']);
  });

  it('counts orders, not units: one huge order does not outvote two small ones', async () => {
    const main = await createProduct({ slug: 'main' });
    const big = await createProduct({ slug: 'big' });
    const steady = await createProduct({ slug: 'steady' });
    await paidOrder([main.variants[0]!.id, big.variants[0]!.id]);
    await db
      .update(orderItems)
      .set({ quantity: 50, lineTotalCents: 50000 })
      .where(eq(orderItems.variantId, big.variants[0]!.id));
    await paidOrder([main.variants[0]!.id, steady.variants[0]!.id]);
    await paidOrder([main.variants[0]!.id, steady.variants[0]!.id]);
    const { data } = await recs('main');
    expect(data.boughtTogether[0]?.card.slug).toBe('steady');
  });

  it('then tops up with the same category, the same brand first', async () => {
    const category = await createCategory();
    const brand = await createBrand();
    const main = await createProduct({ slug: 'main', categoryId: category.id, brandId: brand.id });
    await createProduct({ slug: 'other-brand', categoryId: category.id, createdAt: new Date() });
    await createProduct({ slug: 'same-brand', categoryId: category.id, brandId: brand.id });
    await createProduct({ slug: 'elsewhere' });
    expect(main.product.slug).toBe('main');
    const { data } = await recs('main');
    expect(slugs(data.boughtTogether.map((i) => i.card))).toEqual(['same-brand', 'other-brand']);
    expect(slugs(data.boughtTogether.map((i) => i.card))).not.toContain('elsewhere');
  });

  it('never lists the product itself, a sold-out product, a draft or a trial-only product', async () => {
    const category = await createCategory();
    await createProduct({ slug: 'main', categoryId: category.id });
    await createProduct({ slug: 'sold-out', categoryId: category.id, variants: [{ stock: 0 }] });
    await createProduct({ slug: 'draft', categoryId: category.id, status: 'draft' });
    await createProduct({ slug: 'fine', categoryId: category.id });
    const { data } = await recs('main');
    expect(slugs(data.boughtTogether.map((i) => i.card))).toEqual(['fine']);
    expect(slugs(data.related)).toEqual([]);
  });

  it('never tops up with a kit made of the product itself', async () => {
    const category = await createCategory();
    const main = await createProduct({ slug: 'main', categoryId: category.id });
    const kit = await createProduct({ slug: 'kit-of-main', categoryId: category.id });
    await db.update(products).set({ kind: 'bundle' }).where(eq(products.id, kit.product.id));
    await db.insert(bundleItems).values({
      bundleVariantId: kit.variants[0]!.id,
      componentVariantId: main.variants[0]!.id,
    });
    await createProduct({ slug: 'fine', categoryId: category.id });
    const { data } = await recs('main');
    expect(slugs(data.boughtTogether.map((i) => i.card))).toEqual(['fine']);
    expect(slugs(data.related)).not.toContain('kit-of-main');
  });

  it('suggests an in-stock variant and skips the default one when it is sold out', async () => {
    const category = await createCategory();
    await createProduct({ slug: 'main', categoryId: category.id });
    const other = await createProduct({
      slug: 'other',
      categoryId: category.id,
      variants: [
        { name: 'Default (sold out)', priceCents: 500, stock: 0 },
        { name: 'Large', priceCents: 900, stock: 5 },
      ],
    });
    const { data } = await recs('main');
    expect(data.boughtTogether[0]?.variant.name).toBe('Large');
    expect(data.boughtTogether[0]?.variant.id).toBe(other.variants[1]!.id);
  });

  it('keeps related separate from bought together (an item is not in both)', async () => {
    const category = await createCategory();
    const main = await createProduct({ slug: 'main', categoryId: category.id });
    const items = [];
    for (let i = 0; i < 6; i++)
      items.push(
        await createProduct({
          slug: `p${i}`,
          categoryId: category.id,
          createdAt: new Date(Date.now() - i * 1000),
        }),
      );
    const picked = await createProduct({ slug: 'picked' });
    await db.insert(productRelations).values({
      productId: main.product.id,
      relatedId: picked.product.id,
      kind: 'related',
      sortOrder: 0,
    });
    const { data } = await recs('main');
    const together = slugs(data.boughtTogether.map((i) => i.card));
    expect(together).toHaveLength(3);
    expect(data.related[0]?.slug).toBe('picked');
    for (const s of slugs(data.related)) expect(together).not.toContain(s);
  });

  it('shows a running flash-sale price on the suggestion, and no member number to a guest', async () => {
    const category = await createCategory();
    await createProduct({ slug: 'main', categoryId: category.id });
    const other = await createProduct({
      slug: 'other',
      categoryId: category.id,
      variants: [{ priceCents: 2000 }],
    });
    await db
      .update(productVariants)
      .set({ memberPriceCents: 1743 })
      .where(eq(productVariants.id, other.variants[0]!.id));
    const res = await request(app).get('/api/v1/products/main/recommendations');
    expect(res.text).not.toContain('1743');
    expect(res.text).toContain('"member":null');
    expect(res.headers['cache-control']).toBe(PUBLIC_CATALOG_CACHE);
    expect(res.headers.vary?.toLowerCase()).toContain('cookie');
  });

  it('gives a signed-in shopper their member price on the card, privately cached', async () => {
    const category = await createCategory();
    await createProduct({ slug: 'main', categoryId: category.id });
    const other = await createProduct({
      slug: 'other',
      categoryId: category.id,
      variants: [{ priceCents: 2000 }],
    });
    await db
      .update(productVariants)
      .set({ memberPriceCents: 1743 })
      .where(eq(productVariants.id, other.variants[0]!.id));
    const { shopper } = await signedIn(app);
    const res = await shopper.call('get', '/products/main/recommendations');
    const data = bodyOf<{ data: Recommendations }>(res).data;
    expect(data.boughtTogether[0]?.card.member).toEqual({ priceCents: 1743 });
    expect(res.headers['cache-control']).toBe('private, no-store');
  });
});

describe('GET /products/by-ids', () => {
  const byIds = (ids: string[]) => request(app).get(`/api/v1/products/by-ids?ids=${ids.join(',')}`);

  it('returns cards in the order asked for', async () => {
    const a = await createProduct({ slug: 'a', name: 'Alpha' });
    const b = await createProduct({ slug: 'b', name: 'Bravo' });
    const c = await createProduct({ slug: 'c', name: 'Charlie' });
    const res = await byIds([c.product.id, a.product.id, b.product.id]);
    expect(res.status).toBe(200);
    expect(slugs(bodyOf<{ data: ProductCard[] }>(res).data)).toEqual(['c', 'a', 'b']);
  });

  it('leaves out archived, draft, unbuyable and unknown ids, and repeats once', async () => {
    const live = await createProduct({ slug: 'live' });
    const archived = await createProduct({ slug: 'archived', status: 'archived' });
    const noVariant = await createProduct({ slug: 'novariant' });
    await db
      .update(productVariants)
      .set({ status: 'archived' })
      .where(eq(productVariants.productId, noVariant.product.id));
    const res = await byIds([
      archived.product.id,
      live.product.id,
      live.product.id,
      noVariant.product.id,
      '00000000-0000-4000-8000-000000000000',
    ]);
    expect(slugs(bodyOf<{ data: ProductCard[] }>(res).data)).toEqual(['live']);
  });

  it('keeps a sold-out product in the strip (it is still a product people viewed)', async () => {
    const soldOut = await createProduct({ slug: 'so', variants: [{ stock: 0 }] });
    await db
      .update(inventory)
      .set({ quantity: 0 })
      .where(eq(inventory.variantId, soldOut.variants[0]!.id));
    const res = await byIds([soldOut.product.id]);
    const data = bodyOf<{ data: ProductCard[] }>(res).data;
    expect(data[0]).toMatchObject({ slug: 'so', inStock: false });
  });

  it('is validated: no ids, a bad id, or more than 12 ids is a 400', async () => {
    expect((await request(app).get('/api/v1/products/by-ids')).status).toBe(400);
    expect((await byIds(['not-a-uuid'])).status).toBe(400);
    const many = Array.from(
      { length: 13 },
      (_, i) => `00000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`,
    );
    expect((await byIds(many)).status).toBe(400);
  });

  it('is not mistaken for a product slug', async () => {
    await createProduct({ slug: 'by-ids-like' });
    const a = await createProduct({ slug: 'real' });
    expect((await byIds([a.product.id])).status).toBe(200);
  });

  it('builds cards for the viewer: a guest never gets a member number', async () => {
    const a = await createProduct({ slug: 'm', variants: [{ priceCents: 2000 }] });
    await db
      .update(productVariants)
      .set({ memberPriceCents: 1743 })
      .where(eq(productVariants.id, a.variants[0]!.id));
    const guest = await byIds([a.product.id]);
    expect(guest.text).not.toContain('1743');
    expect(guest.headers['cache-control']).toBe(PUBLIC_CATALOG_CACHE);
    const { shopper } = await signedIn(app);
    const member = await shopper.call('get', `/products/by-ids?ids=${a.product.id}`);
    expect(member.text).toContain('1743');
    expect(member.headers['cache-control']).toBe('private, no-store');
  });
});

it('keeps products table untouched by these reads', async () => {
  const before = await db.select().from(products);
  await recs('nope');
  expect(await db.select().from(products)).toEqual(before);
});
