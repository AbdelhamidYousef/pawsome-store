import type { Testimonial } from '@store/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Skeleton } from '../../components/ui/Skeleton';
import { useT, type StringKey } from '../../i18n';
import { useFormat } from '../../i18n/format';
import { GuideCard } from '../guides/GuideCard';
import { useGuides } from '../guides/queries';

import { useFreeDeliveryAmount } from './free-delivery';
import { HERO_BOX } from './HeroCarousel';
import { HeartHandIcon, LeafIcon, ReturnIcon, ShieldIcon, StarIcon, TruckIcon } from './icons';
import { useTestimonials } from './queries';

export function HeroSkeleton() {
  return (
    <div aria-hidden="true" data-testid="hero-skeleton" className={`bg-primary-soft ${HERO_BOX}`} />
  );
}

// Static promises the shop already keeps (free delivery from the seeded standard method, the
// happy-tail promise). Each has a flat two-tone spot illustration in /public/usp; until a file
// exists (or if it fails) the line icon in a tinted circle stands in, at the same size.
const TRUST: readonly {
  slug: string;
  title: StringKey;
  text: StringKey;
  Icon: typeof TruckIcon;
}[] = [
  {
    slug: 'free-delivery',
    title: 'shell.home.trust.deliveryTitle',
    text: 'shell.home.trust.deliveryText',
    Icon: TruckIcon,
  },
  {
    slug: 'happy-tail-promise',
    title: 'shell.home.trust.promiseTitle',
    text: 'shell.home.trust.promiseText',
    Icon: HeartHandIcon,
  },
  {
    slug: 'pet-safe-picks',
    title: 'shell.home.trust.safeTitle',
    text: 'shell.home.trust.safeText',
    Icon: LeafIcon,
  },
  {
    slug: 'secure-checkout',
    title: 'shell.home.trust.checkoutTitle',
    text: 'shell.home.trust.checkoutText',
    Icon: ShieldIcon,
  },
];

function TrustArt({ slug, Icon }: { slug: string; Icon: typeof TruckIcon }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary-strong lg:h-24 lg:w-24">
        <Icon width={36} height={36} />
      </span>
    );
  }
  return (
    <img
      src={`/usp/${slug}.webp`}
      alt=""
      width={96}
      height={96}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-20 w-20 object-contain lg:h-24 lg:w-24"
    />
  );
}

export function TrustBar() {
  const { t } = useT();
  const amount = useFreeDeliveryAmount();
  return (
    <section
      aria-label={t('shell.home.trust.label')}
      data-testid="trust-bar"
      className="border-b border-line bg-surface"
    >
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-8 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:gap-8 lg:px-8 lg:py-10">
        {TRUST.map(({ slug, title, text, Icon }) => (
          <li key={slug} className="flex min-w-0 flex-col items-center gap-3 text-center">
            <TrustArt slug={slug} Icon={Icon} />
            <span className="min-w-0">
              <span className="block font-display text-lg font-semibold leading-snug">
                {t(title)}
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-muted">
                {t(text, { amount })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// The little row of promises inside the hero: the real average rating (once it has loaded) and
// returns (free delivery has the announcement bar above the header). Short on purpose: the full trust strip sits right below the hero.
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
        <ReturnIcon width={18} height={18} className="text-pet-strong" />
        {t('shell.home.hero.returns')}
      </li>
    </ul>
  );
}

const GUIDES_SHOWN = 3;

export function GuidesTeaser() {
  const { t } = useT();
  const { data, isPending, isError } = useGuides({ limit: GUIDES_SHOWN });
  if (isError || (data && data.data.length === 0)) return null;
  return (
    <section aria-labelledby="home-guides-heading" data-testid="guides-teaser">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h2 id="home-guides-heading" className="text-[1.75rem] font-bold leading-tight sm:text-4xl">
          {t('shell.home.guides.title')}
        </h2>
        <Link
          to="/guides"
          className="inline-flex min-h-11 items-center rounded-control font-semibold text-primary-strong underline underline-offset-2"
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
          className="text-[1.75rem] font-bold leading-tight sm:text-4xl"
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
