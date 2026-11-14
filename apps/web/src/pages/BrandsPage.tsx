import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { ChevronRightIcon } from '../components/icons';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { Container } from '../components/layout/Container';
import { Seo } from '../components/Seo';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { BrandMark } from '../features/merchandising/BrandMark';
import { useBrands } from '../features/merchandising/queries';
import { useT } from '../i18n';
import { TEST_IDS } from '../lib/test-ids';
import { track } from '../lib/track';

export default function BrandsPage() {
  const { t, tn } = useT();
  const { data: brands, isPending, isError, refetch } = useBrands();

  useEffect(() => {
    track({ name: 'view_brands' });
  }, []);

  return (
    <Container className="pb-16 pt-6 sm:pb-24" data-testid={TEST_IDS.pageBrands}>
      <Seo
        title={t('catalog.page.brands')}
        description={t('catalog.brands.description')}
        canonical="/brands"
      />
      <Breadcrumbs
        items={[{ label: t('catalog.page.home'), to: '/' }, { label: t('catalog.page.brands') }]}
      />
      <header className="mt-6 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">
          {t('catalog.brands.title')}
        </h1>
        <p className="mt-3 text-lg text-muted">{t('catalog.brands.intro')}</p>
      </header>
      {isError ? (
        <div role="alert" className="mt-10 rounded-card bg-danger-soft p-6 text-danger">
          <p className="font-bold">{t('catalog.brands.loadError')}</p>
          <Button className="mt-4" onClick={() => void refetch()}>
            {t('catalog.page.tryAgain')}
          </Button>
        </div>
      ) : isPending ? (
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-[4/5] w-full rounded-card" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand, i) => (
            <li key={brand.id} className="min-w-0">
              <Link
                to={`/brands/${brand.slug}`}
                data-testid={TEST_IDS.brandCard}
                className="group flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <BrandMark
                  name={brand.name}
                  accentColor={brand.accentColor}
                  logoUrl={brand.logoUrl}
                  eager={i < 3}
                  className="aspect-[5/4] w-full"
                  initialsClassName="text-7xl"
                />
                <span className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
                  <span className="break-words font-display text-2xl font-semibold">
                    {brand.name}
                  </span>
                  <span className="text-muted">{brand.tagline}</span>
                  <span className="mt-auto flex items-center justify-between gap-3 pt-3 text-sm font-semibold">
                    <span className="text-muted">
                      {tn('catalog.productCount', brand.productCount)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary-strong">
                      {t('catalog.brands.shop')}
                      <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
