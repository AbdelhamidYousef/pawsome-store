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
import { useBrand } from '../features/merchandising/queries';
import { useCanonicalSlug } from '../features/stores/useCanonicalSlug';
import { useT } from '../i18n';
import { TEST_IDS } from '../lib/test-ids';
import { track } from '../lib/track';

import NotFoundPage from './NotFoundPage';

export default function BrandPage() {
  const { t } = useT();
  const { slug } = useParams();
  const { data: brand, error, isPending, refetch } = useBrand(slug);
  useCanonicalSlug('brands', slug, brand?.slug);
  const { query } = useProductListParams();

  useEffect(() => {
    if (brand) track({ name: 'view_brand', slug: brand.slug });
  }, [brand]);

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage what="brand" />;
  if (error) {
    return (
      <Container className="py-12 text-center" data-testid={TEST_IDS.pageBrand}>
        <Seo title={t('catalog.page.error')} noindex />
        <h1 className="text-3xl font-bold">{t('catalog.brand.loadError')}</h1>
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
        data-testid={TEST_IDS.pageBrand}
      >
        <Spinner label={t('catalog.brand.loading')} className="h-8 w-8 text-primary-strong" />
      </Container>
    );
  }

  const variant = hasActiveFilters(query) || query.sort !== undefined;
  return (
    <Container className="py-6" data-testid={TEST_IDS.pageBrand}>
      <Seo
        title={brand.name}
        description={brand.tagline}
        canonical={`/brands/${brand.slug}`}
        alternates={slugAlternates('brands', brand.slugs)}
        noindex={variant}
      />
      <Breadcrumbs
        items={[
          { label: t('catalog.page.home'), to: '/' },
          { label: t('catalog.page.brands'), to: '/brands' },
          { label: brand.name },
        ]}
      />
      <div
        className="mt-4 rounded-card border-l-8 bg-surface p-6 shadow-card sm:p-8"
        style={{ borderLeftColor: brand.accentColor }}
      >
        <h1 className="break-words font-display text-3xl font-bold sm:text-4xl">{brand.name}</h1>
        <p className="mt-1 font-semibold text-muted">{brand.tagline}</p>
        {brand.story && <p className="mt-3 max-w-prose">{brand.story}</p>}
      </div>
      <div className="mt-6">
        <ProductListing listId={`brand-${brand.slug}`} brand={brand.slug} />
      </div>
    </Container>
  );
}
