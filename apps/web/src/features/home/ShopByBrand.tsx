import type { Brand } from '@store/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Skeleton } from '../../components/ui/Skeleton';
import { useT } from '../../i18n';
import { brandInitials } from '../merchandising/BrandMark';
import { useBrands } from '../merchandising/queries';

// Brand artwork lives at a fixed path per slug (`/brands/<slug>.webp`), so the row can show it
// even before the seed fills `logoUrl`; a missing file falls back to the initials.
function logoFor(brand: Brand): string {
  return brand.logoUrl || `/brands/${brand.slug}.webp`;
}

// A white disc with a thin ring in the brand's own colour; the logo artwork (a mark on white)
// sits inside it, or the brand's initials in its colour while the artwork is missing.
function BrandBadge({ brand }: { brand: Brand }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="relative block aspect-square w-full overflow-hidden rounded-full border-2 bg-surface shadow-card transition-transform duration-300 ease-out group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
      style={{ borderColor: brand.accentColor }}
    >
      {failed ? (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center font-display text-3xl font-semibold tracking-wide"
          style={{ color: brand.accentColor }}
        >
          {brandInitials(brand.name)}
        </span>
      ) : (
        <img
          src={logoFor(brand)}
          alt=""
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full scale-[1.04] object-contain"
        />
      )}
    </span>
  );
}

const ITEM = 'w-[8.5rem] shrink-0 snap-start sm:w-40 lg:w-auto';

export function ShopByBrand() {
  const { t } = useT();
  const { data, isPending, isError } = useBrands();
  if (isError || (data && data.length === 0)) return null;
  return (
    <section aria-labelledby="home-brands-heading" data-testid="shop-by-brand">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-2 lg:mb-10">
        <h2 id="home-brands-heading" className="text-[1.75rem] font-bold leading-tight sm:text-4xl">
          {t('shell.home.brands.title')}
        </h2>
        <Link
          to="/brands"
          className="inline-flex min-h-11 items-center rounded-control font-semibold text-primary-strong underline underline-offset-2"
        >
          {t('shell.nav.allBrands')}
        </Link>
      </div>
      {/* Phones and tablets: one swipeable row, the next badge peeking at the edge. Desktop: a
          grid of six per row, as many rows as there are brands. */}
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-6 lg:gap-x-8 lg:gap-y-10 lg:overflow-visible lg:px-0 lg:pb-0">
        {isPending
          ? Array.from({ length: 6 }, (_, i) => (
              <li key={i} aria-hidden="true" className={ITEM}>
                <Skeleton className="aspect-square w-full rounded-full" />
              </li>
            ))
          : data.map((brand) => (
              <li key={brand.slug} className={ITEM}>
                <Link
                  to={`/brands/${brand.slug}`}
                  data-testid="home-brand"
                  className="group flex flex-col items-center gap-3 rounded-card text-center"
                >
                  <BrandBadge brand={brand} />
                  <span className="text-balance text-sm font-semibold text-ink group-hover:underline sm:text-base">
                    {t('shell.home.brands.view', { brand: brand.name })}
                    <span aria-hidden="true">{'\u00a0→'}</span>
                  </span>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}
