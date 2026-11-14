import { Link, useSearchParams } from 'react-router-dom';

import { Container } from '../components/layout/Container';
import { Seo } from '../components/Seo';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Pagination } from '../features/catalog/Pagination';
import { GuideCard } from '../features/guides/GuideCard';
import { useGuideCategories, useGuides } from '../features/guides/queries';
import { useT } from '../i18n';
import { TEST_IDS } from '../lib/test-ids';

// Ten: the lead card plus three full rows of three on the first page.
const PAGE_SIZE = 10;

const tab =
  'inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-line bg-surface px-4 font-semibold transition-colors hover:border-ink/40 aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-surface';

// Category and page live in the URL (`?category=dogs&page=2`), so a filtered list can be linked,
// reloaded and walked with Back.
export default function GuidesPage() {
  const [params] = useSearchParams();
  const { t } = useT();
  const category = params.get('category') ?? undefined;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const { data: categories } = useGuideCategories();
  const { data, isPending, error, refetch } = useGuides({ category, page, limit: PAGE_SIZE });

  const hrefFor = (target: number) => {
    const next = new URLSearchParams();
    if (category) next.set('category', category);
    if (target > 1) next.set('page', String(target));
    const text = next.toString();
    return `/guides${text ? `?${text}` : ''}`;
  };

  return (
    <Container className="pb-16 pt-10 sm:pb-24 sm:pt-14" data-testid={TEST_IDS.pageGuides}>
      <Seo title={t('content.guides.title')} description={t('content.guides.seoDescription')} />
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">
          {t('content.guides.title')}
        </h1>
        <p className="mt-3 text-lg text-muted">{t('content.guides.intro')}</p>
      </header>

      {categories && categories.length > 0 && (
        <nav
          aria-label={t('content.guides.topics')}
          className="-mx-4 mt-8 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0"
        >
          <ul className="flex gap-2 sm:flex-wrap">
            <li>
              <Link
                to="/guides"
                data-testid={TEST_IDS.guideCategoryTab}
                aria-current={category ? undefined : 'page'}
                className={tab}
              >
                {t('content.guides.all')}
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  to={`/guides?category=${encodeURIComponent(c.slug)}`}
                  data-testid={TEST_IDS.guideCategoryTab}
                  aria-current={category === c.slug ? 'page' : undefined}
                  className={tab}
                >
                  {c.name} <span className="ml-1.5 text-sm opacity-70">{c.guideCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {isPending && !error && (
        <ul
          className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-hidden="true"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-[4/3] w-full rounded-card" />
            </li>
          ))}
        </ul>
      )}
      {error && !data && (
        <div className="mt-6" role="alert">
          <p className="font-semibold text-danger">{t('content.guides.listError')}</p>
          <Button className="mt-2" variant="secondary" onClick={() => void refetch()}>
            {t('content.guides.retry')}
          </Button>
        </div>
      )}
      {data && data.data.length === 0 && (
        <p className="mt-6 text-muted" data-testid={TEST_IDS.emptyState}>
          {page > 1 ? t('content.guides.noPage', { page }) : t('content.guides.empty')}{' '}
          <Link to="/guides" className="font-semibold text-primary-strong underline">
            {t('content.guides.seeAll')}
          </Link>
        </p>
      )}
      {data && data.data.length > 0 && (
        <>
          <ul
            className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-label={t('content.guides.list')}
          >
            {data.data.map((g, i) => (
              <GuideCard
                key={g.slug}
                guide={g}
                featured={i === 0 && page === 1 && data.data.length > 1}
                eager={i < 4}
              />
            ))}
          </ul>
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages} hrefFor={hrefFor} />
        </>
      )}
    </Container>
  );
}
