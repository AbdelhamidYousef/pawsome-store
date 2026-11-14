import { Link } from 'react-router-dom';

import type { StringKey } from '../../i18n';
import { useT } from '../../i18n';

import { NewsletterForm } from './NewsletterForm';

const PERKS: readonly StringKey[] = [
  'loyalty.newsletter.perkTips',
  'loyalty.newsletter.perkNew',
  'loyalty.newsletter.perkEasy',
];

// The homepage's `newsletter` slot (registered in features/home/builtin-slots.ts). A pastel band
// split in two: the pitch and its perks on the left, the form in a white card on the right
// (stacked on phones), so the band never has copy hugging one side and empty space on the other.
export function NewsletterSlot() {
  const { t } = useT();
  return (
    <section
      aria-labelledby="newsletter-heading"
      className="overflow-hidden rounded-card bg-primary-soft"
    >
      <div className="grid items-center gap-8 px-5 py-8 sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14">
        <div className="min-w-0">
          <h2
            id="newsletter-heading"
            className="font-display text-3xl font-bold leading-tight sm:text-4xl"
          >
            {t('loyalty.newsletter.slotTitle')}
          </h2>
          <ul className="mt-6 flex flex-col gap-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-lg">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-primary-strong"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" focusable="false">
                    <path
                      d="M5 12.5l4.2 4.2L19 7"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {t(perk)}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-prose text-sm text-muted">
            {t('loyalty.newsletter.slotText')}{' '}
            <Link to="/privacy" className="font-semibold text-primary-strong underline">
              {t('loyalty.newsletter.privacyLink')}
            </Link>
            .
          </p>
        </div>
        <div className="min-w-0 rounded-card bg-surface p-5 shadow-card sm:p-8">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
