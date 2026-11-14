import { Writable } from 'node:stream';

import { eq } from 'drizzle-orm';
import { pino } from 'pino';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../../db/client.ts';
import {
  bulkTiers,
  discountCodes,
  discountRedemptions,
  giftRules,
  productVariants,
} from '../../db/schema/index.ts';
import { makeTestApp } from '../../test/app.ts';
import { createProduct, createShippingMethods } from '../../test/factories.ts';
import { bodyOf, errorOf } from '../../test/http.ts';
import { orderByNumber, placeOrder, signedIn } from '../../test/orders.ts';
import { makeShopper, type Shopper } from '../../test/shopper.ts';

const lines: Record<string, unknown>[] = [];
const logger = pino(
  { level: 'info' },
  new Writable({
    write(chunk: Buffer, _enc, cb) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      cb();
    },
  }),
);
const app = makeTestApp({ logger });
let admin: Shopper;
let adminId: string;

beforeEach(async () => {
  lines.length = 0;
  const s = await signedIn(app, 'admin', 'boss@pawsome.test');
  admin = s.shopper;
  adminId = s.user.id;
});

// The factory generates SKUs; the gift form takes a typed one, so give the variant a known SKU.
async function variantWithSku(
  sku: string,
  status: 'active' | 'archived' = 'active',
  gbpCents?: number,
) {
  const { variants } = await createProduct({ variants: [{ status, gbpCents }] });
  await db.update(productVariants).set({ sku }).where(eq(productVariants.id, variants[0]!.id));
  return variants[0]!.id;
}

const data = <T>(res: Parameters<typeof bodyOf>[0]) => bodyOf<{ data: T }>(res).data;
const audits = () => lines.filter((l) => l.audit === true);

const codeBody = (over: Record<string, unknown> = {}) => ({
  code: 'SPRING10',
  kind: 'percent',
  value: 10,
  minSpendCents: 3000,
  maxUses: 100,
  ...over,
});

describe('access', () => {
  it.each([
    ['get', '/admin/discount-codes'],
    ['get', '/admin/bulk-tiers'],
    ['get', '/admin/gift-rule'],
    ['post', '/admin/discount-codes'],
    ['put', '/admin/gift-rule'],
  ] as const)('%s %s: 403 for a customer, 401 for a guest', async (method, path) => {
    const customer = (await signedIn(app, 'customer')).shopper;
    expect((await customer.call(method, path, {})).status).toBe(403);
    expect((await makeShopper(app).call(method, path, {})).status).toBe(401);
  });
});

