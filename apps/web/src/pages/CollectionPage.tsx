import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { Container } from '../components/layout/Container';
import { Seo, slugAlternates } from '../components/Seo';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { hasActiveFilters, useProductListParams } from '../features/catalog/list-params';
import { ProductListing } from '../features/catalog/ProductListing';
import { useCollection } from '../features/merchandising/queries';
import { useCanonicalSlug } from '../features/stores/useCanonicalSlug';
import { lookupFor, useT, type TFunction } from '../i18n';
import { useFormat } from '../i18n/format';
import { TEST_IDS } from '../lib/test-ids';
import { track } from '../lib/track';

import NotFoundPage from './NotFoundPage';

const defaultT = lookupFor('en-IE').t;

// "Until 2 November" for a seasonal collection; nothing for an evergreen one. The end date is the
// exclusive end of the window, so the last day shown is the day before it.
export function untilLabel(
  endsAt: string | null,
  t: TFunction = defaultT,
  locale = 'en-GB',
): string | null {
  if (!endsAt) return null;
  const lastDay = new Date(new Date(endsAt).getTime() - 24 * 3600 * 1000);
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(lastDay);
  return t('catalog.collection.until', { date });
}

export default function CollectionPage() {
  const { t } = useT();
  const fmt = useFormat();
  const { slug } = useParams();
  const { data: collection, error, isPending, refetch } = useCollection(slug);
  useCanonicalSlug('collections', slug, collection?.slug);
  const { query } = useProductListParams();

  useEffect(() => {
    if (collection) track({ name: 'view_collection', slug: collection.slug });
  }, [collection]);

  // Outside its window the API answers 404, so a finished season is simply "not found".
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage what="collection" />;
  if (error) {
    return (
      <Container className="py-12 text-center" data-testid={TEST_IDS.pageCollection}>
        <Seo title={t('catalog.page.error')} noindex />
        <h1 className="text-3xl font-bold">{t('catalog.collection.loadError')}</h1>
        <Button className="mt-4" onClick={() => void refetch()}>
          {t('catalog.page.tryAgain')}
        </Button>
      </Container>
    );
  }
  if (isPending) {
    return (
      <Container
        className="flex min-h-[70vh] justify-center py-16"
        data-testid={TEST_IDS.pageCollection}
      >
        <Spinner label={t('catalog.collection.loading')} className="h-8 w-8 text-primary-strong" />
      </Container>
    );
  }

  const variant = hasActiveFilters(query) || query.sort !== undefined;
  const until = untilLabel(collection.endsAt, t, fmt.locale);
  return (
    <Container className="py-6" data-testid={TEST_IDS.pageCollection}>
      <Seo
        title={collection.name}
        description={collection.description}
        canonical={`/collections/${collection.slug}`}
        alternates={slugAlternates('collections', collection.slugs)}
        noindex={variant}
      />
      <Breadcrumbs
        items={[{ label: t('catalog.page.home'), to: '/' }, { label: collection.name }]}
      />
      <div
        className="mt-4 rounded-card border-l-8 bg-surface p-6 shadow-card sm:p-8"
        style={{ borderLeftColor: collection.accentColor }}
      >
        <h1 className="break-words font-display text-3xl font-bold sm:text-4xl">
          {collection.name}
        </h1>
        <p className="mt-2 max-w-prose">{collection.description}</p>
        {until && <p className="mt-2 text-sm font-semibold text-muted">{until}</p>}
      </div>
      <div className="mt-6">
        <ProductListing listId={`collection-${collection.slug}`} collection={collection.slug} />
      </div>
    </Container>
  );
}
