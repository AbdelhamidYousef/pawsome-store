import { pino } from 'pino';
import { beforeEach, describe, expect, it } from 'vitest';

import { MemoryTransport } from '../../../lib/mailer.ts';
import { makeTestApp } from '../../../test/app.ts';
import { createShippingMethods, createUser } from '../../../test/factories.ts';
import { FakeStripe } from '../../../test/fake-stripe.ts';
import { bodyOf, errorOf } from '../../../test/http.ts';
import { orderByNumber, placeOrder, signedIn, simulate, stockOf } from '../../../test/orders.ts';
import type { Shopper } from '../../../test/shopper.ts';
import { createOutbox } from '../../mail/outbox.ts';

const fake = new FakeStripe();
const transport = new MemoryTransport();
const outbox = createOutbox({ transport, log: pino({ level: 'silent' }) });
const app = makeTestApp({ payments: fake, outbox });

let admin: { shopper: Shopper };
beforeEach(async () => {
  admin = await signedIn(app, 'admin', 'boss@pawsome.test');
  await createShippingMethods();
  transport.sent.length = 0;
});

interface Detail {
  data: {
    order: { number: string; status: string };
    payment: { status: string; providerPaymentIntentId: string } | null;
    customer: { email: string } | null;
    history: { toStatus: string; actor: string; note: string | null }[];
    promotions: { type: string; label: string; cents: number }[];
    allowedNext: string[];
  };
}
const move = (number: string, body: object) =>
  admin.shopper.call('post', `/admin/orders/${number}/transition`, body);