describe('discount codes', () => {
  it('creates, lists with the live-redemption count and writes an audit line', async () => {
    const res = await admin.call('post', '/admin/discount-codes', codeBody());
    expect(res.status).toBe(201);
    const created = data<{ id: string; code: string; liveRedemptions: number }>(res);
    expect(created).toMatchObject({ code: 'SPRING10', liveRedemptions: 0 });
    const list = data<{ code: string }[]>(await admin.call('get', '/admin/discount-codes'));
    expect(list.map((c) => c.code)).toContain('SPRING10');
    expect(audits()).toEqual([
      expect.objectContaining({
        action: 'discount_code.create',
        target: created.id,
        userId: adminId,
        status: 201,
      }),
    ]);
  });

  it('refuses a duplicate code in any letter case with a 409 and a clear sentence', async () => {
    await admin.call('post', '/admin/discount-codes', codeBody());
    const res = await admin.call('post', '/admin/discount-codes', codeBody({ code: 'spring10' }));
    expect(res.status).toBe(409);
    expect(errorOf(res).message).toMatch(/already exists/);
  });

  it.each([
    ['percent 101', { kind: 'percent', value: 101 }, 'value'],
    ['percent 0', { kind: 'percent', value: 0 }, 'value'],
    ['fixed 0', { kind: 'fixed', value: 0 }, 'value'],
    ['free shipping with a value', { kind: 'free_shipping', value: 5 }, 'value'],
    ['zero cap', { maxUses: 0 }, 'maxUses'],
    ['zero per-customer cap', { perCustomerMax: 0 }, 'perCustomerMax'],
    [
      'ends before it starts',
      { startsAt: '2026-12-02T10:00:00.000Z', endsAt: '2026-12-01T10:00:00.000Z' },
      'endsAt',
    ],
    [
      'ends when it starts',
      { startsAt: '2026-12-01T10:00:00Z', endsAt: '2026-12-01T10:00:00Z' },
      'endsAt',
    ],
  ])('rejects %s', async (_name, over, field) => {
    const res = await admin.call('post', '/admin/discount-codes', codeBody(over));
    expect(res.status).toBe(400);
    const details = errorOf(res).details as { fieldErrors: Record<string, string[]> };
    expect(Object.keys(details.fieldErrors)).toContain(field);
  });

  it('accepts a free-shipping code with value 0 and null caps', async () => {
    const res = await admin.call(
      'post',
      '/admin/discount-codes',
      codeBody({ code: 'SHIP', kind: 'free_shipping', value: 0, maxUses: null }),
    );
    expect(res.status).toBe(201);
  });

  it('updates a code and refuses to rename it onto another', async () => {
    const a = data<{ id: string }>(await admin.call('post', '/admin/discount-codes', codeBody()));
    await admin.call('post', '/admin/discount-codes', codeBody({ code: 'OTHER' }));
    const ok = await admin.call('put', `/admin/discount-codes/${a.id}`, codeBody({ value: 15 }));
    expect(ok.status).toBe(200);
    expect(data<{ value: number }>(ok).value).toBe(15);
    const clash = await admin.call(
      'put',
      `/admin/discount-codes/${a.id}`,
      codeBody({ code: 'other' }),
    );
    expect(clash.status).toBe(409);
    expect(audits().map((l) => l.action)).toContain('discount_code.update');
  });

  it('hard-deletes a code nobody used', async () => {
    const c = data<{ id: string }>(await admin.call('post', '/admin/discount-codes', codeBody()));
    const res = await admin.call('delete', `/admin/discount-codes/${c.id}`);
    expect(data<{ outcome: string }>(res).outcome).toBe('deleted');
    expect(await db.select().from(discountCodes).where(eq(discountCodes.id, c.id))).toHaveLength(0);
    expect(audits().at(-1)).toMatchObject({ action: 'discount_code.delete', target: c.id });
  });

  it('archives instead of deleting once an order used it, and counts only live redemptions', async () => {
    await createShippingMethods();
    const c = data<{ id: string }>(await admin.call('post', '/admin/discount-codes', codeBody()));
    const { number } = await placeOrder(app);
    const order = await orderByNumber(number);
    await db
      .insert(discountRedemptions)
      .values({ codeId: c.id, orderId: order.id, customerKey: 'x', releasedAt: new Date() });
    // Released rows do not count as live, but they still block a hard delete.
    const list = data<{ id: string; liveRedemptions: number }[]>(
      await admin.call('get', '/admin/discount-codes'),
    );
    expect(list.find((x) => x.id === c.id)?.liveRedemptions).toBe(0);

    const res = await admin.call('delete', `/admin/discount-codes/${c.id}`);
    expect(data<{ outcome: string }>(res).outcome).toBe('archived');
    const [row] = await db.select().from(discountCodes).where(eq(discountCodes.id, c.id));
    expect(row?.archivedAt).not.toBeNull();
    expect(row?.active).toBe(false);
    expect(audits().at(-1)).toMatchObject({ action: 'discount_code.archive', target: c.id });
  });

  it('404s an unknown code', async () => {
    const res = await admin.call(
      'delete',
      '/admin/discount-codes/11111111-1111-4111-8111-111111111111',
    );
    expect(res.status).toBe(404);
  });
});

describe('bulk tiers', () => {
  it('creates, updates, lists in order and deletes, with audit lines', async () => {
    const hi = data<{ id: string }>(
      await admin.call('post', '/admin/bulk-tiers', { minCents: 10000, percent: 10 }),
    );
    await admin.call('post', '/admin/bulk-tiers', { minCents: 5000, percent: 5 });
    const list = data<{ minCents: number }[]>(await admin.call('get', '/admin/bulk-tiers'));
    expect(list.map((t) => t.minCents)).toEqual([5000, 10000]);
    const up = await admin.call('put', `/admin/bulk-tiers/${hi.id}`, {
      minCents: 12000,
      percent: 12,
      active: false,
    });
    expect(data<{ percent: number; active: boolean }>(up)).toMatchObject({
      percent: 12,
      active: false,
    });
    expect((await admin.call('delete', `/admin/bulk-tiers/${hi.id}`)).status).toBe(204);
    expect(audits().map((l) => l.action)).toEqual([
      'bulk_tier.create',
      'bulk_tier.create',
      'bulk_tier.update',
      'bulk_tier.delete',
    ]);
  });

  it('rejects a second tier on the same threshold (409), also when moving one onto it', async () => {
    await admin.call('post', '/admin/bulk-tiers', { minCents: 5000, percent: 5 });
    const dup = await admin.call('post', '/admin/bulk-tiers', { minCents: 5000, percent: 8 });
    expect(dup.status).toBe(409);
    const other = data<{ id: string }>(
      await admin.call('post', '/admin/bulk-tiers', { minCents: 9000, percent: 9 }),
    );
    const move = await admin.call('put', `/admin/bulk-tiers/${other.id}`, {
      minCents: 5000,
      percent: 9,
    });
    expect(move.status).toBe(409);
    expect(await db.select().from(bulkTiers)).toHaveLength(2);
  });

  it.each([101, 0, 2.5])('rejects percent %s', async (percent) => {
    const res = await admin.call('post', '/admin/bulk-tiers', { minCents: 5000, percent });
    expect(res.status).toBe(400);
  });

  it('rejects a zero threshold', async () => {
    expect(
      (await admin.call('post', '/admin/bulk-tiers', { minCents: 0, percent: 5 })).status,
    ).toBe(400);
  });
});

