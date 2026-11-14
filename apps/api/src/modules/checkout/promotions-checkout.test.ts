import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../../db/client.ts';
import {
  bulkTiers,
  discountCodes,
  discountRedemptions,
  giftRules,
  inventory,
  orderItems,
  orderPromotions,
  orders,
  payments,
} from '../../db/schema/index.ts';
import { makeTestApp } from '../../test/app.ts';
import { createProduct, createShippingMethods } from '../../test/factories.ts';
import { FakeStripe } from '../../test/fake-stripe.ts';
import { errorOf } from '../../test/http.ts';
import { makeShopper } from '../../test/shopper.ts';

import { cancelPendingOrder } from './orders.ts';

let stripe: FakeStripe;
let app: ReturnType<typeof makeTestApp>;
beforeEach(async () => {
  stripe = new FakeStripe();
  app = makeTestApp({ payments: stripe });
  await createShippingMethods();
});

const body = (email = 'ada@pawsome.test') => ({
  email,
  shippingAddress: {
    fullName: 'Ada Lovelace',
    line1: '1 Bone Street',
    city: 'Riga',
    postalCode: 'LV-1010',
    country: 'LV',
  },
  shippingMethodCode: 'standard',
});

async function variant(priceCents: number, stock = 50) {
  const { variants } = await createProduct({
    variants: [{ priceCents, weightGrams: 500, stock }],
  });
  return variants[0]!.id;
}

async function onlyOrder() {
  const [order] = await db.select().from(orders);
  return order!;
}

