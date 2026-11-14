import { eq } from 'drizzle-orm';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../../db/client.ts';
import {
  carts,
  inventory,
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  productVariants,
  shippingMethods,
} from '../../db/schema/index.ts';
import { createUnconfiguredGateway } from '../../lib/stripe.ts';
import { makeTestApp } from '../../test/app.ts';
import { createProduct, createShippingMethods, createUser } from '../../test/factories.ts';
import { FakeStripe } from '../../test/fake-stripe.ts';
import { bodyOf, errorOf, setCookieLine } from '../../test/http.ts';
import { makeShopper } from '../../test/shopper.ts';
import { createSession } from '../auth/sessions.ts';

let stripe: FakeStripe;
let app: ReturnType<typeof makeTestApp>;
beforeEach(async () => {
  stripe = new FakeStripe();
  app = makeTestApp({ payments: stripe });
  await createShippingMethods();
});

const address = {
  fullName: 'Ada Lovelace',
  line1: '1 Bone Street',
  city: 'Riga',
  postalCode: 'LV-1010',
  country: 'LV',
};
const checkoutBody = (extra: object = {}) => ({
  email: 'ada@pawsome.test',
  shippingAddress: address,
  shippingMethodCode: 'standard',
  ...extra,
});

interface Placed {
  data: {
    orderNumber: string;
    clientSecret: string;
    totals: Record<string, number | string>;
  };
}
const placed = (res: { body: unknown }) => (res.body as Placed).data;

const allOrders = () => db.select().from(orders);
const stockOf = async (variantId: string) => {
  const [row] = await db.select().from(inventory).where(eq(inventory.variantId, variantId));
  return { quantity: row!.quantity, reserved: row!.reserved };
};

