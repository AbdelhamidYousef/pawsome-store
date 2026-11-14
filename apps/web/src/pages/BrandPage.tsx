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
import { BrandMark } from '../features/merchandising/BrandMark';
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
    <Container className="pb-16 pt-6 sm:pb-24" data-testid={TEST_IDS.pageBrand}>
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
      <section
        aria-labelledby="brand-title"
        className="mt-6 rounded-card p-6 sm:p-10"
        style={{ backgroundColor: `color-mix(in srgb, ${brand.accentColor} 14%, white)` }}
      >
        <div className="grid items-center gap-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <BrandMark
            name={brand.name}
            accentColor={brand.accentColor}
            logoUrl={brand.logoUrl}
            eager
            className="aspect-square w-28 rounded-card shadow-card sm:w-36 md:w-full"
            initialsClassName="text-5xl md:text-7xl"
          />
          <div className="min-w-0">
            <h1
              id="brand-title"
              className="break-words font-display text-4xl font-semibold sm:text-5xl"
            >
              {brand.name}
            </h1>
            <p className="mt-2 text-lg font-semibold text-ink/80">{brand.tagline}</p>
            {brand.story && (
              <>
                <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-muted">
                  {t('catalog.brand.storyTitle')}
                </h2>
                <p className="mt-2 max-w-prose text-lg leading-relaxed">{brand.story}</p>
              </>
            )}
          </div>
        </div>
      </section>
      <div className="mt-10 sm:mt-14">
        <ProductListing listId={`brand-${brand.slug}`} brand={brand.slug} />
      </div>
    </Container>
  );
}