describe('checkout through the promotions engine', () => {
  it('stores the engine total, line discounts and a snapshot, and charges that amount', async () => {
    await db.insert(discountCodes).values({ code: 'PAWS10', kind: 'percent', value: 10 });
    const a = await variant(2000);
    const b = await variant(1000);
    const shop = makeShopper(app);
    await shop.addToCart(a);
    await shop.addToCart(b);
    await shop.call('post', '/cart/code', { code: 'PAWS10' });

    const res = await shop.call('post', '/checkout', body());
    expect(res.status).toBe(200);
    const order = await onlyOrder();
    // 30.00 - 10% = 27.00; shipping 4.90 + 1 kg x 1.00 (27.00 is under the 49.00 threshold)
    expect(order).toMatchObject({
      subtotalCents: 3000,
      discountCents: 300,
      shippingCents: 590,
      totalCents: 3290,
    });
    const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(lines.reduce((n, l) => n + l.discountCents, 0)).toBe(300);
    const snapshot = await db
      .select()
      .from(orderPromotions)
      .where(eq(orderPromotions.orderId, order.id));
    expect(snapshot).toMatchObject([{ type: 'code', label: 'Code PAWS10', cents: 300 }]);
    const created = stripe.calls.filter((c) => c.method === 'create').at(-1);
    expect((created?.args[0] as { amountCents: number }).amountCents).toBe(3290);
  });

  it('keeps old orders unchanged when the code is edited later', async () => {
    const [code] = await db
      .insert(discountCodes)
      .values({ code: 'PAWS10', kind: 'percent', value: 10 })
      .returning();
    const shop = makeShopper(app);
    await shop.addToCart(await variant(3000));
    await shop.call('post', '/cart/code', { code: 'PAWS10' });
    await shop.call('post', '/checkout', body());

    await db.update(discountCodes).set({ value: 50 }).where(eq(discountCodes.id, code!.id));
    const order = await onlyOrder();
    expect(order.discountCents).toBe(300);
    const [snap] = await db.select().from(orderPromotions);
    expect(snap?.cents).toBe(300);
  });

  it('applies free shipping from the threshold after discounts, not before', async () => {
    await db.insert(bulkTiers).values({ minCents: 5000, percent: 10 });
    const shop = makeShopper(app);
    // 50.00 - 10% = 45.00, under the 49.00 free-delivery threshold
    await shop.addToCart(await variant(5000));
    await shop.call('post', '/checkout', body());
    const order = await onlyOrder();
    expect(order.discountCents).toBe(500);
    expect(order.shippingCents).toBe(590);
  });

  it('adds the free gift as a zero-priced line and reserves one unit of it', async () => {
    const gift = await variant(549, 5);
    await db.insert(giftRules).values({ thresholdCents: 4000, variantId: gift });
    const shop = makeShopper(app);
    await shop.addToCart(await variant(4500));
    await shop.call('post', '/checkout', body());
    const order = await onlyOrder();
    const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(lines.find((l) => l.variantId === gift)).toMatchObject({
      unitPriceCents: 0,
      quantity: 1,
      lineTotalCents: 0,
    });
    const [stock] = await db.select().from(inventory).where(eq(inventory.variantId, gift));
    expect(stock?.reserved).toBe(1);
    // 45.00 is under the 49.00 free-delivery threshold: 4.90 + 1 kg x 1.00
    expect(order.totalCents).toBe(5090);
  });

  it('gives no gift in a store whose currency has no price for it, and prices it where it has one', async () => {
    // The gift variant is sold in EUR only; the item bought has both prices.
    const gift = await variant(549, 5);
    await db
      .insert(giftRules)
      .values({ thresholdCents: 4000, thresholdByCurrency: { GBP: 3500 }, variantId: gift });
    const { variants } = await createProduct({
      variants: [{ priceCents: 4500, gbpCents: 4000, weightGrams: 500, stock: 10 }],
    });
    const uk = makeShopper(app, undefined, 'uk-en');
    const cart = (await uk.addToCart(variants[0]!.id)).body as {
      data: { pricing: { gift: unknown; progress: { gift: unknown } } };
    };
    expect(cart.data.pricing.gift).toBeNull();
    expect(cart.data.pricing.progress.gift).toBeNull();
    const res = await uk.call('post', '/checkout', {
      ...body(),
      shippingAddress: { ...body().shippingAddress, country: 'GB', postalCode: 'SW1A 1AA' },
    });
    expect(res.status).toBe(200);
    const order = await onlyOrder();
    const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(lines.map((l) => l.variantId)).toEqual([variants[0]!.id]);
    expect(await db.select().from(orderPromotions)).toEqual([]);
    const [stock] = await db.select().from(inventory).where(eq(inventory.variantId, gift));
    expect(stock?.reserved).toBe(0);
  });

  it('refuses a guest whose email already used a once-per-customer code', async () => {
    const [code] = await db
      .insert(discountCodes)
      .values({ code: 'ONEEACH', kind: 'fixed', value: 500, perCustomerMax: 1 })
      .returning();
    const first = makeShopper(app);
    await first.addToCart(await variant(3000));
    await first.call('post', '/cart/code', { code: 'ONEEACH' });
    expect((await first.call('post', '/checkout', body('sam@pawsome.test'))).status).toBe(200);
    const used = await db.select().from(discountRedemptions);
    expect(used).toMatchObject([{ codeId: code!.id, customerKey: 'sam@pawsome.test' }]);

    const again = makeShopper(app);
    await again.addToCart(await variant(3000));
    await again.call('post', '/cart/code', { code: 'ONEEACH' });
    const res = await again.call('post', '/checkout', body('SAM@pawsome.test'));
    expect(res.status).toBe(400);
    expect(errorOf(res).message).toBe("You've already used this code");
  });

  it('lets the same pending order be placed again without counting its own redemption', async () => {
    await db.insert(discountCodes).values({ code: 'ONCE', kind: 'fixed', value: 500, maxUses: 1 });
    const shop = makeShopper(app);
    await shop.addToCart(await variant(3000));
    await shop.call('post', '/cart/code', { code: 'ONCE' });
    expect((await shop.call('post', '/checkout', body())).status).toBe(200);
    expect((await shop.call('post', '/checkout', body())).status).toBe(200);
    expect(await db.select().from(discountRedemptions)).toHaveLength(1);
  });

  it('gives a capped code to exactly one of two racing checkouts', async () => {
    await db.insert(discountCodes).values({ code: 'LAST', kind: 'fixed', value: 500, maxUses: 1 });
    const shoppers = [makeShopper(app), makeShopper(app)];
    for (const s of shoppers) {
      await s.addToCart(await variant(3000));
      await s.call('post', '/cart/code', { code: 'LAST' });
    }
    const results = await Promise.all(
      shoppers.map((s, i) => s.call('post', '/checkout', body(`racer${i}@pawsome.test`))),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(await db.select().from(discountRedemptions)).toHaveLength(1);
  });

  it('releases the code when an unpaid order is cancelled, and keeps it once paid', async () => {
    await db.insert(discountCodes).values({ code: 'PAWS10', kind: 'percent', value: 10 });
    const placeWithCode = async (email: string) => {
      const shop = makeShopper(app);
      await shop.addToCart(await variant(3000));
      await shop.call('post', '/cart/code', { code: 'PAWS10' });
      await shop.call('post', '/checkout', body(email));
      const [order] = await db.select().from(orders).where(eq(orders.email, email));
      return order!;
    };

    const unpaid = await placeWithCode('unpaid@pawsome.test');
    await db.transaction((tx) => cancelPendingOrder(tx, unpaid.id, { actor: 'test', note: 'x' }));
    const [released] = await db
      .select()
      .from(discountRedemptions)
      .where(eq(discountRedemptions.orderId, unpaid.id));
    expect(released?.releasedAt).not.toBeNull();

    const paid = await placeWithCode('paid@pawsome.test');
    await db.update(payments).set({ status: 'succeeded' }).where(eq(payments.orderId, paid.id));
    await db.transaction((tx) => cancelPendingOrder(tx, paid.id, { actor: 'test', note: 'x' }));
    const [kept] = await db
      .select()
      .from(discountRedemptions)
      .where(eq(discountRedemptions.orderId, paid.id));
    expect(kept?.releasedAt).toBeNull();
  });
});
