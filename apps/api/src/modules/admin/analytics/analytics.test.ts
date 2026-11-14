import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../../../db/client.ts';
import {
  inventory,
  orderItems,
  orderStatusHistory,
  orders,
  returnItems,
  returns,
} from '../../../db/schema/index.ts';
import { makeTestApp } from '../../../test/app.ts';
import { createProduct, createShippingMethods } from '../../../test/factories.ts';
import { bodyOf, errorOf } from '../../../test/http.ts';
import { orderByNumber, placeOrder, signedIn, simulate } from '../../../test/orders.ts';
import type { Shopper } from '../../../test/shopper.ts';

const app = makeTestApp();
let admin: Shopper;

beforeEach(async () => {
  admin = (await signedIn(app, 'admin', 'boss@pawsome.test')).shopper;
  await createShippingMethods();
});

interface Analytics {
  data: {
    range: { from: string; to: string; interval: string };
    revenue: {
      totalCents: number;
      series: { bucket: string; revenueCents: number; orders: number }[];
    };
    orders: number;
    aovCents: number;
    topByUnits: { name: string; units: number; revenueCents: number }[];
    topByRevenue: { name: string; units: number; revenueCents: number }[];
    lowStock: { sku: string; variantName: string; available: number }[];
    returns: { returnedUnits: number; deliveredUnits: number; rateBp: number };
  };
}
const get = async (qs: string) =>
  bodyOf<Analytics>(await admin.call('get', `/admin/analytics?${qs}`)).data;

// A paid order placed at a known instant. Returns its stored total (shipping included).
async function sale(
  at: string,
  opts: { variantId?: string; quantity?: number; priceCents?: number; status?: string } = {},
) {
  const placed = await placeOrder(app, {
    ...(opts.variantId && { variantId: opts.variantId }),
    quantity: opts.quantity ?? 1,
    priceCents: opts.priceCents ?? 1000,
    stock: 50,
  });
  await simulate(app, placed.number);
  const row = await orderByNumber(placed.number);
  await db
    .update(orders)
    .set({ placedAt: new Date(at), ...(opts.status && { status: opts.status as 'delivered' }) })
    .where(eq(orders.id, row.id));
  return { ...placed, id: row.id, totalCents: row.totalCents };
}

