import type { GuideCard as GuideCardData } from '@store/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ChevronRightIcon, PawIcon, PetGlyph } from '../../components/icons';
import { useT } from '../../i18n';
import { cn } from '../../lib/cn';
import { petBySlug } from '../../lib/pets';
import { TEST_IDS } from '../../lib/test-ids';

interface CoverProps {
  coverUrl: string | null;
  categorySlug: string;
  className?: string;
  eager?: boolean;
}

// The guide's 16:9 cover, or (none yet, or it failed to load) a block in its category's pet colour
// with the pet glyph. Decorative: the title always sits next to it.
export function GuideCover({ coverUrl, categorySlug, className, eager = false }: CoverProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const pet = petBySlug(categorySlug);
  const show = coverUrl !== null && coverUrl !== '' && failedUrl !== coverUrl;
  return (
    <div
      data-pet={pet?.accent}
      className={cn('relative aspect-[16/9] w-full overflow-hidden bg-pet-soft', className)}
    >
      {show ? (
        <img
          src={coverUrl}
          alt=""
          width={1600}
          height={900}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailedUrl(coverUrl)}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_75%_20%,var(--pet-accent),transparent_55%)] text-pet-strong"
        >
          {pet ? (
            <PetGlyph icon={pet.icon} className="h-1/3 w-auto opacity-80" strokeWidth={1.5} />
          ) : (
            <PawIcon className="h-1/3 w-auto opacity-80" />
          )}
        </span>
      )}
    </div>
  );
}

// One link per card (a single tap target, one tab stop), like the product card. `featured` is the
// wide lead card on the guides index: cover left, text right from lg up.
export function GuideCard({
  guide,
  featured = false,
  eager = false,
}: {
  guide: GuideCardData;
  featured?: boolean;
  eager?: boolean;
}) {
  const { t } = useT();
  return (
    <li className={cn('min-w-0', featured && 'sm:col-span-2 lg:col-span-3')}>
      <Link
        to={`/guides/${guide.slug}`}
        data-testid={TEST_IDS.guideCard}
        className={cn(
          'group flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          featured && 'lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]',
        )}
      >
        <GuideCover
          coverUrl={guide.coverUrl}
          categorySlug={guide.category.slug}
          eager={eager || featured}
          className={cn(featured && 'lg:aspect-auto lg:h-full lg:min-h-[22rem]')}
        />
        <span
          className={cn(
            'flex flex-1 flex-col gap-2 p-5 sm:p-6',
            featured && 'lg:justify-center lg:gap-3 lg:p-10',
          )}
        >
          <span className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="font-semibold text-primary-strong">{guide.category.name}</span>
            <span aria-hidden className="text-muted">
              &middot;
            </span>
            <span className="text-muted">
              {t('content.guides.minRead', { minutes: guide.readingMinutes })}
            </span>
          </span>
          <span
            className={cn(
              'break-words font-display text-xl font-semibold leading-snug',
              featured && 'lg:text-4xl lg:leading-tight',
            )}
          >
            {guide.title}
          </span>
          <span className={cn('text-muted', featured && 'lg:text-lg')}>{guide.summary}</span>
          {featured && (
            <span className="mt-2 inline-flex items-center gap-1 font-semibold text-primary-strong">
              {t('content.guides.read')}
              <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