describe('gift rule', () => {
  it('is null at first, is set by SKU, replaced by id, and switched off', async () => {
    expect(data<unknown>(await admin.call('get', '/admin/gift-rule'))).toBeNull();
    await variantWithSku('GIFT-A');
    const bId = await variantWithSku('GIFT-B');

    const first = await admin.call('put', '/admin/gift-rule', {
      thresholdCents: 4000,
      variant: 'GIFT-A',
    });
    expect(data<{ sku: string; thresholdCents: number }>(first)).toMatchObject({
      sku: 'GIFT-A',
      thresholdCents: 4000,
    });
    const second = await admin.call('put', '/admin/gift-rule', {
      thresholdCents: 5000,
      variant: bId,
    });
    expect(data<{ sku: string }>(second).sku).toBe('GIFT-B');
    expect(await db.select().from(giftRules)).toHaveLength(1);

    expect((await admin.call('delete', '/admin/gift-rule')).status).toBe(204);
    expect(data<unknown>(await admin.call('get', '/admin/gift-rule'))).toBeNull();
    expect((await admin.call('delete', '/admin/gift-rule')).status).toBe(404);
    expect(audits().map((l) => l.action)).toEqual([
      'gift_rule.set',
      'gift_rule.set',
      'gift_rule.clear',
      'gift_rule.clear',
    ]);
  });

  it('rejects an unknown SKU, a bad threshold and an archived variant', async () => {
    const unknown = await admin.call('put', '/admin/gift-rule', {
      thresholdCents: 4000,
      variant: 'NOPE',
    });
    expect(unknown.status).toBe(400);
    const zero = await admin.call('put', '/admin/gift-rule', {
      thresholdCents: 0,
      variant: 'NOPE',
    });
    expect(zero.status).toBe(400);
    await variantWithSku('OLD', 'archived');
    const archived = await admin.call('put', '/admin/gift-rule', {
      thresholdCents: 4000,
      variant: 'OLD',
    });
    expect(archived.status).toBe(400);
    expect(errorOf(archived).details).toMatchObject({
      fieldErrors: { variant: [expect.any(String)] },
    });
    expect(await db.select().from(giftRules)).toHaveLength(0);
  });
});

