import { and, count, desc, eq, ilike, ne, notLike, or, sql, sum } from 'drizzle-orm';

import { db } from '../../../db/client.ts';
import {
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  users,
} from '../../../db/schema/index.ts';
import { SEEDED_REVIEWER_EMAIL_PATTERNS } from '../../../db/seed/reviewer-emails.ts';

type Status = typeof orders.$inferSelect.status;

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function listOrders(opts: {
  status?: Status | undefined;
  q?: string | undefined;
  page: number;
  limit: number;
}) {
  const conditions = [];
  if (opts.status) conditions.push(eq(orders.status, opts.status));
  if (opts.q) {
    const pattern = likePattern(opts.q);
    // `email` is citext; ILIKE on it works and stays case-insensitive.
    conditions.push(or(ilike(orders.number, pattern), ilike(orders.email, pattern)));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  // Units per order from one grouped subquery, not one query per row.
  const units = db
    .select({ orderId: orderItems.orderId, units: sum(orderItems.quantity).as('units') })
    .from(orderItems)
    .groupBy(orderItems.orderId)
    .as('units');

  const [rows, totals] = await Promise.all([
    db
      .select({
        number: orders.number,
        status: orders.status,
        email: orders.email,
        totalCents: orders.totalCents,
        currency: orders.currency,
        itemCount: units.units,
        paymentStatus: payments.status,
        placedAt: orders.placedAt,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(units, eq(units.orderId, orders.id))
      .leftJoin(payments, eq(payments.orderId, orders.id))
      .where(where)
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit),
    db.select({ n: count() }).from(orders).where(where),
  ]);
  return { rows, total: totals[0]?.n ?? 0 };
}

export async function listHistory(orderId: string) {
  return db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(orderStatusHistory.createdAt, orderStatusHistory.id);
}

export async function findCustomer(userId: string) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(eq(users.id, userId));
  return row;
}

// ---------- customers ----------

// Explicit column list: `select()` would carry `password_hash` into memory and one careless spread
// away from the response. Only what the list shows is ever read.
export async function listCustomers(opts: { q?: string | undefined; page: number; limit: number }) {
  const conditions = [
    eq(users.role, 'customer'),
    ...SEEDED_REVIEWER_EMAIL_PATTERNS.map((p) => notLike(users.email, p)),
  ];
  if (opts.q) {
    const pattern = likePattern(opts.q);
    const search = or(
      ilike(users.email, pattern),
      ilike(users.firstName, pattern),
      ilike(users.lastName, pattern),
      ilike(sql`${users.firstName} || ' ' || ${users.lastName}`, pattern),
    );
    if (search) conditions.push(search);
  }
  const where = and(...conditions);

  const stats = db
    .select({
      userId: orders.userId,
      orderCount: count().as('order_count'),
      lastOrderAt: sql<Date | null>`max(${orders.placedAt})`.as('last_order_at'),
    })
    .from(orders)
    .where(ne(orders.status, 'pending_payment'))
    .groupBy(orders.userId)
    .as('stats');

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        orderCount: stats.orderCount,
        lastOrderAt: stats.lastOrderAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(stats, eq(stats.userId, users.id))
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit),
    db.select({ n: count() }).from(users).where(where),
  ]);
  return { rows, total: totals[0]?.n ?? 0 };
}
