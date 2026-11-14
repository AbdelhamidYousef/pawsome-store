import { and, eq, sql } from 'drizzle-orm';

import type { Tx } from '../client.ts';
import {
  orderItems,
  orderStatusHistory,
  orders,
  productVariants,
  products,
  returnItems,
  returns,
  users,
} from '../schema/index.ts';

// Phase 22 demo data: about 90 days of invented orders so the analytics charts are not empty, and
// three sample returns (one waiting for a decision, one approved, one refunded). Everything comes
// from a fixed-seed generator, so every run on every machine writes the same rows and re-seeding
// replaces them (the marker in `orders.notes` tells them from real orders).
//
// Deliberately NOT here: payments and stock. These orders are history for the reports; they hold
// no stock, and they belong to made-up guests (and one demo account for the returns) so that
// "first order" codes and trial limits of the demo logins are not used up by them.

export const SALES_MARKER = 'seed:sales';
export const RETURNS_DEMO_EMAIL = 'casey@pawsome.test';
const DAY_MS = 86_400_000;
const DAYS = 90;
const GUESTS = 24;
const ADDRESS = {
  fullName: 'Demo Customer',
  line1: '1 Bone Street',
  city: 'Riga',
  postalCode: 'LV-1010',
  country: 'LV',
};

// Small deterministic generator (mulberry32): same numbers on every run.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Status = 'processing' | 'shipped' | 'delivered' | 'refunded';