describe('amounts per currency (GBP next to EUR)', () => {
  it('saves a fixed code and its minimum spend in GBP, keeps them on a PUT that leaves them out', async () => {
    const res = await admin.call(
      'post',
      '/admin/discount-codes',
      codeBody({
        code: 'FIVER',
        kind: 'fixed',
        value: 500,
        valueByCurrency: { GBP: 450 },
        minSpendByCurrency: { GBP: 2500 },
      }),
    );
    expect(res.status).toBe(201);
    const { id } = data<{ id: string }>(res);
    expect(data(res)).toMatchObject({
      valueByCurrency: { GBP: 450 },
      minSpendByCurrency: { GBP: 2500 },
    });
    // An older form without the maps must not wipe them.
    await admin.call(
      'put',
      `/admin/discount-codes/${id}`,
      codeBody({ code: 'FIVER', kind: 'fixed', value: 600 }),
    );
    const [row] = await db.select().from(discountCodes).where(eq(discountCodes.id, id));
    expect(row).toMatchObject({ value: 600, valueByCurrency: { GBP: 450 } });
    // Sending a map replaces it; an empty map takes the code out of the GBP store.
    await admin.call(
      'put',
      `/admin/discount-codes/${id}`,
      codeBody({ code: 'FIVER', kind: 'fixed', value: 600, valueByCurrency: {} }),
    );
    const [after] = await db.select().from(discountCodes).where(eq(discountCodes.id, id));
    expect(after?.valueByCurrency).toEqual({});
  });

  it('refuses a GBP value on a percent code, a zero GBP amount and an unknown currency', async () => {
    const percent = await admin.call(
      'post',
      '/admin/discount-codes',
      codeBody({ valueByCurrency: { GBP: 5 } }),
    );
    expect(percent.status).toBe(400);
    const zero = await admin.call(
      'post',
      '/admin/discount-codes',
      codeBody({ kind: 'fixed', value: 500, valueByCurrency: { GBP: 0 } }),
    );
    expect(zero.status).toBe(400);
    const usd = await admin.call(
      'post',
      '/admin/discount-codes',
      codeBody({ kind: 'fixed', value: 500, valueByCurrency: { USD: 500 } }),
    );
    expect(usd.status).toBe(400);
    expect(await db.select().from(discountCodes)).toHaveLength(0);
  });

  it('saves a tier threshold and the gift threshold in GBP', async () => {
    const tier = await admin.call('post', '/admin/bulk-tiers', {
      minCents: 5000,
      minByCurrency: { GBP: 4500 },
      percent: 5,
    });
    expect(data(tier)).toMatchObject({ minByCurrency: { GBP: 4500 } });
    const { id } = data<{ id: string }>(tier);
    await admin.call('put', `/admin/bulk-tiers/${id}`, { minCents: 6000, percent: 6 });
    expect((await db.select().from(bulkTiers))[0]?.minByCurrency).toEqual({ GBP: 4500 });

    await variantWithSku('GIFT-GB', 'active', 300);
    const gift = await admin.call('put', '/admin/gift-rule', {
      thresholdCents: 4000,
      thresholdByCurrency: { GBP: 3500 },
      variant: 'GIFT-GB',
    });
    expect(data(gift)).toMatchObject({ thresholdByCurrency: { GBP: 3500 } });
    await admin.call('put', '/admin/gift-rule', { thresholdCents: 4500, variant: 'GIFT-GB' });
    expect((await db.select().from(giftRules))[0]).toMatchObject({
      thresholdCents: 4500,
      thresholdByCurrency: { GBP: 3500 },
    });
  });

  it('refuses a GBP gift threshold when the gift has no GBP price, also when the map is kept', async () => {
    await variantWithSku('EUR-ONLY');
    const res = await admin.call('put', '/admin/gift-rule', {
      thresholdCents: 4000,
      thresholdByCurrency: { GBP: 3500 },
      variant: 'EUR-ONLY',
    });
    expect(res.status).toBe(400);
    expect(errorOf(res).details).toMatchObject({
      fieldErrors: { thresholdByCurrency: [expect.stringContaining('no GBP price')] },
    });
    // A stored GBP threshold, then a PUT that keeps it but points at a EUR-only gift.
    await variantWithSku('GIFT-GB2', 'active', 300);
    await admin.call('put', '/admin/gift-rule', {
      thresholdCents: 4000,
      thresholdByCurrency: { GBP: 3500 },
      variant: 'GIFT-GB2',
    });
    const kept = await admin.call('put', '/admin/gift-rule', {
      thresholdCents: 4000,
      variant: 'EUR-ONLY',
    });
    expect(kept.status).toBe(400);
    expect((await db.select().from(giftRules))[0]?.thresholdByCurrency).toEqual({ GBP: 3500 });
  });

  it('clears the GBP value when a fixed code becomes a percent one', async () => {
    const res = await admin.call(
      'post',
      '/admin/discount-codes',
      codeBody({ code: 'FLIP', kind: 'fixed', value: 600, valueByCurrency: { GBP: 450 } }),
    );
    const { id } = data<{ id: string }>(res);
    const put = await admin.call(
      'put',
      `/admin/discount-codes/${id}`,
      codeBody({ code: 'FLIP', kind: 'percent', value: 10 }),
    );
    expect(put.status).toBe(200);
    expect(data<{ valueByCurrency: object }>(put).valueByCurrency).toEqual({});
  });

  it('refuses an amount beyond the integer column', async () => {
    const res = await admin.call(
      'post',
      '/admin/discount-codes',
      codeBody({ code: 'HUGE', kind: 'fixed', value: 2_147_483_648 }),
    );
    expect(res.status).toBe(400);
    const gbp = await admin.call(
      'post',
      '/admin/discount-codes',
      codeBody({
        code: 'HUGE',
        kind: 'fixed',
        value: 500,
        valueByCurrency: { GBP: 3_000_000_000 },
      }),
    );
    expect(gbp.status).toBe(400);
  });
});