describe('POST /checkout', () => {
  it('creates a pending order, reserves stock and returns a client secret with server totals', async () => {
    const { variants } = await createProduct({
      name: 'Tug Rope',
      variants: [{ priceCents: 1250, weightGrams: 600, stock: 10 }],
    });
    const shopper = makeShopper(app);
    await shopper.addToCart(variants[0]!.id, 2);

    const res = await shopper.call('post', '/checkout', checkoutBody());
    expect(res.status).toBe(200);
    const body = placed(res);
    // 2 x 12.50 = 25.00; 1200 g = 2 started kg => 490 + 2 x 100 = 690; below the 49.00 threshold.
    expect(body.totals).toEqual({
      currency: 'EUR',
      subtotalCents: 2500,
      shippingCents: 690,
      discountCents: 0,
      donationCents: 0,
      taxCents: 0,
      totalCents: 3190,
    });
    expect(body.orderNumber).toMatch(/^PW-\d{4}-\d{6}$/);
    expect(body.clientSecret).toContain('_secret_');

    const [order] = await allOrders();
    expect(order).toMatchObject({
      number: body.orderNumber,
      status: 'pending_payment',
      email: 'ada@pawsome.test',
      userId: null,
      totalCents: 3190,
      shippingMethodCode: 'standard',
      shippingMethodName: 'Standard',
      shippingAddress: expect.objectContaining({ postalCode: 'LV-1010', country: 'LV' }) as object,
    });
    expect(order?.placedAt).toBeNull();

    const items = await db.select().from(orderItems);
    expect(items).toMatchObject([
      {
        orderId: order!.id,
        variantId: variants[0]!.id,
        productName: 'Tug Rope',
        unitPriceCents: 1250,
        quantity: 2,
        lineTotalCents: 2500,
      },
    ]);

    // Stock is held, not removed: the units leave the shelf only when the payment is confirmed.
    expect(await stockOf(variants[0]!.id)).toEqual({ quantity: 10, reserved: 2 });

    const [payment] = await db.select().from(payments);
    expect(payment).toMatchObject({
      orderId: order!.id,
      status: 'requires_payment',
      amountCents: 3190,
      providerPaymentIntentId: 'pi_fake_1',
    });
    expect(stripe.callsTo('create')).toHaveLength(1);
    expect(stripe.callsTo('create')[0]?.args[0]).toMatchObject({
      amountCents: 3190,
      currency: 'EUR',
      orderId: order!.id,
      orderNumber: body.orderNumber,
      idempotencyKey: `order:${order!.id}`,
    });

    const [history] = await db.select().from(orderStatusHistory);
    expect(history).toMatchObject({ fromStatus: null, toStatus: 'pending_payment' });
    // The cart survives: only a confirmed payment converts it.
    expect((await db.select().from(carts))[0]?.status).toBe('active');
    expect(setCookieLine(res, 'last_order')).toContain('HttpOnly');
  });

  it('applies free shipping from the server rule', async () => {
    const { variants } = await createProduct({ variants: [{ priceCents: 3000 }] });
    const shopper = makeShopper(app);
    await shopper.addToCart(variants[0]!.id, 2);
    const body = placed(await shopper.call('post', '/checkout', checkoutBody()));
    expect(body.totals).toMatchObject({ subtotalCents: 6000, shippingCents: 0, totalCents: 6000 });
  });

  it('ignores any amount the client sends and never trusts a client price', async () => {
    const { variants } = await createProduct({ variants: [{ priceCents: 1000 }] });
    const shopper = makeShopper(app);
    await shopper.addToCart(variants[0]!.id, 1);
    const res = await shopper.call(
      'post',
      '/checkout',
      checkoutBody({ totalCents: 1, amount: 1, subtotalCents: 1, items: [{ priceCents: 1 }] }),
    );
    expect(placed(res).totals).toMatchObject({ subtotalCents: 1000, totalCents: 1590 });
    expect(stripe.callsTo('create')[0]?.args[0]).toMatchObject({ amountCents: 1590 });
  });

  it('uses the account email and owner for a signed-in user', async () => {
    const user = await createUser({ email: 'member@pawsome.test' });
    const { token } = await createSession(user.id);
    const { variants } = await createProduct();
    const member = makeShopper(app, token);
    await member.addToCart(variants[0]!.id);
    await member.call('post', '/checkout', checkoutBody({ email: 'other@pawsome.test' }));
    expect(await allOrders()).toMatchObject([{ userId: user.id, email: 'member@pawsome.test' }]);
  });

  it('keeps billing and notes when given, and null billing means "same as shipping"', async () => {
    const { variants } = await createProduct();
    const shopper = makeShopper(app);
    await shopper.addToCart(variants[0]!.id);
    await shopper.call('post', '/checkout', checkoutBody({ notes: 'Ring twice' }));
    expect(await allOrders()).toMatchObject([{ billingAddress: null, notes: 'Ring twice' }]);
  });

  describe('validation', () => {
    it('rejects an empty cart', async () => {
      const shopper = makeShopper(app);
      const res = await shopper.call('post', '/checkout', checkoutBody());
      expect(res.status).toBe(400);
      expect(errorOf(res).code).toBe('VALIDATION_ERROR');
      expect(await allOrders()).toHaveLength(0);
      expect(stripe.calls).toHaveLength(0);
    });

    it.each([
      ['an unknown shipping method', { shippingMethodCode: 'teleport' }],
      ['an unsupported country', { shippingAddress: { ...address, country: 'US' } }],
      ['a blank postal code', { shippingAddress: { ...address, postalCode: ' ' } }],
      ['a bad email', { email: 'nope' }],
    ])('rejects %s and changes nothing', async (_name, extra) => {
      const { variants } = await createProduct({ variants: [{ stock: 5 }] });
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id);
      const res = await shopper.call('post', '/checkout', checkoutBody(extra));
      expect(res.status).toBe(400);
      expect(await allOrders()).toHaveLength(0);
      expect(await stockOf(variants[0]!.id)).toEqual({ quantity: 5, reserved: 0 });
      expect(stripe.calls).toHaveLength(0);
    });

    it('refuses a retired shipping method', async () => {
      // 'standard' exists but is switched off.
      await db
        .update(shippingMethods)
        .set({ isActive: false })
        .where(eq(shippingMethods.code, 'standard'));
      const { variants } = await createProduct();
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id);
      expect((await shopper.call('post', '/checkout', checkoutBody())).status).toBe(400);
    });

    it('needs the Origin header like every write', async () => {
      const res = await request(app).post('/api/v1/checkout').send(checkoutBody());
      expect(res.status).toBe(403);
    });
  });

  describe('when the cart changed since the shopper looked', () => {
    it('answers 409 CART_CHANGED for a sold-out line and reserves nothing', async () => {
      const { variants } = await createProduct({ variants: [{ stock: 5 }, { stock: 5 }] });
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id, 1);
      await shopper.addToCart(variants[1]!.id, 2);
      await db
        .update(inventory)
        .set({ quantity: 0 })
        .where(eq(inventory.variantId, variants[1]!.id));

      const res = await shopper.call('post', '/checkout', checkoutBody());
      expect(res.status).toBe(409);
      expect(errorOf(res).code).toBe('CART_CHANGED');
      expect(JSON.stringify(errorOf(res).details)).toContain('OUT_OF_STOCK');
      expect(await allOrders()).toHaveLength(0);
      expect(await stockOf(variants[0]!.id)).toEqual({ quantity: 5, reserved: 0 });
      expect(stripe.calls).toHaveLength(0);
    });

    it('answers 409 when stock fell below the quantity (it would silently buy fewer)', async () => {
      const { variants } = await createProduct({ variants: [{ stock: 10 }] });
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id, 5);
      await db
        .update(inventory)
        .set({ quantity: 2 })
        .where(eq(inventory.variantId, variants[0]!.id));
      const res = await shopper.call('post', '/checkout', checkoutBody());
      expect(errorOf(res).code).toBe('CART_CHANGED');
      expect(JSON.stringify(errorOf(res).details)).toContain('QTY_REDUCED');
    });

    it('answers 409 when the price moved, then succeeds at the new price after a cart reload', async () => {
      const { variants } = await createProduct({ variants: [{ priceCents: 1000 }] });
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id, 1);
      await db
        .update(productVariants)
        .set({ priceCents: 1200 })
        .where(eq(productVariants.id, variants[0]!.id));

      const refused = await shopper.call('post', '/checkout', checkoutBody());
      expect(refused.status).toBe(409);
      expect(JSON.stringify(errorOf(refused).details)).toContain('PRICE_CHANGED');
      expect(await allOrders()).toHaveLength(0);

      // The rollback undid the "seen" marker, so the reload shows the warning once...
      const cart = await shopper.call('get', '/cart');
      expect(JSON.stringify(bodyOf(cart))).toContain('PRICE_CHANGED');
      // ...and the retry charges the new price.
      const ok = await shopper.call('post', '/checkout', checkoutBody());
      expect(ok.status).toBe(200);
      expect(placed(ok).totals).toMatchObject({ subtotalCents: 1200 });
    });
  });

  describe('repeating the checkout on the same cart', () => {
    it('updates the pending order instead of creating another', async () => {
      const { variants } = await createProduct({ variants: [{ priceCents: 1000, stock: 10 }] });
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id, 2);
      const first = placed(await shopper.call('post', '/checkout', checkoutBody()));
      const second = placed(await shopper.call('post', '/checkout', checkoutBody()));

      expect(second.orderNumber).toBe(first.orderNumber);
      expect(second.clientSecret).toBe(first.clientSecret);
      expect(await allOrders()).toHaveLength(1);
      expect(await db.select().from(orderItems)).toHaveLength(1);
      // Reservations were released and re-taken, not doubled.
      expect(await stockOf(variants[0]!.id)).toEqual({ quantity: 10, reserved: 2 });
      expect(stripe.callsTo('create')).toHaveLength(1);
      expect(stripe.callsTo('update')).toHaveLength(0);
    });

    it('re-prices, swaps the items, re-reserves and updates the intent amount', async () => {
      const { variants } = await createProduct({ variants: [{ priceCents: 1000, stock: 10 }] });
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id, 2);
      await shopper.call('post', '/checkout', checkoutBody());

      await shopper.call('post', '/cart/items', { variantId: variants[0]!.id, quantity: 1 });
      const res = await shopper.call(
        'post',
        '/checkout',
        checkoutBody({ shippingMethodCode: 'express' }),
      );
      // 3 x 10.00 + express (990 + 1 kg... 600 g = 1 started kg x 200) = 3000 + 1190.
      expect(placed(res).totals).toMatchObject({
        subtotalCents: 3000,
        shippingCents: 1190,
        totalCents: 4190,
      });

      expect(await allOrders()).toHaveLength(1);
      expect(await db.select().from(orderItems)).toMatchObject([{ quantity: 3 }]);
      expect(await stockOf(variants[0]!.id)).toEqual({ quantity: 10, reserved: 3 });
      expect(stripe.callsTo('update')[0]?.args).toEqual(['pi_fake_1', 4190]);
      expect((await db.select().from(payments))[0]?.amountCents).toBe(4190);
      expect((await allOrders())[0]).toMatchObject({
        shippingMethodCode: 'express',
        totalCents: 4190,
      });
    });

    it('lets a shopper who holds the last unit check out again (own reservation is released first)', async () => {
      const { variants } = await createProduct({ variants: [{ stock: 1 }] });
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id, 1);
      expect((await shopper.call('post', '/checkout', checkoutBody())).status).toBe(200);
      expect((await shopper.call('post', '/checkout', checkoutBody())).status).toBe(200);
      expect(await stockOf(variants[0]!.id)).toEqual({ quantity: 1, reserved: 1 });
    });

    it('refuses with 409 while a payment is already being processed', async () => {
      const { variants } = await createProduct();
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id);
      await shopper.call('post', '/checkout', checkoutBody());
      await db.update(payments).set({ status: 'processing' });
      const res = await shopper.call('post', '/checkout', checkoutBody());
      expect(res.status).toBe(409);
      expect(errorOf(res).code).toBe('CONFLICT');
    });

    it('refuses with 409 if Stripe says the intent already succeeded (webhook still pending)', async () => {
      const { variants } = await createProduct();
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id);
      await shopper.call('post', '/checkout', checkoutBody());
      stripe.setStatus('pi_fake_1', 'succeeded');
      const res = await shopper.call('post', '/checkout', checkoutBody());
      expect(res.status).toBe(409);
      expect(await allOrders()).toHaveLength(1);
    });

    it.each(['processing', 'requires_capture', 'succeeded'])(
      'leaves the pending order untouched when another tab confirmed the payment (%s)',
      async (status) => {
        const { variants } = await createProduct({ variants: [{ priceCents: 1000, stock: 10 }] });
        const shopper = makeShopper(app);
        await shopper.addToCart(variants[0]!.id, 1);
        await shopper.call('post', '/checkout', checkoutBody());
        const before = (await allOrders())[0]!;
        // Tab A confirmed with Stripe; the webhook has not arrived. Tab B grows the cart and pays.
        stripe.setStatus('pi_fake_1', status);
        await shopper.call('post', '/cart/items', { variantId: variants[0]!.id, quantity: 2 });
        const res = await shopper.call(
          'post',
          '/checkout',
          checkoutBody({ shippingMethodCode: 'express' }),
        );
        expect(res.status).toBe(409);
        expect(errorOf(res).code).toBe('CONFLICT');
        // Nothing was re-totalled, so the late webhook still matches the order.
        const after = (await allOrders())[0]!;
        expect(after.totalCents).toBe(before.totalCents);
        expect(after.shippingMethodCode).toBe('standard');
        expect(await db.select().from(orderItems)).toMatchObject([{ quantity: 1 }]);
        expect(await stockOf(variants[0]!.id)).toEqual({ quantity: 10, reserved: 1 });
        expect(stripe.callsTo('update')).toHaveLength(0);
      },
    );

    it('still re-prices while the shopper is in a 3-D Secure challenge (requires_action)', async () => {
      const { variants } = await createProduct({ variants: [{ priceCents: 1000, stock: 10 }] });
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id, 1);
      await shopper.call('post', '/checkout', checkoutBody());
      stripe.setStatus('pi_fake_1', 'requires_action');
      await shopper.call('post', '/cart/items', { variantId: variants[0]!.id, quantity: 2 });
      const res = await shopper.call('post', '/checkout', checkoutBody());
      expect(res.status).toBe(200);
      expect(stripe.intents.get('pi_fake_1')?.amountCents).toBe((await allOrders())[0]!.totalCents);
    });
  });

  describe('when Stripe fails', () => {
    it('cancels the new order, releases the stock and answers 502; a retry then works', async () => {
      const { variants } = await createProduct({ variants: [{ stock: 4 }] });
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id, 2);

      stripe.failNext('create');
      const res = await shopper.call('post', '/checkout', checkoutBody());
      expect(res.status).toBe(502);
      expect(errorOf(res).code).toBe('PAYMENT_PROVIDER_ERROR');

      expect(await allOrders()).toMatchObject([{ status: 'cancelled' }]);
      expect(await stockOf(variants[0]!.id)).toEqual({ quantity: 4, reserved: 0 });
      expect(await db.select().from(payments)).toMatchObject([
        { status: 'failed', providerPaymentIntentId: null },
      ]);
      const history = await db.select().from(orderStatusHistory);
      expect(history.map((h) => h.toStatus).sort()).toEqual(['cancelled', 'pending_payment']);
      // The cart is untouched, so the shopper just presses pay again.
      expect((await db.select().from(carts))[0]?.status).toBe('active');

      const retry = await shopper.call('post', '/checkout', checkoutBody());
      expect(retry.status).toBe(200);
      const all = await allOrders();
      expect(all).toHaveLength(2);
      expect(all.filter((o) => o.status === 'pending_payment')).toHaveLength(1);
      expect(await stockOf(variants[0]!.id)).toEqual({ quantity: 4, reserved: 2 });
    });

    it('keeps the order (and its intent) when only the amount update fails, and retries cleanly', async () => {
      const { variants } = await createProduct({ variants: [{ priceCents: 1000, stock: 10 }] });
      const shopper = makeShopper(app);
      await shopper.addToCart(variants[0]!.id, 1);
      await shopper.call('post', '/checkout', checkoutBody());
      await shopper.call('post', '/cart/items', { variantId: variants[0]!.id, quantity: 1 });

      stripe.failNext('update');
      const res = await shopper.call('post', '/checkout', checkoutBody());
      expect(res.status).toBe(502);
      // The order is still payable on its intent; payments.amount still names what the intent charges.
      expect(await allOrders()).toMatchObject([{ status: 'pending_payment', totalCents: 2590 }]);
      expect((await db.select().from(payments))[0]?.amountCents).toBe(1590);

      const retry = await shopper.call('post', '/checkout', checkoutBody());
      expect(retry.status).toBe(200);
      expect((await db.select().from(payments))[0]?.amountCents).toBe(2590);
    });

    it('answers 502 and keeps no order when payments are not configured at all', async () => {
      const bare = makeTestApp({ payments: createUnconfiguredGateway() });
      const { variants } = await createProduct();
      const shopper = makeShopper(bare);
      await shopper.addToCart(variants[0]!.id);
      const res = await shopper.call('post', '/checkout', checkoutBody());
      expect(res.status).toBe(502);
      expect(await allOrders()).toMatchObject([{ status: 'cancelled' }]);
    });
  });
});
