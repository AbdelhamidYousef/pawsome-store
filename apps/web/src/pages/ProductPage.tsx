import type { ProductDetail, Variant } from '@store/shared';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ApiError } from '../api/client';
import { Breadcrumbs, type Crumb } from '../components/layout/Breadcrumbs';
import { Container } from '../components/layout/Container';
import { Seo, slugAlternates } from '../components/Seo';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { MemberPrice, MemberTeaser, memberBeatsSale } from '../components/ui/MemberPrice';
import { Price } from '../components/ui/Price';
import { ProductBadges } from '../components/ui/ProductBadges';
import { SalePrice } from '../components/ui/SalePrice';
import { Skeleton } from '../components/ui/Skeleton';
import { UnitPrice, UnitPriceNote } from '../components/ui/UnitPrice';
import { useAddToCartAction } from '../features/cart/queries';
import { AddToCart } from '../features/catalog/AddToCart';
import { formatFacetValue } from '../features/catalog/filters';
import { Gallery } from '../features/catalog/Gallery';
import { BoughtTogether } from '../features/catalog/pdp/BoughtTogether';
import { BundlePanel, KitsBlock } from '../features/catalog/pdp/BundlePanel';
import { DeliveryEstimate } from '../features/catalog/pdp/DeliveryEstimate';
import { faqJsonLd } from '../features/catalog/pdp/FaqAccordion';
import { ProductTabs } from '../features/catalog/pdp/ProductTabs';
import { RecentlyViewed } from '../features/catalog/pdp/RecentlyViewed';
import { RelatedStrip } from '../features/catalog/pdp/RelatedStrip';
import { SizeGuideButton } from '../features/catalog/pdp/SizeGuide';
import { useProduct } from '../features/catalog/queries';
import { variantFromSku } from '../features/catalog/resolve-variant';
import { VariantPicker } from '../features/catalog/VariantPicker';
import { VetBanner } from '../features/checkout/VetBanner';
import { ShoppableGallery } from '../features/gallery/ShoppableGallery';
import { EarnPoints } from '../features/loyalty/EarnPoints';
import { formatRating } from '../features/reviews/format';
import { RatingStars } from '../features/reviews/RatingStars';
import { ReviewsSection } from '../features/reviews/ReviewsSection';
import { SafetyNoticeBox } from '../features/safety/SafetyNoticeBox';
import { useCanonicalSlug } from '../features/stores/useCanonicalSlug';
import { WishlistHeart } from '../features/wishlist/WishlistHeart';
import { useT, type StringKey } from '../i18n';
import { useFormat } from '../i18n/format';
import { accentForPetAttribute, petBySlug } from '../lib/pets';
import { recordRecentlyViewed } from '../lib/recently-viewed';
import { TEST_IDS } from '../lib/test-ids';
import { track } from '../lib/track';

import NotFoundPage from './NotFoundPage';

const ATTRIBUTE_LABELS: [keyof ProductDetail['attributes'], StringKey][] = [
  ['pet', 'pdp.page.attr.pet'],
  ['material', 'pdp.page.attr.material'],
  ['ageStage', 'pdp.page.attr.ageStage'],
  ['size', 'pdp.page.attr.size'],
  ['brand', 'pdp.page.attr.brand'],
];

export default function ProductPage() {
  const { t } = useT();
  const { slug } = useParams();
  const { data: product, error, isPending, refetch } = useProduct(slug);
  useCanonicalSlug('products', slug, product?.slug);

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage what="product" />;
  if (error) {
    return (
      <Container className="py-12 text-center" data-testid={TEST_IDS.pageProduct}>
        <Seo title={t('pdp.page.loadError.seoTitle')} noindex />
        <h1 className="text-3xl font-bold">{t('pdp.page.loadError.title')}</h1>
        <Button className="mt-4" onClick={() => void refetch()}>
          {t('pdp.page.loadError.retry')}
        </Button>
      </Container>
    );
  }
  if (isPending) return <ProductSkeleton />;
  return <ProductView product={product} />;
}

