import type { Testimonial } from '@store/shared';
import { Link } from 'react-router-dom';

import { Skeleton } from '../../components/ui/Skeleton';
import { useT, type StringKey } from '../../i18n';
import { useFormat } from '../../i18n/format';
import { GuideCard } from '../guides/GuideCard';
import { useGuides } from '../guides/queries';

import { HERO_BOX } from './HeroCarousel';
import { HeartHandIcon, LeafIcon, ReturnIcon, ShieldIcon, StarIcon, TruckIcon } from './icons';
import { useTestimonials } from './queries';

export function HeroSkeleton() {
  return (
    <div aria-hidden="true" data-testid="hero-skeleton" className={`bg-primary-soft ${HERO_BOX}`} />
  );
}

// Static promises the shop already keeps (free delivery from the seeded standard method, the
// happy-tail promise); each is a short line so the strip stays one tidy row on desktop.
const TRUST: readonly { title: StringKey; text: StringKey; Icon: typeof TruckIcon }[] = [
  {
    title: 'shell.home.trust.deliveryTitle',
    text: 'shell.home.trust.deliveryText',
    Icon: TruckIcon,
  },
  {
    title: 'shell.home.trust.promiseTitle',
    text: 'shell.home.trust.promiseText',
    Icon: HeartHandIcon,
  },
  { title: 'shell.home.trust.safeTitle', text: 'shell.home.trust.safeText', Icon: LeafIcon },
  {
    title: 'shell.home.trust.checkoutTitle',
    text: 'shell.home.trust.checkoutText',
    Icon: ShieldIcon,
  },
];

export function TrustBar() {
  const { t } = useT();
  return (
    <section
      aria-label={t('shell.home.trust.label')}
      data-testid="trust-bar"
      className="border-b border-line bg-surface"
    >
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:gap-8 lg:px-8 lg:py-7">
        {TRUST.map(({ title, text, Icon }) => (
          <li key={title} className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
              <Icon width={22} height={22} />
            </span>
            <span className="min-w-0">
              <span className="block font-display font-semibold leading-snug">{t(title)}</span>
              <span className="block text-sm leading-snug text-muted">{t(text)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// The little row of promises inside the hero: the real average rating (once it has loaded),
// free delivery and returns. Short on purpose: the full trust strip sits right below the hero.
export function HeroTrust() {
  const { t } = useT();
  const format = useFormat();
  const { data } = useTestimonials();
  const average = data?.meta.average;
  const item = 'flex items-center gap-1.5';
  return (
    <ul className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-semibold text-ink md:mt-2">
      {average != null && (
        <li className={item}>
          <StarIcon width={18} height={18} className="text-star" />
          {t('shell.home.hero.rating', {
            average: format.number(average, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          })}
        </li>
      )}
      <li className={item}>
        <TruckIcon width={18} height={18} className="text-pet-strong" />
        {t('shell.home.hero.delivery')}
      </li>
      <li className={item}>
        <ReturnIcon width={18} height={18} className="text-pet-strong" />
        {t('shell.home.hero.returns')}
      </li>
    </ul>
  );
}

export function PromoTile({
  tile,
}: {
  tile: { text: string | null; linkLabel: string | null; linkHref: string | null };
}) {
  const { t } = useT();
  const { text, linkLabel, linkHref } = tile;
  if (!text) return null;
  return (
    <section
      aria-label={t('shell.home.offer')}
      data-testid="promo-tile"
      className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:gap-6 sm:px-8"
    >
      <span
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong"
      >
        <TruckIcon width={28} height={28} />
      </span>
      <p className="max-w-prose flex-1 font-display text-lg font-semibold leading-snug text-ink sm:text-xl">
        {text}
      </p>
      {linkLabel && linkHref && (
        <Link
          to={linkHref}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border-2 border-ink px-5 font-display font-semibold text-ink transition-colors hover:bg-primary-soft"
        >
          {linkLabel}
        </Link>
      )}
    </section>
  );
}

const GUIDES_SHOWN = 3;

export function GuidesTeaser() {
  const { t } = useT();
  const { data, isPending, isError } = useGuides({ limit: GUIDES_SHOWN });
  if (isError || (data && data.data.length === 0)) return null;
  return (
    <section aria-labelledby="home-guides-heading" data-testid="guides-teaser">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <h2
          id="home-guides-heading"
          className="text-[1.75rem] font-semibold leading-tight sm:text-4xl"
        >
          {t('shell.home.guides.title')}
        </h2>
        <Link
          to="/guides"
          className="min-h-11 rounded-control font-semibold text-primary-strong underline underline-offset-2"
        >
          {t('shell.home.guides.all')}
        </Link>
      </div>
      {isPending ? (
        <div aria-hidden="true" className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: GUIDES_SHOWN }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-card" />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {data.data.slice(0, GUIDES_SHOWN).map((g) => (
            <GuideCard key={g.slug} guide={g} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-hidden="true" className="text-lg tracking-wider text-primary-strong">
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

function TestimonialCard({ t: item }: { t: Testimonial }) {
  const { t } = useT();
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-surface p-5">
      <Stars rating={item.rating} />
      <span className="sr-only">{t('shell.home.stars', { rating: item.rating })}</span>
      <blockquote className="text-ink">{t('shell.home.quote', { quote: item.quote })}</blockquote>
      <p className="mt-auto text-sm text-muted">
        <span className="font-semibold text-ink">{item.name}</span>
        {t('shell.home.withPet', { pet: item.pet })}
      </p>
    </li>
  );
}

export function Testimonials() {
  const { t, tn } = useT();
  const format = useFormat();
  const { data, isPending, isError } = useTestimonials();
  if (isError || (data && data.data.length === 0)) return null;
  return (
    <section aria-labelledby="home-testimonials-heading" data-testid="testimonials">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2
          id="home-testimonials-heading"
          className="text-[1.75rem] font-semibold leading-tight sm:text-4xl"
        >
          {t('shell.home.happyTails')}
        </h2>
        <p className="min-h-6 text-muted" data-testid="rating-summary">
          {data?.meta.average != null &&
            tn('shell.home.ratingSummary', data.meta.count, {
              average: format.number(data.meta.average, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
            })}
        </p>
      </div>
      {isPending ? (
        <div aria-hidden="true" className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-card" />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {data.data.slice(0, 3).map((item) => (
            <TestimonialCard key={item.id} t={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
