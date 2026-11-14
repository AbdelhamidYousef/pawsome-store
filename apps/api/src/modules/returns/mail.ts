import type { Tx } from '../../db/client.ts';
import { storeFor } from '../../emails/i18n/index.ts';
import type { ReturnEmailKind, ReturnEmailPayload } from '../../emails/return-update.ts';
import type * as checkoutRepo from '../checkout/repo.ts';
import { productNamesByVariant } from '../i18n/translations.ts';
import { enqueueEmail } from '../mail/outbox.ts';

import type { ReturnItemWithLine, ReturnRow } from './repo.ts';

// What every return email is rendered from. Names and amounts are copied now: the outbox stores
// data, not HTML, and a later catalogue edit must not rewrite an email already promised.
export function returnEmailPayload(
  order: checkoutRepo.OrderRow,
  ret: ReturnRow,
  items: ReturnItemWithLine[],
): ReturnEmailPayload {
  return {
    firstName: order.shippingAddress.fullName.trim().split(/\s+/)[0] || 'there',
    orderNumber: order.number,
    returnId: ret.id,
    currency: order.currency,
    refundCents: ret.refundCents,
    items: items
      .filter((i) => i.returnId === ret.id)
      .map((i) => ({ name: i.productName, quantity: i.quantity })),
    rejectReason: ret.rejectReason,
    simulated: ret.simulated,
  };
}

// Queued inside the transaction that changes the return, one per kind and return (dedupe key), so
// a replayed action can never send a second copy.
export async function queueReturnEmail(
  tx: Tx,
  kind: ReturnEmailKind,
  order: checkoutRepo.OrderRow,
  ret: ReturnRow,
  items: ReturnItemWithLine[],
): Promise<void> {
  // Line names in the order's language (the lines keep the English snapshot).
  const names = await productNamesByVariant(
    items.map((i) => i.variantId),
    storeFor(order.storeView).lang,
    tx,
  );
  const localized = items.map((i) => {
    const name = i.variantId ? names.get(i.variantId) : undefined;
    return name ? { ...i, productName: name } : i;
  });
  await enqueueEmail(tx, {
    kind,
    to: order.email,
    orderId: order.id,
    payload: returnEmailPayload(order, ret, localized),
    dedupeKey: `${kind}:${ret.id}`,
  });
}
