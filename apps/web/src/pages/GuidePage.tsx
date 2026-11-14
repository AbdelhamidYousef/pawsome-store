import type { GuideDetail } from '@store/shared';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import { ChevronRightIcon } from '../components/icons';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { Container } from '../components/layout/Container';
import { Seo } from '../components/Seo';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ProductGrid } from '../features/catalog/ProductGrid';
import { GuideCard, GuideCover } from '../features/guides/GuideCard';
import { MarkdownBody } from '../features/guides/MarkdownBody';
import { useGuide } from '../features/guides/queries';
import { useCanonicalSlug } from '../features/stores/useCanonicalSlug';
import { useT } from '../i18n';
import { useFormat } from '../i18n/format';
import { TEST_IDS } from '../lib/test-ids';
import { track } from '../lib/track';

import NotFoundPage from './NotFoundPage';

export default function GuidePage() {
  const { slug } = useParams();
  const { t } = useT();
  const { data: guide, error, isPending, refetch } = useGuide(slug);
  useCanonicalSlug('guides', slug, guide?.slug);

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage what="guide" />;
  if (error) {
    return (
      <Container className="py-12 text-center" data-testid={TEST_IDS.pageGuide}>
        <Seo title={t('content.guides.errorTitle')} noindex />
        <h1 className="text-3xl font-bold">{t('content.guides.loadError')}</h1>
        <Button className="mt-4" onClick={() => void refetch()}>
          {t('content.guides.retry')}
        </Button>
      </Container>
    );
  }
  if (isPending) {
    return (
      <Container className="py-8" data-testid={TEST_IDS.pageGuide} aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-6 h-64 w-full max-w-prose" />
      </Container>
    );
  }
  return <GuideView guide={guide} />;
}

function GuideView({ guide }: { guide: GuideDetail }) {
  const { t } = useT();
  const fmt = useFormat();
  const date = new Intl.DateTimeFormat(fmt.locale, { dateStyle: 'long', timeZone: 'UTC' });
  useEffect(() => {
    track({ name: 'view_guide', slug: guide.slug, category: guide.category.slug });
  }, [guide.slug, guide.category.slug]);

  return (
    <Container className="pb-16 pt-6 sm:pb-24" data-testid={TEST_IDS.pageGuide}>
      <Seo
        title={guide.title}
        description={guide.summary}
        type="article"
        publishedAt={guide.publishedAt}
        {...(guide.coverUrl && { image: guide.coverUrl })}
      />
      <Breadcrumbs
        items={[
          { label: t('content.guides.home'), to: '/' },
          { label: t('content.guides.guides'), to: '/guides' },
          { label: guide.category.name, to: `/guides?category=${guide.category.slug}` },
          { label: guide.title },
        ]}
      />
      <article className="mt-6 sm:mt-10">
        <header className="mx-auto max-w-3xl text-center">
          <Link
            to={`/guides?category=${guide.category.slug}`}
            className="inline-flex min-h-9 items-center rounded-full bg-primary-soft px-4 text-sm font-semibold text-primary-strong hover:underline"
          >
            {guide.category.name}
          </Link>
          <h1 className="mt-4 break-words font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-4 text-lg text-muted sm:text-xl">{guide.summary}</p>
          <p className="mt-4 text-sm font-semibold text-muted">
            {date.format(new Date(guide.publishedAt))} &middot;{' '}
            {t('content.guides.minRead', { minutes: guide.readingMinutes })}
          </p>
        </header>
        <GuideCover
          coverUrl={guide.coverUrl}
          categorySlug={guide.category.slug}
          eager
          className="mx-auto mt-8 max-w-5xl rounded-card shadow-card sm:mt-12"
        />
        <div className="mx-auto mt-10 max-w-[68ch] sm:mt-14" data-testid={TEST_IDS.guideBody}>
          <MarkdownBody source={guide.bodyMd} />
        </div>
      </article>

      {guide.products.length > 0 && (
        <section className="mt-16 sm:mt-24" aria-labelledby="guide-products-heading">
          <h2
            id="guide-products-heading"
            className="font-display text-2xl font-semibold sm:text-3xl"
          >
            {t('content.guides.products')}
          </h2>
          <div className="mt-4" data-testid={TEST_IDS.guideProducts}>
            <ProductGrid products={guide.products} listId={`guide-${guide.slug}`} />
          </div>
        </section>
      )}

      {guide.related.length > 0 && (
        <section className="mt-16 sm:mt-24" aria-labelledby="guide-related-heading">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h2
              id="guide-related-heading"
              className="font-display text-2xl font-semibold sm:text-3xl"
            >
              {t('content.guides.more')}
            </h2>
            <Link
              to="/guides"
              className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary-strong hover:underline"
            >
              {t('content.guides.all')}
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <ul
            className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            data-testid={TEST_IDS.guideRelated}
          >
            {guide.related.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
