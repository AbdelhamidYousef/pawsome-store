import { and, asc, eq, isNull, lte, lt, sql } from 'drizzle-orm';
import type { Logger } from 'pino';

import { db, type Tx } from '../../db/client.ts';
import { emailOutbox, orders } from '../../db/schema/index.ts';
import { storeFor } from '../../emails/i18n/index.ts';
import {
  EMAIL_KINDS,
  renderQueuedEmail,
  type EmailKind,
  type EmailPayload,
} from '../../emails/index.ts';
import type { MailTransport } from '../../lib/mailer.ts';
import * as checkoutRepo from '../checkout/repo.ts';
import { productNamesByVariant } from '../i18n/translations.ts';
import { toOrderDto } from '../orders/view.ts';

// ---------------------------------------------------------------------------------------------
// Email outbox.
//
//   write   `enqueueEmail` runs inside the transaction that changes the order status, so "order is
//           paid" and "confirmation is owed" commit together or not at all. A crash can neither
//           lose the email (the row survives) nor send one for a change that rolled back.
//   send    `drain` runs AFTER commit (kicked by whoever committed, and on a timer as a safety
//           net). It claims unsent rows with FOR UPDATE SKIP LOCKED, so two instances never send
//           the same row, sends them, and stamps `sent_at` in the same transaction.
//   retry   a failed send keeps the row, counts the attempt and backs off exponentially.
//
// Guarantee: at-least-once with no loss. The single remaining window is a crash between the SMTP
// server accepting a message and our commit of `sent_at`; the row is then sent again, with the same
// Message-ID so providers and mail clients can recognise the duplicate. Exactly-once delivery over
// SMTP does not exist; this is the honest approximation.
// ---------------------------------------------------------------------------------------------

const MAX_ATTEMPTS = 8;
const BATCH = 10;
const BASE_BACKOFF_MS = 60_000;
const MAX_BACKOFF_MS = 60 * 60_000;

export const backoffMs = (attempts: number): number =>
  Math.min(BASE_BACKOFF_MS * 2 ** (attempts - 1), MAX_BACKOFF_MS);

// Called from inside the transaction that causes the email. `ON CONFLICT DO NOTHING` on the dedupe
// key makes it idempotent: replaying a transition cannot queue a second copy. An order email
// defaults to one per kind and order; anything else (or an order email that can legitimately
// repeat, like a second withdrawal) passes its own `dedupeKey`.
// Order lines carry the English name as a snapshot; the email shows the catalogue name in its own
// language where there is one (read at send time, decisions log "polish fix 5").
async function localizedItems(
  tx: Tx,
  items: checkoutRepo.OrderItemRow[],
  lang: string,
): Promise<checkoutRepo.OrderItemRow[]> {
  const names = await productNamesByVariant(
    items.map((i) => i.variantId),
    lang,
    tx,
  );
  if (names.size === 0) return items;
  return items.map((i) => {
    const name = i.variantId ? names.get(i.variantId) : undefined;
    return name ? { ...i, productName: name } : i;
  });
}

export async function enqueueEmail(
  tx: Tx,
  email: {
    kind: EmailKind;
    to: string;
    orderId?: string;
    payload?: EmailPayload;
    dedupeKey?: string;
    /** Store view to write it for. Defaults to the order's snapshot, then English (eu-en). */
    storeView?: string | undefined;
  },
): Promise<void> {
  const dedupeKey = email.dedupeKey ?? (email.orderId && `${email.kind}:${email.orderId}`);
  if (!dedupeKey) throw new Error(`email "${email.kind}" needs an orderId or a dedupeKey`);
  // The language follows the order (its stored store view, not the admin's request) or the
  // subscriber; anything unknown is the default store, which is English.
  let storeView = email.storeView;
  if (!storeView && email.orderId) {
    const [order] = await tx
      .select({ storeView: orders.storeView })
      .from(orders)
      .where(eq(orders.id, email.orderId));
    storeView = order?.storeView;
  }
  await tx
    .insert(emailOutbox)
    .values({
      kind: email.kind,
      orderId: email.orderId ?? null,
      payload: email.payload ?? null,
      toEmail: email.to,
      dedupeKey,
      storeView: storeFor(storeView).code,
    })
    .onConflictDoNothing({ target: emailOutbox.dedupeKey });
}

export interface DrainResult {
  sent: number;
  failed: number;
  /** Rows marked done without sending because no transport is configured. */
  skipped: number;
}