function ProductView({ product }: { product: ProductDetail }) {
  const { t, tn } = useT();
  const fmt = useFormat();
  const ratingText = (tenths: number) =>
    fmt.number(tenths / 10, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // The chosen variant lives in the URL (`?variant=<sku>`), so a link is precise: it opens the
  // exact colour and size that was shared. No parameter means the default variant.
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const variant = variantFromSku(product.variants, params.get('variant'));
  const location = useLocation();
  const cart = useAddToCartAction(product);
  // replace: choosing colours is exploring, not navigating, so Back should leave the product
  // rather than step through every swatch. The hash (open tab) stays.
  const selectVariant = (next: Variant) => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('variant', next.sku);
    navigate(
      { pathname: location.pathname, search: `?${nextParams}`, hash: location.hash },
      { replace: true, preventScrollReset: true },
    );
  };
  // Which photo is shown is derived, not synced with an effect: a thumbnail the shopper picked
  // wins for the variant it was picked on; otherwise a variant with its own photo shows it; else
  // the first image. Changing variant therefore swaps the photo with no extra render.
  const [picked, setPicked] = useState<{ imageId: string; variantId: string | undefined }>();
  const variantId = variant?.id;
  const imageId =
    picked && picked.variantId === variantId
      ? picked.imageId
      : (product.images.find((i) => i.variantId === variantId) ?? product.images[0])?.id;

  useEffect(() => {
    track({
      name: 'view_item',
      item: { id: product.id, name: product.name, price: variant?.priceCents },
    });
    // Remembered for the "recently viewed" strips (this browser only).
    recordRecentlyViewed(product.id);
    // One view per product, not per variant change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const pet = petBySlug(product.breadcrumb[0]?.slug);
  const accent = pet?.accent ?? accentForPetAttribute(product.attributes.pet);
  const crumbs: Crumb[] = [
    { label: t('pdp.page.home'), to: '/' },
    ...product.breadcrumb.map((b) => ({ label: b.name, to: `/c/${b.slug}` })),
    { label: product.name },
  ];
  const attributes = ATTRIBUTE_LABELS.flatMap(([key, label]) => {
    const value = product.attributes[key];
    return value ? [{ label: t(label), value: formatFacetValue(key, value, t) }] : [];
  });

  return (
    <div data-pet={accent} data-testid={TEST_IDS.pageProduct}>
      <Seo
        title={product.name}
        description={product.description.slice(0, 155)}
        canonical={`/products/${product.slug}`}
        alternates={slugAlternates('products', product.slugs)}
        {...(jsonLdFor(product) && { jsonLd: jsonLdFor(product) })}
      />
      <Container className="py-6">
        <Breadcrumbs items={crumbs} />
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          <Gallery
            images={product.images}
            selectedId={imageId}
            onSelect={(id) => setPicked({ imageId: id, variantId })}
            soldOut={!product.inStock}
          />

          <div className="flex min-w-0 flex-col gap-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="break-words font-display text-3xl font-bold sm:text-4xl">
                  {product.name}
                </h1>
                <WishlistHeart productId={product.id} productName={product.name} />
              </div>
              {product.rating.count > 0 && (
                <a
                  href="#reviews"
                  className="mt-2 flex w-fit items-center gap-2 text-sm font-semibold underline"
                >
                  <RatingStars tenths={product.rating.averageTenths} />
                  {ratingText(product.rating.averageTenths)} (
                  {tn('pdp.page.reviewCount', product.rating.count)})
                </a>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!product.inStock && (
                  <Badge tone="neutral" className="border-ink bg-surface text-ink">
                    {t('pdp.page.soldOut')}
                  </Badge>
                )}
                <ProductBadges badges={product.badges} />
              </div>
            </div>

            {product.requiresVetApproval && <VetBanner />}

            {product.safetyNotices.map((notice) => (
              <SafetyNoticeBox key={notice.id} notice={notice} />
            ))}

            {variant?.member && memberBeatsSale(variant.member, variant.sale) ? (
              <MemberPrice
                member={variant.member}
                regularCents={variant.priceCents}
                currency={variant.currency}
                className="text-3xl text-pet-strong"
              />
            ) : variant?.sale ? (
              <SalePrice
                sale={variant.sale}
                currency={variant.currency}
                className="text-3xl text-pet-strong"
              />
            ) : variant ? (
              <Price
                cents={variant.priceCents}
                compareAtCents={variant.compareAtPriceCents}
                currency={variant.currency}
                className="text-3xl text-pet-strong"
              />
            ) : (
              <Price
                cents={product.price.minCents}
                maxCents={product.price.maxCents}
                currency={product.price.currency}
                className="text-3xl text-pet-strong"
              />
            )}

            {variant && (
              <MemberTeaser
                show={variant.hasMemberPrice}
                returnTo={`${location.pathname}${location.search}`}
                className="-mt-3"
              />
            )}

            {variant && (
              <div className="-mt-3 flex flex-col gap-1">
                <UnitPrice unitPrice={variant.unitPrice} currency={variant.currency} />
                {variant.unitPrice && <UnitPriceNote />}
                {variant.isTrial && (
                  <div className="mt-1 flex flex-col gap-1">
                    <Badge tone="pet" data-testid={TEST_IDS.trialPill} className="w-fit">
                      {t('pdp.page.trialSize')}
                    </Badge>
                    <p data-testid={TEST_IDS.trialNote} className="text-sm text-muted">
                      {t('pdp.page.trialNote')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {variant && product.optionKeys.length > 0 && (
              <VariantPicker
                optionKeys={product.optionKeys}
                variants={product.variants}
                selected={variant}
                onSelect={selectVariant}
              />
            )}

            {product.sizeGuide && <SizeGuideButton guide={product.sizeGuide} variant={variant} />}

            {product.bundle && (
              <BundlePanel bundle={product.bundle} currency={product.price.currency} />
            )}

            {variant && (
              <EarnPoints
                merchandiseCents={Math.min(
                  variant.priceCents,
                  variant.sale?.priceCents ?? Infinity,
                  variant.member?.priceCents ?? Infinity,
                )}
                returnTo={`${location.pathname}${location.search}`}
                className="-mt-3"
              />
            )}

            {variant && (
              <p className="text-sm text-muted" data-testid="variant-sku">
                {t('pdp.page.sku', { sku: variant.sku })} ·{' '}
                <span
                  className={
                    variant.available ? 'font-semibold text-success' : 'font-semibold text-danger'
                  }
                >
                  {variant.available ? t('pdp.page.inStock') : t('pdp.page.soldOut')}
                </span>
              </p>
            )}

            {variant && (
              <AddToCart
                key={variant.id}
                variant={variant}
                pending={cart.pending}
                onAdd={(quantity) => cart.add(variant, quantity)}
              />
            )}

            {variant?.available && <DeliveryEstimate />}
          </div>
        </div>
        <ProductTabs
          product={product}
          variant={variant}
          onPickVariant={selectVariant}
          attributes={
            <dl
              data-testid={TEST_IDS.productAttributes}
              className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-card bg-pet-soft p-4"
            >
              {attributes.map(({ label, value }) => (
                <div key={label} className="contents">
                  <dt className="font-semibold text-pet-strong">{label}</dt>
                  <dd className="min-w-0 break-words">{value}</dd>
                </div>
              ))}
              {product.tags.length > 0 && (
                <div className="contents">
                  <dt className="font-semibold text-pet-strong">{t('pdp.page.attr.goodFor')}</dt>
                  <dd className="min-w-0 break-words">
                    {product.tags.map((tag) => tag.name).join(', ')}
                  </dd>
                </div>
              )}
            </dl>
          }
        />
        <ReviewsSection product={product} />
        <ShoppableGallery
          productId={product.id}
          heading={t('pdp.page.gallery.heading')}
          intro={t('pdp.page.gallery.intro')}
        />
        <KitsBlock kits={product.kits} currency={product.price.currency} />
        <BoughtTogether productSlug={product.slug} productName={product.name} variant={variant} />
        <RelatedStrip productSlug={product.slug} />
        <RecentlyViewed excludeId={product.id} />
      </Container>
    </div>
  );
}

// Structured data for crawlers. aggregateRating only when there are reviews (an empty rating block
// is invalid and would be a lie); the FAQ block stays as before.
function jsonLdFor(
  product: ProductDetail,
): Record<string, unknown> | Record<string, unknown>[] | undefined {
  const nodes: Record<string, unknown>[] = [];
  const faq = faqJsonLd(product.faqs);
  if (faq) nodes.push(faq);
  if (product.rating.count > 0) {
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: formatRating(product.rating.averageTenths),
        reviewCount: product.rating.count,
        bestRating: 5,
        worstRating: 1,
      },
    });
  }
  // One block stays a plain object (as before); two or more go out as a JSON-LD array.
  return nodes.length > 1 ? nodes : nodes[0];
}

function ProductSkeleton() {
  const { t } = useT();
  return (
    <Container className="py-6" data-testid={TEST_IDS.pageProduct} aria-busy="true">
      <p className="sr-only" role="status">
        {t('pdp.page.loading')}
      </p>
      <Skeleton className="h-5 w-64" />
      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
        <Skeleton className="aspect-square w-full rounded-card" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </Container>
  );
}
