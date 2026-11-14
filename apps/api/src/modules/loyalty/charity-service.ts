import { randomUUID } from 'node:crypto';

import type { CharityTotal } from '@store/shared';
import { and, asc, eq, sql } from 'drizzle-orm';

import { db, type Tx } from '../../db/client.ts';
import { charities, donations } from '../../db/schema/index.ts';
import { conflict, notFound } from '../../lib/errors.ts';
import * as checkoutRepo from '../checkout/repo.ts';
import { translateCharity } from '../i18n/content-translations.ts';
import { currentStore } from '../i18n/context.ts';
import {
  onOrderCancelled,
  onOrderPaid,
  onOrderRefunded,
  type OrderCancelledEvent,
  type OrderPaidEvent,
  type OrderRefundedEvent,
} from '../orders/events.ts';

import * as repo from './repo.ts';

// DEMO: the shelter is fictional and no money moves. The numbers are real in the sense that they
// are counted exactly once and reversed with the order; they just do not leave the shop.

type Run = typeof db | Tx;

// The one shelter the shop supports. Picking "the first active one" keeps a future second charity
// (a choice at checkout) a small change rather than a rewrite.
async function activeCharity(run: Run) {
  const [row] = await run
    .select()
    .from(charities)
    .where(eq(charities.active, true))
    .orderBy(asc(charities.createdAt), asc(charities.id))
    .limit(1);
  return row;
}

export async function getTotal(): Promise<CharityTotal> {
  const charity = await activeCharity(db);
  if (!charity) throw notFound('No charity is set up');
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${donations.cents}), 0)::int`,
      count: sql<number>`count(*) filter (where ${donations.cents} > 0)::int`,
    })
    .from(donations)
    // One total per currency, never summed across: the store's own currency.
    .where(
      and(eq(donations.charityId, charity.id), eq(donations.currency, currentStore().currency)),
    );
  const shown = await translateCharity(charity);
  return {
    charity: { slug: shown.slug, name: shown.name, description: shown.description },
    totalCents: Math.max(0, row?.total ?? 0),
    donations: row?.count ?? 0,
  };
}

// Donate points: 1 point = 1 cent. One transaction: lock the user, check the balance, write the
// `donate` ledger row and the `donations` row, so neither exists without the other.
export async function donatePoints(userId: string, points: number) {
  return db.transaction(async (tx) => {
    const charity = await activeCharity(tx);
    if (!charity) throw notFound('No charity is set up');
    await repo.lockUser(tx, userId);
    const { balance } = await repo.standing(tx, userId);
    if (points > balance) {
      throw conflict('CONFLICT', `You have ${Math.max(0, balance)} points to give`);
    }
    const key = randomUUID();
    await repo.insertEntry(tx, {
      userId,
      delta: -points,
      kind: 'donate',
      refKey: `donate:${key}`,
      reason: `Donated to ${charity.name}`,
    });
    await tx.insert(donations).values({
      charityId: charity.id,
      userId,
      cents: points,
      currency: currentStore().currency,
      source: 'points',
      refKey: `points:${key}`,
    });
    return { balance: balance - points, donatedCents: points };
  });
}

// ---------- order event subscribers ----------

// Counted when the order is PAID (a pending order that is never paid donates nothing), once per
// order: the unique `roundup:<orderId>` key makes a repeated event a no-op.
async function recordRoundUp(tx: Tx, { orderId }: OrderPaidEvent): Promise<void> {
  const order = await checkoutRepo.findOrderById(tx, orderId);
  if (!order || order.donationCents <= 0) return;
  const charity = await activeCharity(tx);
  if (!charity) return;
  await tx
    .insert(donations)
    .values({
      charityId: charity.id,
      userId: order.userId,
      orderId,
      cents: order.donationCents,
      currency: order.currency,
      source: 'round_up',
      refKey: `roundup:${orderId}`,
    })
    .onConflictDoNothing({ target: donations.refKey });
}

// A cancelled order, or a refund that hands the round-up back (only a whole-order refund does),
// takes it back with a negative row (the history stays; the total drops). Returns refund goods and
// shipping, never the round-up: it was a gift on top of the goods, so it stays donated even when
// every item comes back through returns.
async function reverseRoundUp(tx: Tx, orderId: string): Promise<void> {
  const [original] = await tx
    .select()
    .from(donations)
    .where(eq(donations.refKey, `roundup:${orderId}`));
  if (!original) return; // never paid, or no round-up
  await tx
    .insert(donations)
    .values({
      charityId: original.charityId,
      userId: original.userId,
      orderId,
      cents: -original.cents,
      currency: original.currency,
      source: 'reversal',
      refKey: `unround:${orderId}`,
    })
    .onConflictDoNothing({ target: donations.refKey });
}

const onCancelled = (tx: Tx, e: OrderCancelledEvent) => reverseRoundUp(tx, e.orderId);
const onRefunded = async (tx: Tx, e: OrderRefundedEvent) => {
  if (e.donationCents > 0) await reverseRoundUp(tx, e.orderId);
};

export function registerCharitySubscribers(): void {
  onOrderPaid(recordRoundUp);
  onOrderCancelled(onCancelled);
  onOrderRefunded(onRefunded);
}