export interface Outbox {
  /** Sends everything that is due and resolves with the counts. Never rejects on a send failure. */
  drain(): Promise<DrainResult>;
  /** Fire and forget `drain` for the request path: email failure must never fail a webhook. */
  kick(): void;
}

const isEmailKind = (kind: string): kind is EmailKind =>
  (EMAIL_KINDS as readonly string[]).includes(kind);

export function createOutbox(opts: { transport: MailTransport; log: Logger }): Outbox {
  const { transport, log } = opts;

  async function drainOnce(): Promise<DrainResult> {
    const result: DrainResult = { sent: 0, failed: 0, skipped: 0 };
    // One transaction holds the claimed rows while their mail is sent. Only outbox rows are
    // locked (never stock or orders), and the transport has connection/socket timeouts.
    await db.transaction(async (tx) => {
      const due = await tx
        .select()
        .from(emailOutbox)
        .where(
          and(
            isNull(emailOutbox.sentAt),
            lt(emailOutbox.attempts, MAX_ATTEMPTS),
            lte(emailOutbox.nextAttemptAt, sql`now()`),
          ),
        )
        .orderBy(asc(emailOutbox.createdAt), asc(emailOutbox.id))
        .limit(BATCH)
        .for('update', { skipLocked: true });

      for (const row of due) {
        const done = async (error: string | null) =>
          tx
            .update(emailOutbox)
            .set({ sentAt: new Date(), lastError: error })
            .where(eq(emailOutbox.id, row.id));
        const retryLater = async (error: string) => {
          const attempts = row.attempts + 1;
          await tx
            .update(emailOutbox)
            .set({
              attempts,
              lastError: error,
              nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
            })
            .where(eq(emailOutbox.id, row.id));
          if (attempts >= MAX_ATTEMPTS) {
            log.error({ outboxId: row.id, kind: row.kind, error }, 'email gave up after retries');
          }
        };

        if (!transport.enabled) {
          log.warn({ outboxId: row.id, kind: row.kind }, 'email skipped: no mail transport');
          await done('skipped: no mail transport configured');
          result.skipped += 1;
          continue;
        }
        try {
          if (!isEmailKind(row.kind)) throw new Error(`unknown email kind "${row.kind}"`);
          // A plain read, not FOR UPDATE: the order lock must not be held while SMTP is slow.
          const order = row.orderId ? await checkoutRepo.findOrderById(tx, row.orderId) : undefined;
          if (row.orderId && !order) throw new Error('order no longer exists');
          const dto = order
            ? toOrderDto(
                order,
                await localizedItems(
                  tx,
                  await checkoutRepo.listOrderItems(tx, order.id),
                  storeFor(row.storeView).lang,
                ),
                await checkoutRepo.findPaymentByOrder(tx, order.id),
              )
            : null;
          const email = renderQueuedEmail(row.kind, dto, row.payload, row.storeView);
          await transport.send({
            to: row.toEmail,
            ...email,
            messageId: `<${row.id}@pawsome.local>`,
          });
          await done(null);
          result.sent += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          log.warn({ outboxId: row.id, kind: row.kind, err: message }, 'email send failed');
          await retryLater(message);
          result.failed += 1;
        }
      }
    });
    return result;
  }

  // Drains are chained in-process so a kick during a running drain waits its turn instead of
  // racing it (the SKIP LOCKED claim would make that safe anyway; this keeps it tidy and makes
  // `await outbox.drain()` in a test mean "everything due when I called has been attempted").
  let tail: Promise<unknown> = Promise.resolve();
  const drain = (): Promise<DrainResult> => {
    const run = tail.then(drainOnce, drainOnce);
    tail = run.catch(() => undefined);
    return run;
  };

  return {
    drain,
    kick: () => {
      drain().catch((err: unknown) => {
        log.error({ err }, 'email outbox drain crashed');
      });
    },
  };
}

// Retry safety net inside the API process, like the reservation sweeper: picks up rows whose
// kick was lost (process restarted before it ran) and rows waiting out a backoff.
export function startOutboxDrainer(opts: { outbox: Outbox; log: Logger; intervalMs?: number }): {
  stop: () => void;
} {
  const every = setInterval(() => opts.outbox.kick(), opts.intervalMs ?? 30_000);
  const first = setTimeout(() => opts.outbox.kick(), 5_000);
  every.unref();
  first.unref();
  return {
    stop: () => {
      clearInterval(every);
      clearTimeout(first);
    },
  };
}
