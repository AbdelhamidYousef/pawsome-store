import { z } from 'zod';

import { env } from '../config/env.ts';

import type { EmailText } from './i18n/index.ts';
import { escapeHtml, paragraph, shell, type Email } from './layout.ts';

export const VET_EMAIL_KINDS = ['vet_held', 'vet_approved', 'vet_rejected'] as const;
export type VetEmailKind = (typeof VET_EMAIL_KINDS)[number];

export const VetEmailPayloadSchema = z.object({
  firstName: z.string(),
  orderNumber: z.string(),
  reason: z.string().nullish(),
  simulated: z.boolean().optional(),
});
export type VetEmailPayload = z.infer<typeof VetEmailPayloadSchema>;

// The three messages of the (simulated) vet check. No vet is ever emailed; the test-mode notice
// lives in the shared email footer, so the body reads like a real shop's. The reject reason is free text from the admin, so it is escaped in the HTML.
export function vetUpdate(
  kind: VetEmailKind,
  rawPayload: Record<string, unknown> | null,
  x: EmailText,
): Email {
  const p = VetEmailPayloadSchema.parse(rawPayload);
  const url = x.url(env.WEB_ORIGIN, `/account/orders/${encodeURIComponent(p.orderNumber)}`);
  const v = { number: p.orderNumber };
  const copy: Record<VetEmailKind, { subject: string; heading: string; lines: string[] }> = {
    vet_held: {
      subject: x.t('vet.held.subject', v),
      heading: x.t('vet.held.heading'),
      lines: [x.t('vet.held.l1', v), x.t('vet.held.l2')],
    },
    vet_approved: {
      subject: x.t('vet.approved.subject', v),
      heading: x.t('vet.approved.heading'),
      lines: [x.t('vet.approved.l1', v)],
    },
    vet_rejected: {
      subject: x.t('vet.rejected.subject', v),
      heading: x.t('vet.rejected.heading'),
      lines: [
        x.t('vet.rejected.l1', v),
        p.reason ? x.t('vet.rejected.reason', { reason: p.reason }) : '',
        p.simulated ? x.t('vet.rejected.simulated') : x.t('vet.rejected.real'),
      ].filter(Boolean),
    },
  };
  const c = copy[kind];
  const text = [
    x.t('mail.hello', { name: p.firstName }),
    '',
    ...c.lines.flatMap((l) => [l, '']),
    x.t('mail.orderLine', { url }),
    '',
    x.t('mail.signoff'),
  ].join('\n');
  const html = shell(x, {
    preheader: c.subject,
    heading: c.heading,
    body: [
      paragraph(escapeHtml(x.t('mail.hello', { name: p.firstName }))),
      ...c.lines.map((l) => paragraph(escapeHtml(l))),
      paragraph(`<a href="${escapeHtml(url)}">${escapeHtml(x.t('mail.seeOrder'))}</a>`),
    ].join('\n'),
  });
  return { subject: c.subject, text, html };
}