export async function seedSales(tx: Tx, opts: { passwordHash: string; now: Date }) {
  // Re-seeding replaces the seeded history (items, history rows and returns go with the order).
  await tx.delete(orders).where(eq(orders.notes, SALES_MARKER));

  const [casey] = await tx
    .insert(users)
    .values({
      email: RETURNS_DEMO_EMAIL,
      firstName: 'Casey',
      lastName: 'Returns',
      role: 'customer',
      passwordHash: opts.passwordHash,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash: opts.passwordHash },
    })
    .returning({ id: users.id });

  const variants = await tx
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      name: productVariants.name,
      priceCents: productVariants.priceCents,
      productName: products.name,
      pet: sql<string>`${products.attributes}->>'pet'`,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(
        eq(products.status, 'active'),
        eq(products.kind, 'simple'),
        eq(productVariants.status, 'active'),
        eq(productVariants.isTrial, false),
        sql`not exists (select 1 from bundle_items b where b.bundle_variant_id = ${productVariants.id})`,
      ),
    )
    .orderBy(productVariants.sku);
  if (variants.length === 0) return;

  const next = rng(2211);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)] as T;
  // A few products sell far more than the rest, so "top products" is a real ranking.
  const popular = variants.slice(0, Math.max(6, Math.floor(variants.length / 10)));
  const byPet = new Map<string, typeof variants>();
  for (const v of variants) byPet.set(v.pet, [...(byPet.get(v.pet) ?? []), v]);

  const plan: {
    placedAt: Date;
    status: Status;
    email: string;
    userId: string | null;
    lines: { variant: (typeof variants)[number]; quantity: number }[];
  }[] = [];
  for (let age = DAYS - 1; age >= 0; age -= 1) {
    const count = Math.floor(next() * 4); // 0..3 orders that day
    for (let n = 0; n < count; n += 1) {
      const placedAt = new Date(
        opts.now.getTime() - age * DAY_MS - Math.floor(next() * 12) * 3_600_000,
      );
      const status: Status =
        age <= 1
          ? 'processing'
          : age <= 5
            ? next() < 0.5
              ? 'shipped'
              : 'delivered'
            : next() < 0.07
              ? 'refunded'
              : 'delivered';
      // One household, one pet: the first line sets the pet and the rest of the basket follows it,
      // so "bought together" history never pairs a dog toy with bird seed.
      const first = next() < 0.45 ? pick(popular) : pick(variants);
      const samePet = byPet.get(first.pet) ?? [first];
      const lines = Array.from({ length: 1 + Math.floor(next() * 3) }, (_, i) => ({
        variant: i === 0 ? first : pick(samePet),
        quantity: 1 + Math.floor(next() * 3),
      }));
      const guest = 1 + Math.floor(next() * GUESTS);
      plan.push({
        placedAt,
        status,
        email: `shopper${String(guest).padStart(2, '0')}@pawsome.test`,
        userId: null,
        lines,
      });
    }
  }

  // The orders that carry the sample returns: Casey's, recent and delivered.
  const caseyOrders = [
    { age: 6, status: 'delivered' as const },
    { age: 12, status: 'delivered' as const },
    { age: 40, status: 'delivered' as const },
  ];
  for (const c of caseyOrders) {
    const first = pick(popular);
    plan.push({
      placedAt: new Date(opts.now.getTime() - c.age * DAY_MS),
      status: c.status,
      email: RETURNS_DEMO_EMAIL,
      userId: casey?.id ?? null,
      lines: [
        { variant: first, quantity: 2 },
        { variant: pick(byPet.get(first.pet) ?? variants), quantity: 1 },
      ],
    });
  }

  const created: { id: string; email: string; status: Status; placedAt: Date }[] = [];
  for (const p of plan) {
    const subtotal = p.lines.reduce((s, l) => s + l.variant.priceCents * l.quantity, 0);
    const shipping = subtotal >= 4900 ? 0 : 490;
    const total = subtotal + shipping;
    const [order] = await tx
      .insert(orders)
      .values({
        userId: p.userId,
        email: p.email,
        status: p.status,
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: total,
        refundedCents: p.status === 'refunded' ? total : 0,
        shippingMethodCode: 'standard',
        shippingMethodName: 'Standard',
        shippingAddress: ADDRESS,
        notes: SALES_MARKER,
        placedAt: p.placedAt,
        createdAt: p.placedAt,
        updatedAt: p.placedAt,
      })
      .returning({ id: orders.id });
    if (!order) continue;
    created.push({ id: order.id, email: p.email, status: p.status, placedAt: p.placedAt });
    await tx.insert(orderItems).values(
      p.lines.map((l) => ({
        orderId: order.id,
        variantId: l.variant.id,
        productName: l.variant.productName,
        variantName: l.variant.name,
        sku: l.variant.sku,
        unitPriceCents: l.variant.priceCents,
        quantity: l.quantity,
        lineTotalCents: l.variant.priceCents * l.quantity,
      })),
    );
    // The history the reports and the return window read: delivered four days after payment.
    type Step = 'pending_payment' | 'paid' | 'shipped' | 'delivered';
    const steps: [Step, Step, number][] = [['pending_payment', 'paid', 0]];
    if (p.status !== 'processing') steps.push(['paid', 'shipped', 2]);
    if (p.status === 'delivered' || p.status === 'refunded')
      steps.push(['shipped', 'delivered', 4]);
    await tx.insert(orderStatusHistory).values(
      steps.map(([from, to, days]) => ({
        orderId: order.id,
        fromStatus: from,
        toStatus: to,
        actor: 'seed',
        createdAt: new Date(p.placedAt.getTime() + days * DAY_MS),
      })),
    );
  }

  // Sample returns on Casey's three orders: requested, approved, refunded (the last one adds to
  // the order's money-handed-back total, like a real refund).
  const mine = created.filter((o) => o.email === RETURNS_DEMO_EMAIL);
  const states = ['requested', 'approved', 'refunded'] as const;
  for (const [i, order] of mine.entries()) {
    const status = states[i];
    if (!status) continue;
    const [line] = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      // By SKU, a stable order: the lines of one order share a created_at (one INSERT) and their ids are
      // random, so ordering by those picked a different line (and refund amount) on every seed run.
      .orderBy(orderItems.sku);
    if (!line) continue;
    const refundCents = line.unitPriceCents; // one unit
    const [ret] = await tx
      .insert(returns)
      .values({
        orderId: order.id,
        userId: casey?.id ?? null,
        status,
        reason: i === 0 ? 'wrong_size' : i === 1 ? 'not_as_described' : 'changed_mind',
        note: i === 0 ? 'It is a bit too small for our beagle.' : null,
        refundCents,
        approvedAt: status === 'requested' ? null : new Date(order.placedAt.getTime() + 8 * DAY_MS),
        receivedAt: status === 'refunded' ? new Date(order.placedAt.getTime() + 12 * DAY_MS) : null,
        refundedAt: status === 'refunded' ? new Date(order.placedAt.getTime() + 13 * DAY_MS) : null,
        refundIntentAt:
          status === 'refunded' ? new Date(order.placedAt.getTime() + 13 * DAY_MS) : null,
        providerRefundId: status === 'refunded' ? `sim_seed_return_${i}` : null,
        simulated: status === 'refunded',
      })
      .returning({ id: returns.id });
    if (!ret) continue;
    await tx.insert(returnItems).values({
      returnId: ret.id,
      orderItemId: line.id,
      quantity: 1,
      reason: i === 0 ? 'wrong_size' : i === 1 ? 'not_as_described' : 'changed_mind',
      refundCents,
    });
    if (status === 'refunded') {
      await tx.update(orders).set({ refundedCents: refundCents }).where(eq(orders.id, order.id));
    }
  }
}