describe('GET /admin/analytics', () => {
  it('needs an admin', async () => {
    const customer = await signedIn(app);
    expect((await customer.shopper.call('get', '/admin/analytics')).status).toBe(403);
  });

  it('returns zeros, a zero-filled series and a 0 average for an empty range', async () => {
    const a = await get('from=2026-11-01&to=2026-11-07');
    expect(a.orders).toBe(0);
    expect(a.revenue.totalCents).toBe(0);
    expect(a.aovCents).toBe(0);
    expect(a.revenue.series).toHaveLength(7);
    expect(a.revenue.series.every((s) => s.revenueCents === 0 && s.orders === 0)).toBe(true);
    expect(a.topByUnits).toEqual([]);
    expect(a.returns).toEqual({ returnedUnits: 0, deliveredUnits: 0, rateBp: 0 });
  });

  it('sums paid orders per day in integer cents and divides for the average, half up', async () => {
    const one = await sale('2026-11-03T10:00:00Z');
    const two = await sale('2026-11-03T12:00:00Z', { quantity: 2 });
    const three = await sale('2026-11-05T09:00:00Z', { priceCents: 777 });
    const total = one.totalCents + two.totalCents + three.totalCents;
    const a = await get('from=2026-11-01&to=2026-11-07');
    expect(a.revenue.series.map((s) => s.bucket)).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
    ]);
    expect(a.revenue.series[2]).toMatchObject({
      revenueCents: one.totalCents + two.totalCents,
      orders: 2,
    });
    expect(a.revenue.series[4]).toMatchObject({ revenueCents: three.totalCents, orders: 1 });
    expect(a.revenue.series[3]).toMatchObject({ revenueCents: 0, orders: 0 });
    expect(a.revenue.totalCents).toBe(total);
    expect(a.orders).toBe(3);
    expect(a.aovCents).toBe(Math.floor((2 * total + 3) / 6));
  });

  it("uses the shop's calendar day: 23:30 UTC is already the next day in Amsterdam", async () => {
    const late = await sale('2026-11-03T23:30:00Z');
    const a = await get('from=2026-11-03&to=2026-11-05');
    expect(a.revenue.series.map((s) => s.revenueCents)).toEqual([0, late.totalCents, 0]);
    // The range edges are local too: that order is not in a range that ends on the 3rd.
    expect((await get('from=2026-11-01&to=2026-11-03')).orders).toBe(0);
  });

  it('subtracts refunds, and counts a wholly refunded order as an order with no revenue', async () => {
    const partly = await sale('2026-11-03T10:00:00Z');
    const fully = await sale('2026-11-03T11:00:00Z');
    await db.update(orders).set({ refundedCents: 300 }).where(eq(orders.id, partly.id));
    await db
      .update(orders)
      .set({ refundedCents: fully.totalCents, status: 'refunded' })
      .where(eq(orders.id, fully.id));
    const a = await get('from=2026-11-03&to=2026-11-03');
    expect(a.revenue.totalCents).toBe(partly.totalCents - 300);
    expect(a.orders).toBe(2);
    expect(a.aovCents).toBe(Math.floor((2 * (partly.totalCents - 300) + 2) / 4));
  });

  it('leaves the round-up donation out of revenue, and never goes below zero on a full refund', async () => {
    const roundUp = async (o: { id: string; totalCents: number }, cents: number) => {
      // the stored total includes the donation (orders_total_check)
      await db
        .update(orders)
        .set({ donationCents: cents, totalCents: o.totalCents + cents })
        .where(eq(orders.id, o.id));
      return o.totalCents + cents;
    };
    const kept = await sale('2026-11-03T10:00:00Z');
    await roundUp(kept, 40);
    await db.update(orders).set({ refundedCents: 300 }).where(eq(orders.id, kept.id));
    const gone = await sale('2026-11-03T11:00:00Z');
    const goneTotal = await roundUp(gone, 70);
    await db
      .update(orders)
      .set({ refundedCents: goneTotal, status: 'refunded' })
      .where(eq(orders.id, gone.id));
    const a = await get('from=2026-11-03&to=2026-11-03');
    expect(a.revenue.totalCents).toBe(kept.totalCents - 300);
    expect(a.revenue.series[0]?.revenueCents).toBe(kept.totalCents - 300);
  });

  it('ignores orders that were never paid or were cancelled', async () => {
    const waiting = await placeOrder(app, {});
    await db
      .update(orders)
      .set({ placedAt: new Date('2026-11-03T10:00:00Z') })
      .where(eq(orders.number, waiting.number));
    const cancelled = await sale('2026-11-03T10:00:00Z');
    await db.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, cancelled.id));
    expect((await get('from=2026-11-03&to=2026-11-03')).orders).toBe(0);
  });

  it('groups by week (Monday) and by month', async () => {
    const a = await sale('2026-11-04T10:00:00Z'); // a Wednesday
    const b = await sale('2026-11-20T10:00:00Z');
    const weeks = await get('from=2026-11-02&to=2026-11-22&interval=week');
    expect(weeks.revenue.series.map((s) => s.bucket)).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
    ]);
    expect(weeks.revenue.series.map((s) => s.revenueCents)).toEqual([
      a.totalCents,
      0,
      b.totalCents,
    ]);
    const months = await get('from=2026-10-15&to=2026-11-30&interval=month');
    expect(months.revenue.series.map((s) => s.bucket)).toEqual(['2026-10-01', '2026-11-01']);
    expect(months.revenue.series.map((s) => s.revenueCents)).toEqual([
      0,
      a.totalCents + b.totalCents,
    ]);
  });

  it('ranks products by units and by revenue, taking refunded returns back off', async () => {
    const cheap = await createProduct({
      name: 'Cheap Chew',
      variants: [{ priceCents: 100, stock: 50 }],
    });
    const dear = await createProduct({
      name: 'Dear Bed',
      variants: [{ priceCents: 5000, stock: 50 }],
    });
    await sale('2026-11-03T10:00:00Z', { variantId: cheap.variants[0]!.id, quantity: 9 });
    const bed = await sale('2026-11-03T10:00:00Z', {
      variantId: dear.variants[0]!.id,
      quantity: 2,
    });
    const a = await get('from=2026-11-03&to=2026-11-03');
    expect(a.topByUnits.map((p) => [p.name, p.units])).toEqual([
      ['Cheap Chew', 9],
      ['Dear Bed', 2],
    ]);
    expect(a.topByRevenue.map((p) => [p.name, p.revenueCents])).toEqual([
      ['Dear Bed', 10000],
      ['Cheap Chew', 900],
    ]);

    // One bed comes back and is refunded.
    const [line] = await db.select().from(orderItems).where(eq(orderItems.orderId, bed.id));
    const [ret] = await db
      .insert(returns)
      .values({ orderId: bed.id, reason: 'damaged', status: 'refunded', refundCents: 5000 })
      .returning();
    await db.insert(returnItems).values({
      returnId: ret!.id,
      orderItemId: line!.id,
      quantity: 1,
      reason: 'damaged',
      refundCents: 5000,
    });
    const after = await get('from=2026-11-03&to=2026-11-03');
    expect(after.topByUnits.find((p) => p.name === 'Dear Bed')).toMatchObject({
      units: 1,
      revenueCents: 5000,
    });
  });

  it('keeps only the top 10 products', async () => {
    for (let i = 0; i < 12; i += 1) {
      const p = await createProduct({
        name: `Item ${String(i).padStart(2, '0')}`,
        variants: [{ priceCents: 100, stock: 50 }],
      });
      await sale('2026-11-03T10:00:00Z', { variantId: p.variants[0]!.id, quantity: i + 1 });
    }
    const a = await get('from=2026-11-03&to=2026-11-03');
    expect(a.topByUnits).toHaveLength(10);
    expect(a.topByUnits[0]?.name).toBe('Item 11');
  });

  it('lists variants at or below the stock threshold (default 5) by what can be sold', async () => {
    const p = await createProduct({
      name: 'Almost gone',
      variants: [
        { name: 'Low one', priceCents: 100, stock: 3 },
        { name: 'Low two', priceCents: 100, stock: 5 },
        { name: 'Fine three', priceCents: 100, stock: 6 },
      ],
    });
    void p;
    const a = await get('');
    expect(a.lowStock.map((v) => [v.variantName, v.available])).toEqual([
      ['Low one', 3],
      ['Low two', 5],
    ]);
    expect((await get('lowStock=2')).lowStock).toEqual([]);
    // Reserved units are not sellable: 6 in stock, 2 held = 4 available.
    await db.update(inventory).set({ reserved: 2 }).where(eq(inventory.quantity, 6));
    expect((await get('')).lowStock.map((v) => v.variantName)).toContain('Fine three');
  });

  it('computes the returns rate in basis points, half up', async () => {
    const o = await sale('2026-11-03T10:00:00Z', { quantity: 3 });
    await db
      .insert(orderStatusHistory)
      .values({ orderId: o.id, fromStatus: 'shipped', toStatus: 'delivered', actor: 'test' });
    const [line] = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    const back = async (qty: number, status: 'received' | 'refunded' | 'rejected') => {
      const [ret] = await db
        .insert(returns)
        .values({ orderId: o.id, reason: 'damaged', status, refundCents: 0 })
        .returning();
      await db.insert(returnItems).values({
        returnId: ret!.id,
        orderItemId: line!.id,
        quantity: qty,
        reason: 'damaged',
        refundCents: 0,
      });
    };
    await back(1, 'refunded');
    expect((await get('from=2026-11-03&to=2026-11-03')).returns).toEqual({
      returnedUnits: 1,
      deliveredUnits: 3,
      rateBp: 3333,
    });
    await back(1, 'received');
    expect((await get('from=2026-11-03&to=2026-11-03')).returns.rateBp).toBe(6667); // 2/3, rounded up
    await back(1, 'rejected'); // a refused return is not a return
    expect((await get('from=2026-11-03&to=2026-11-03')).returns.returnedUnits).toBe(2);
  });

  it('refuses a range that is too long, backwards, or not a real date, and allows 366 days', async () => {
    const bad = async (qs: string) => (await admin.call('get', `/admin/analytics?${qs}`)).status;
    expect(await bad('from=2025-01-01&to=2026-01-02')).toBe(400); // 367 days
    expect(await bad('from=2025-01-01&to=2026-01-01')).toBe(200); // 366 days
    expect(await bad('from=2026-11-07&to=2026-11-01')).toBe(400);
    expect(await bad('from=2026-02-31&to=2026-03-05')).toBe(400);
    expect(await bad('from=yesterday')).toBe(400);
    expect(await bad('interval=hour')).toBe(400);
    const res = await admin.call('get', '/admin/analytics?from=2025-01-01&to=2026-06-01');
    expect(JSON.stringify(errorOf(res).details)).toContain('at most 366');
  });

  it('defaults to the last 30 days ending today', async () => {
    const a = await get('');
    expect(a.revenue.series).toHaveLength(30);
    expect(a.range.to).toBe(a.revenue.series.at(-1)!.bucket);
  });
});

