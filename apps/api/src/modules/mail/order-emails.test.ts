import { pino } from 'pino';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../../db/client.ts';
import { emailOutbox, productTranslations } from '../../db/schema/index.ts';
import { MemoryTransport } from '../../lib/mailer.ts';
import { makeTestApp, TEST_HOOK_SECRET } from '../../test/app.ts';
import { createProduct, createShippingMethods } from '../../test/factories.ts';
import { FakeStripe } from '../../test/fake-stripe.ts';
import { placeOrder, simulate, TEST_ADDRESS } from '../../test/orders.ts';
import { makeShopper } from '../../test/shopper.ts';
import { transitionOrder } from '../orders/service.ts';

import { createOutbox } from './outbox.ts';

const log = pino({ level: 'silent' });
let transport: MemoryTransport;
let fake: FakeStripe;
let outbox: ReturnType<typeof createOutbox>;
let app: ReturnType<typeof makeTestApp>;

beforeEach(async () => {
  transport = new MemoryTransport();
  fake = new FakeStripe();
  outbox = createOutbox({ transport, log });
  app = makeTestApp({ payments: fake, outbox });
  await createShippingMethods();
});

const queued = async () => (await db.select().from(emailOutbox)).map((r) => r.kind).sort();
const ship = (number: string) =>
  transitionOrder({ gateway: fake, log }, number, 'shipped', { actor: 'admin:boss@pawsome.test' });

describe('order emails through the outbox', () => {
  it('queues the confirmation in the payment transaction and sends it to the order email', async () => {
    const { number } = await placeOrder(app, { email: 'grace@pawsome.test' });
    expect(await queued()).toEqual([]); // nothing owed until it is paid

    await simulate(app, number);
    expect(await queued()).toEqual(['order_confirmation']);

    await outbox.drain();
    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0]).toMatchObject({ to: 'grace@pawsome.test' });
    expect(transport.sent[0]?.subject).toContain(number);
    expect(transport.sent[0]?.html).toContain('Thank you for your order');
  });

  it('writes the order emails in the language the order was placed in, whoever triggers them', async () => {
    const { variants } = await createProduct({ variants: [{ priceCents: 1000, stock: 10 }] });
    const shopper = makeShopper(app, undefined, 'de-de');
    await shopper.addToCart(variants[0]!.id, 1);
    const res = await shopper.call('post', '/checkout', {
      email: 'hanna@pawsome.test',
      shippingAddress: { ...TEST_ADDRESS, country: 'DE' },
      shippingMethodCode: 'standard',
    });
    expect(res.status).toBe(200);
    const number = (res.body as { data: { orderNumber: string } }).data.orderNumber;
    await simulate(app, number);
    // The admin's transition request carries no store view: the order's own snapshot decides.
    await transitionOrder({ gateway: fake, log }, number, 'processing', { actor: 'admin:a@b.c' });
    await ship(number);
    await outbox.drain();
    expect(transport.sent.map((m) => m.subject)).toEqual([
      `Ihre Pawsome-Bestellung ${number} ist bestätigt`,
      `Ihre Pawsome-Bestellung ${number} ist unterwegs`,
    ]);
    expect(transport.sent[0]?.html).toContain('Vielen Dank für Ihre Bestellung');
  });

  it('lists the products under their name in the order language, English where none is translated', async () => {
    const bone = await createProduct({ name: 'Squeaky bone', variants: [{ stock: 10 }] });
    const rope = await createProduct({ name: 'Rope tug', variants: [{ stock: 10 }] });
    await db.insert(productTranslations).values([
      { productId: bone.product.id, locale: 'de', name: 'Quietschknochen' },
      // A French name must not leak into a German mail.
      { productId: rope.product.id, locale: 'fr', name: 'Corde à tirer' },
    ]);
    const shopper = makeShopper(app, undefined, 'de-de');
    await shopper.addToCart(bone.variants[0]!.id, 1);
    await shopper.addToCart(rope.variants[0]!.id, 1);
    const res = await shopper.call('post', '/checkout', {
      email: 'hanna@pawsome.test',
      shippingAddress: { ...TEST_ADDRESS, country: 'DE' },
      shippingMethodCode: 'standard',
    });
    const number = (res.body as { data: { orderNumber: string } }).data.orderNumber;
    await simulate(app, number);
    await outbox.drain();
    const mail = transport.sent[0]!;
    expect(mail.html).toContain('Quietschknochen');
    expect(mail.text).toContain('Quietschknochen');
    expect(mail.html).toContain('Rope tug');
    expect(mail.html).not.toContain('Squeaky bone');
    expect(mail.html).not.toContain('Corde');
  });

  it('sends the confirmation once even if the payment event is delivered again', async () => {
    const { number } = await placeOrder(app);
    await simulate(app, number);
    await simulate(app, number);
    await outbox.drain();
    expect(transport.sent).toHaveLength(1);
  });

  it('sends the shipped email when the order moves to shipped, once', async () => {
    const { number } = await placeOrder(app);
    await simulate(app, number);
    await transitionOrder({ gateway: fake, log }, number, 'processing', { actor: 'admin:a@b.c' });
    await ship(number);
    await outbox.drain();
    expect(transport.sent.map((m) => m.subject)).toEqual([
      expect.stringContaining('is confirmed') as string,
      expect.stringContaining('on its way') as string,
    ]);
  });

  it('queues nothing for a cancelled order, a failed payment or an amount mismatch', async () => {
    const a = await placeOrder(app);
    await transitionOrder({ gateway: fake, log }, a.number, 'cancelled', { actor: 'admin:a@b.c' });
    const b = await placeOrder(app);
    await request(app)
      .post('/api/v1/test/webhooks/simulate')
      .set('X-Test-Hook-Secret', TEST_HOOK_SECRET)
      .send({ orderNumber: b.number, amountReceivedCents: 1 });
    expect(await queued()).toEqual([]);
  });

  it('does not fail the webhook when the mail server is down; the email waits and is retried', async () => {
    const { number } = await placeOrder(app);
    transport.failNext();
    const res = await simulate(app, number);
    expect(res.status).toBe(200);
    // The kick runs in the background and fails quietly; the row stays.
    await vi.waitFor(async () => {
      const [row] = await db.select().from(emailOutbox);
      expect(row?.attempts).toBe(1);
    });
    expect(transport.sent).toHaveLength(0);

    await db.update(emailOutbox).set({ nextAttemptAt: new Date(Date.now() - 1000) });
    await outbox.drain();
    expect(transport.sent).toHaveLength(1);
  });

  it('sends right after the commit without anyone calling drain (the kick)', async () => {
    const { number } = await placeOrder(app);
    await simulate(app, number);
    await vi.waitFor(() => expect(transport.sent).toHaveLength(1));
  });
});