describe('GET /admin/orders', () => {
  it('lists orders of every status, newest first, paginated, with units and payment status', async () => {
    const a = await placeOrder(app, { quantity: 3, email: 'ada@pawsome.test' });
    const b = await placeOrder(app, { email: 'grace@pawsome.test' });
    await simulate(app, a.number);

    const res = await admin.shopper.call('get', '/admin/orders?limit=1');
    const body = bodyOf<{
      data: { number: string; itemCount: number; paymentStatus: string }[];
      meta: object;
    }>(res);
    expect(body.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
    expect(body.data[0]?.number).toBe(b.number); // newest first, and unpaid ones are visible to admins
    const second = bodyOf<{ data: { number: string; itemCount: number; paymentStatus: string }[] }>(
      await admin.shopper.call('get', '/admin/orders?limit=1&page=2'),
    );
    expect(second.data[0]).toMatchObject({
      number: a.number,
      itemCount: 3,
      paymentStatus: 'succeeded',
    });
  });

  it('filters by status and searches by number or email, case-insensitively', async () => {
    const a = await placeOrder(app, { email: 'Ada@Pawsome.test' });
    const b = await placeOrder(app, { email: 'grace@pawsome.test' });
    await simulate(app, a.number);
    const numbers = async (qs: string) =>
      bodyOf<{ data: { number: string }[] }>(
        await admin.shopper.call('get', `/admin/orders?${qs}`),
      ).data.map((o) => o.number);

    expect(await numbers('status=paid')).toEqual([a.number]);
    expect(await numbers('status=pending_payment')).toEqual([b.number]);
    expect(await numbers('q=GRACE')).toEqual([b.number]);
    expect(await numbers(`q=${a.number.slice(-6)}`)).toEqual([a.number]);
    expect(await numbers('q=nobody')).toEqual([]);
    expect((await admin.shopper.call('get', '/admin/orders?status=bogus')).status).toBe(400);
    expect((await admin.shopper.call('get', '/admin/orders?limit=1000')).status).toBe(400);
  });
});

describe('GET /admin/orders/:number', () => {
  it('returns the order with payment, full history, the customer and the allowed next moves', async () => {
    const buyer = await signedIn(app, 'customer', 'buyer@pawsome.test');
    const { number } = await placeOrder(app, { shopper: buyer.shopper });
    await simulate(app, number);

    const { data } = bodyOf<Detail>(await admin.shopper.call('get', `/admin/orders/${number}`));
    expect(data.order).toMatchObject({ number, status: 'paid' });
    expect(data.payment).toMatchObject({
      status: 'succeeded',
      providerPaymentIntentId: expect.stringMatching(/^pi_fake_\d+$/) as string,
    });
    expect(data.customer?.email).toBe('buyer@pawsome.test');
    expect(data.history.map((h) => [h.toStatus, h.actor])).toEqual([
      ['pending_payment', 'customer'],
      ['paid', 'system:webhook'],
    ]);
    expect(data.allowedNext).toEqual(['processing', 'refunded', 'cancelled']);
    expect(data.promotions).toEqual([]);
  });

  it('has no customer for a guest order, and answers 404 / 400 for unknown or malformed numbers', async () => {
    const { number } = await placeOrder(app);
    const { data } = bodyOf<Detail>(await admin.shopper.call('get', `/admin/orders/${number}`));
    expect(data.customer).toBeNull();
    expect((await admin.shopper.call('get', '/admin/orders/PW-2026-999999')).status).toBe(404);
    expect((await admin.shopper.call('get', '/admin/orders/nope')).status).toBe(400);
  });
});

describe('POST /admin/orders/:number/transition', () => {
  it('moves a paid order along, recording the admin as actor and the note', async () => {
    const { number } = await placeOrder(app);
    await simulate(app, number);
    const res = await move(number, { to: 'processing', note: 'Packing now' });
    expect(res.status).toBe(200);
    const { data } = bodyOf<Detail>(res);
    expect(data.order.status).toBe('processing');
    expect(data.history.at(-1)).toMatchObject({
      toStatus: 'processing',
      actor: 'admin:boss@pawsome.test',
      note: 'Packing now',
    });
    expect(data.allowedNext).toEqual(['shipped', 'cancelled']);
  });

  it('sends the shipped email when an order is marked shipped', async () => {
    const { number } = await placeOrder(app, { email: 'ada@pawsome.test' });
    await simulate(app, number);
    await move(number, { to: 'processing' });
    await move(number, { to: 'shipped' });
    await outbox.drain();
    const subjects = transport.sent.map((m) => m.subject);
    expect(subjects.some((s) => s.includes('on its way'))).toBe(true);
    expect(transport.sent.find((m) => m.subject.includes('on its way'))?.to).toBe(
      'ada@pawsome.test',
    );
  });

  it('rejects a move the state machine forbids with 409 and the allowed list, changing nothing', async () => {
    const { number } = await placeOrder(app);
    await simulate(app, number);
    const res = await move(number, { to: 'delivered' });
    expect(res.status).toBe(409);
    expect(errorOf(res)).toMatchObject({
      code: 'CONFLICT',
      details: { from: 'paid', to: 'delivered', allowed: ['processing', 'refunded', 'cancelled'] },
    });
    expect((await orderByNumber(number)).status).toBe('paid');
  });

  it('never lets an admin mark an order paid', async () => {
    const { number } = await placeOrder(app);
    expect((await move(number, { to: 'paid' })).status).toBe(409);
    expect((await orderByNumber(number)).status).toBe('pending_payment');
  });

  it('cancelling a paid order refunds it in Stripe and restocks', async () => {
    const { number, variantId } = await placeOrder(app, { stock: 10, quantity: 2 });
    await simulate(app, number);
    const refundsBefore = fake.refunded.length;
    const res = await move(number, { to: 'cancelled', note: 'Customer changed their mind' });
    expect(res.status).toBe(200);
    expect(fake.refunded.length).toBe(refundsBefore + 1);
    expect(await stockOf(variantId)).toEqual({ quantity: 10, reserved: 0 });
    expect(bodyOf<Detail>(res).data.payment?.status).toBe('refunded');
  });

  it('validates the body and the order number, and answers 404 for an unknown order', async () => {
    const { number } = await placeOrder(app);
    expect((await move(number, { to: 'teleported' })).status).toBe(400);
    expect((await move(number, {})).status).toBe(400);
    expect((await move(number, { to: 'cancelled', note: 'x'.repeat(301) })).status).toBe(400);
    expect((await move('PW-2026-999999', { to: 'cancelled' })).status).toBe(404);
    expect((await move('bad', { to: 'cancelled' })).status).toBe(400);
  });
});

describe('GET /admin/customers', () => {
  it('lists customers with their placed-order count and never a password hash', async () => {
    const buyer = await signedIn(app, 'customer', 'buyer@pawsome.test');
    const paid = await placeOrder(app, { shopper: buyer.shopper });
    await simulate(app, paid.number);
    await placeOrder(app, { shopper: buyer.shopper }); // unpaid: does not count
    await createUser({ email: 'quiet@pawsome.test' });
    // Seeded reviewer accounts sign reviews only; they are not customers to manage.
    await createUser({ email: 'reviewer03@pawsome.test' });
    await createUser({ email: 'customer0042@pawsome.test' });

    const res = await admin.shopper.call('get', '/admin/customers');
    const body = bodyOf<{
      data: { email: string; orderCount: number; lastOrderAt: string | null }[];
      meta: { total: number };
    }>(res);
    // The admin account is not a customer.
    expect(body.data.map((c) => c.email).sort()).toEqual([
      'buyer@pawsome.test',
      'quiet@pawsome.test',
    ]);
    expect(body.data.find((c) => c.email === 'buyer@pawsome.test')).toMatchObject({
      orderCount: 1,
    });
    expect(body.data.find((c) => c.email === 'quiet@pawsome.test')).toMatchObject({
      orderCount: 0,
      lastOrderAt: null,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password|test-hash|argon2/i);
  });

  it('paginates and searches by email or name', async () => {
    await createUser({ email: 'ada@pawsome.test', firstName: 'Ada', lastName: 'Lovelace' });
    await createUser({ email: 'grace@pawsome.test', firstName: 'Grace', lastName: 'Hopper' });
    const emails = async (qs: string) =>
      bodyOf<{ data: { email: string }[] }>(
        await admin.shopper.call('get', `/admin/customers?${qs}`),
      ).data.map((c) => c.email);
    expect(await emails('q=lovelace')).toEqual(['ada@pawsome.test']);
    expect(await emails('q=grace hopper')).toEqual(['grace@pawsome.test']);
    expect(await emails('q=PAWSOME')).toHaveLength(2);
    const page = bodyOf<{ data: object[]; meta: { total: number; totalPages: number } }>(
      await admin.shopper.call('get', '/admin/customers?limit=1'),
    );
    expect(page.data).toHaveLength(1);
    expect(page.meta).toMatchObject({ total: 2, totalPages: 2 });
  });
});
