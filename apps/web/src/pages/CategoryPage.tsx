import { Link, useParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import { Breadcrumbs, type Crumb } from '../components/layout/Breadcrumbs';
import { Container } from '../components/layout/Container';
import { Seo, slugAlternates } from '../components/Seo';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { hasActiveFilters, useProductListParams } from '../features/catalog/list-params';
import { ProductListing } from '../features/catalog/ProductListing';
import { useCategories, useCategory } from '../features/catalog/queries';
import { useCanonicalSlug } from '../features/stores/useCanonicalSlug';
import { useT } from '../i18n';
import { petAttributeForAccent, petBySlug } from '../lib/pets';
import { TEST_IDS } from '../lib/test-ids';

import NotFoundPage from './NotFoundPage';

export default function CategoryPage() {
  const { t } = useT();
  const { slug } = useParams();
  const { data: category, error, isPending, refetch } = useCategory(slug);
  useCanonicalSlug('c', slug, category?.slug);
  const { data: tree } = useCategories();
  const { query } = useProductListParams();

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage what="category" />;
  if (error) {
    return (
      <Container className="py-12 text-center" data-testid={TEST_IDS.pageCategory}>
        <Seo title={t('catalog.page.error')} noindex />
        <h1 className="text-3xl font-bold">{t('catalog.category.loadError')}</h1>
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
        data-testid={TEST_IDS.pageCategory}
      >
        <Spinner label={t('catalog.category.loading')} className="h-8 w-8 text-primary-strong" />
      </Container>
    );
  }

  // A subcategory (Dogs > Toys) takes its parent's colour and shows the parent in the trail.
  const parent = category.parentId ? tree?.find((n) => n.id === category.parentId) : undefined;
  const pet = petBySlug(parent?.slug ?? category.slug);
  const crumbs: Crumb[] = [
    { label: t('catalog.page.home'), to: '/' },
    ...(parent ? [{ label: parent.name, to: `/c/${parent.slug}` }] : []),
    { label: category.name },
  ];

  // Page 2+ is its own page for search engines; filtered or sorted views are not worth indexing
  // (endless combinations of the same products), so they point back at the plain category.
  const variant = hasActiveFilters(query) || query.sort !== undefined;
  const pageSuffix = !variant && query.page > 1 ? `?page=${query.page}` : '';
  const canonical = `/c/${category.slug}${pageSuffix}`;

  return (
    <div data-pet={pet?.accent} data-testid={TEST_IDS.pageCategory}>
      <Seo
        title={category.name}
        {...(category.description && { description: category.description })}
        canonical={canonical}
        alternates={slugAlternates('c', category.slugs, pageSuffix)}
        noindex={variant}
      />
      <Container className="py-6">
        <Breadcrumbs items={crumbs} />
        <div className="mt-4 rounded-card bg-pet-soft p-6 text-pet-strong sm:p-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{category.name}</h1>
          {category.description && (
            <p className="mt-2 max-w-prose text-ink">{category.description}</p>
          )}
          {category.children.length > 0 && (
            <ul
              className="mt-4 flex flex-wrap gap-2"
              aria-label={t('catalog.category.subcategories')}
            >
              {category.children.map((child) => (
                <li key={child.id}>
                  <Link
                    to={`/c/${child.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-surface px-4 font-display font-semibold hover:bg-pet-accent"
                  >
                    {child.name}
                    <span className="ml-2 text-sm font-normal text-muted">
                      {child.productCount}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-6">
          <ProductListing
            listId={category.slug}
            category={category.slug}
            {...(pet && { petScope: petAttributeForAccent(pet.accent) ?? 'none' })}
          />
        </div>
      </Container>
    </div>
  );
}