describe('GET /admin/analytics/export.csv', () => {
  const csv = async (qs: string) => admin.call('get', `/admin/analytics/export.csv?${qs}`);
  const lines = (text: string) => text.split('\r\n').filter(Boolean);

  it('needs an admin and a known report', async () => {
    const customer = await signedIn(app);
    expect(
      (await customer.shopper.call('get', '/admin/analytics/export.csv?report=orders')).status,
    ).toBe(403);
    expect((await csv('report=everything')).status).toBe(400);
  });

  it('exports orders with cents and a formatted column, as an attachment', async () => {
    const o = await sale('2026-11-03T10:00:00Z', { quantity: 2 });
    await db.update(orders).set({ refundedCents: 250 }).where(eq(orders.id, o.id));
    const res = await csv('report=orders&from=2026-11-01&to=2026-11-07');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="orders-2026-11-01-to-2026-11-07.csv"',
    );
    const rows = lines(res.text);
    expect(rows[0]).toBe(
      'order_number,placed_at_utc,status,email,units,total_cents,total,donation_cents,refunded_cents,net_cents,net',
    );
    expect(rows).toHaveLength(2);
    const net = o.totalCents - 250;
    expect(rows[1]).toContain(`,2,${o.totalCents},`);
    expect(
      rows[1]!.endsWith(
        `,0,250,${net},${Math.trunc(net / 100)}.${String(net % 100).padStart(2, '0')}`,
      ),
    ).toBe(true);
    expect(rows[1]).toContain('2026-11-03T10:00:00Z');
  });

  it('streams more orders than one page', async () => {
    const p = await createProduct({ variants: [{ priceCents: 100, stock: 5000 }] });
    const ids: string[] = [];
    for (let i = 0; i < 3; i += 1)
      ids.push((await sale('2026-11-03T10:00:00Z', { variantId: p.variants[0]!.id })).id);
    expect(lines((await csv('report=orders&from=2026-11-03&to=2026-11-03')).text)).toHaveLength(4);
  });

  it('defuses formulas in customer-controlled text (a product named like a formula)', async () => {
    const evil = await createProduct({
      name: '=HYPERLINK("http://evil.test","click")',
      variants: [{ priceCents: 100, stock: 50 }],
    });
    await sale('2026-11-03T10:00:00Z', { variantId: evil.variants[0]!.id });
    const rows = lines((await csv('report=products&from=2026-11-03&to=2026-11-03')).text);
    expect(rows[0]).toBe('product,units,revenue_cents,revenue');
    expect(rows[1]!.startsWith('"\'=HYPERLINK(""http://evil.test"",""click"")"')).toBe(true);
  });

  it('exports low stock with the threshold used', async () => {
    await createProduct({
      name: 'Nearly out',
      variants: [{ name: 'Near one', priceCents: 100, stock: 1 }],
    });
    const rows = lines((await csv('report=low-stock&lowStock=3')).text);
    expect(rows[0]).toBe('sku,product,variant,available,threshold');
    expect(rows[1]).toContain('Nearly out,Near one,1,3');
    expect(rows[1]!.endsWith(',1,3')).toBe(true);
  });
});
