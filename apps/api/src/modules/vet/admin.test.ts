import { eq } from 'drizzle-orm';
import { pino } from 'pino';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../../db/client.ts';
import { orderVetDetails, payments } from '../../db/schema/index.ts';
import { MemoryTransport } from '../../lib/mailer.ts';
import { makeTestApp } from '../../test/app.ts';
import { createShippingMethods } from '../../test/factories.ts';
import { FakeStripe } from '../../test/fake-stripe.ts';
import { bodyOf, errorOf } from '../../test/http.ts';
import {
  heldOrder,
  orderByNumber,
  placeOrder,
  signedIn,
  simulate,
  stockOf,
} from '../../test/orders.ts';
import type { Shopper } from '../../test/shopper.ts';
import { createOutbox } from '../mail/outbox.ts';
import { onOrderCancelled, onOrderRefunded } from '../orders/events.ts';
import type { OrderCancelledEvent, OrderRefundedEvent } from '../orders/events.ts';

const fake = new FakeStripe();
const transport = new MemoryTransport();
const outbox = createOutbox({ transport, log: pino({ level: 'silent' }) });
const app = makeTestApp({ payments: fake, outbox });

const refunds: OrderRefundedEvent[] = [];
const cancels: OrderCancelledEvent[] = [];
onOrderRefunded((_tx, e) => {
  refunds.push(e);
  return Promise.resolve();
});
onOrderCancelled((_tx, e) => {
  cancels.push(e);
  return Promise.resolve();
});

let admin: Shopper;
beforeEach(async () => {
  admin = (await signedIn(app, 'admin', 'boss@pawsome.test')).shopper;
  await createShippingMethods();
  transport.sent.length = 0;
  refunds.length = 0;
  cancels.length = 0;
  fake.calls.length = 0;
});

interface Row {
  orderNumber: string;
  decision: string;
  vetName: string;
  vetEmail: string;
  confirmationCode: string | null;
  reason: string | null;
  decidedBy: string | null;
  items: { productName: string; quantity: number }[];
}
const list = async (qs = '') =>
  bodyOf<{ data: Row[]; meta: { total: number } }>(
    await admin.call('get', `/admin/vet-approvals${qs}`),
  );
const act = (number: string, action: string, body: object = {}) =>
  admin.call('post', `/admin/vet-approvals/${number}/${action}`, body);
const statusOf = async (n: string) => (await orderByNumber(n)).status;

describe('vet approval queue', () => {
  it('needs an admin, lists waiting orders with the vet and items, and filters by decision', async () => {
    const held = await heldOrder(app, { quantity: 3 });
    expect((await held.buyer.shopper.call('get', '/admin/vet-approvals')).status).toBe(403);
    const pending = await list();
    expect(pending.meta.total).toBe(1);
    expect(pending.data[0]).toMatchObject({
      orderNumber: held.number,
      decision: 'pending',
      vetName: 'Dr Rosa Marsh',
      vetEmail: 'rosa@pawside-vet.test',
      confirmationCode: null,
    });
    expect(pending.data[0]?.items[0]?.quantity).toBe(3);
    expect((await list('?decision=approved')).data).toEqual([]);
  });
});

describe('approving', () => {
  it('moves the order to processing with a fake confirmation code, without emailing any vet', async () => {
    const held = await heldOrder(app);
    const res = await act(held.number, 'approve');
    expect(res.status).toBe(200);
    expect(await statusOf(held.number)).toBe('processing');
    const row = (await db.select().from(orderVetDetails))[0];
    expect(row).toMatchObject({ decision: 'approved', decidedBy: 'admin:boss@pawsome.test' });
    expect(row?.confirmationCode).toMatch(/^VET-SIM-[0-9A-F]{8}$/);
    await outbox.drain();
    const to = transport.sent.map((m) => m.to);
    expect(to).not.toContain('rosa@pawside-vet.test');
    const subjects = transport.sent.map((m) => m.subject ?? '');
    expect(subjects.some((s) => /waiting for a vet/.test(s))).toBe(true);
    expect(subjects.some((s) => /approved and being packed/.test(s))).toBe(true);
    expect((await list('?decision=approved')).data[0]?.confirmationCode).toBe(
      row?.confirmationCode,
    );
  });

  it('refuses a second decision and an order that is not waiting (409)', async () => {
    const held = await heldOrder(app);
    await act(held.number, 'approve');
    expect((await act(held.number, 'approve')).status).toBe(409);
    expect((await act(held.number, 'reject', { reason: 'Too late' })).status).toBe(409);
    const plain = await placeOrder(app, {});
    await simulate(app, plain.number);
    expect((await act(plain.number, 'approve')).status).toBe(404);
  });
});

describe('a refund made in the Stripe dashboard while the order is held', () => {
  it('refunds the order, puts the stock back, emits one full event and refuses a later approval', async () => {
    const held = await heldOrder(app, { quantity: 2, stock: 10 });
    expect(await stockOf(held.variantId)).toEqual({ quantity: 8, reserved: 0 });
    expect((await simulate(app, held.number, 'charge.refunded')).status).toBe(200);
    const order = await orderByNumber(held.number);
    expect(order).toMatchObject({ status: 'refunded', refundedCents: order.totalCents });
    expect(await stockOf(held.variantId)).toEqual({ quantity: 10, reserved: 0 });
    expect(refunds).toHaveLength(1);
    expect(refunds[0]).toMatchObject({ full: true, amountCents: order.totalCents });
    // A redelivery changes nothing, and the held order can no longer be approved and shipped.
    await simulate(app, held.number, 'charge.refunded');
    expect(refunds).toHaveLength(1);
    expect((await act(held.number, 'approve')).status).toBe(409);
    expect((await orderByNumber(held.number)).status).toBe('refunded');
  });
});

describe('rejecting', () => {
  it('needs a reason, cancels the order, restocks, refunds in full and emits both events', async () => {
    const held = await heldOrder(app, { quantity: 2, stock: 10 });
    const order = await orderByNumber(held.number);
    expect(await stockOf(held.variantId)).toEqual({ quantity: 8, reserved: 0 });
    expect((await act(held.number, 'reject', { reason: 'x' })).status).toBe(400);

    const res = await act(held.number, 'reject', { reason: 'Not suitable for this pet' });
    expect(res.status).toBe(200);
    expect(await statusOf(held.number)).toBe('cancelled');
    expect(await stockOf(held.variantId)).toEqual({ quantity: 10, reserved: 0 });
    const intent = (await db.select().from(payments).where(eq(payments.orderId, order.id)))[0]!;
    expect(fake.refundedCents(intent.providerPaymentIntentId!)).toBe(order.totalCents);
    expect(intent.status).toBe('refunded');

    expect(cancels).toEqual([{ orderId: order.id }]);
    expect(refunds).toHaveLength(1);
    expect(refunds[0]).toMatchObject({
      orderId: order.id,
      amountCents: order.totalCents,
      full: true,
      shippingCents: order.shippingCents,
    });
    const row = (await db.select().from(orderVetDetails))[0];
    expect(row).toMatchObject({ decision: 'rejected', reason: 'Not suitable for this pet' });
  });

  it('tells the customer the reason and that they were refunded', async () => {
    const held = await heldOrder(app);
    await act(held.number, 'reject', { reason: 'Not <b>suitable</b>' });
    await outbox.drain();
    const mail = transport.sent.find((m) => /was not approved/.test(m.subject ?? ''));
    expect(mail?.to).toBe(held.buyer.user.email);
    expect(mail?.text).toContain('refunded in full');
    expect(mail?.html).toContain('Not &lt;b&gt;suitable&lt;/b&gt;');
  });

  it('is safe to repeat: no second refund, no second event, and a retry after a gateway failure works', async () => {
    const held = await heldOrder(app);
    fake.failNext('refund');
    expect((await act(held.number, 'reject', { reason: 'No' + ' reason' })).status).toBe(502);
    expect(await statusOf(held.number)).toBe('awaiting_vet_approval');
    expect((await act(held.number, 'reject', { reason: 'No reason' })).status).toBe(200);
    expect((await act(held.number, 'reject', { reason: 'No reason' })).status).toBe(200);
    expect(refunds).toHaveLength(1);
    expect(cancels).toHaveLength(1);
    const order = await orderByNumber(held.number);
    const intent = (await db.select().from(payments).where(eq(payments.orderId, order.id)))[0]!;
    expect(fake.refundedCents(intent.providerPaymentIntentId!)).toBe(order.totalCents);
  });

  it('records a simulated refund without calling the gateway in demo mode', async () => {
    const sim = makeTestApp({
      payments: fake,
      outbox,
      config: { returns: { windowDays: 30, simulated: true } },
    });
    const adminSim = (await signedIn(sim, 'admin', 'sim@pawsome.test')).shopper;
    const held = await heldOrder(sim);
    fake.calls.length = 0;
    const res = await adminSim.call('post', `/admin/vet-approvals/${held.number}/reject`, {
      reason: 'Demo rejection',
    });
    expect(res.status).toBe(200);
    expect(bodyOf<{ data: { simulatedMode: boolean } }>(res).data.simulatedMode).toBe(true);
    expect(fake.callsTo('refund')).toHaveLength(0);
    expect(await statusOf(held.number)).toBe('cancelled');
    await outbox.drain();
    expect(transport.sent.find((m) => /was not approved/.test(m.subject ?? ''))?.text).toContain(
      'The refund goes back to the card you paid with.',
    );
    void errorOf;
  });
});
