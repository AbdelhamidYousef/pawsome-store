import type { ProductCard as ProductCardData } from '@store/shared';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '../../components/ui/Badge';
import { MemberPrice, MemberTeaser, memberBeatsSale } from '../../components/ui/MemberPrice';
import { Price } from '../../components/ui/Price';
import { ProductBadges } from '../../components/ui/ProductBadges';
import { SalePrice } from '../../components/ui/SalePrice';
import { UnitPrice } from '../../components/ui/UnitPrice';
import { useT } from '../../i18n';
import { productSrcSet } from '../../lib/images';
import { accentForPetAttribute } from '../../lib/pets';
import { TEST_IDS } from '../../lib/test-ids';
import { formatRating } from '../reviews/format';
import { RatingStars } from '../reviews/RatingStars';
import { WishlistHeart } from '../wishlist/WishlistHeart';

interface ProductCardProps {
  product: ProductCardData;
  /** First-row cards load eagerly (they are above the fold); the rest are lazy. */
  priority?: boolean;
  /** Width the card occupies, for the browser's srcset choice. */
  sizes?: string;
  /** Extra content under the card (the gift finder's "why this gift" line). */
  footer?: ReactNode;
}

// Past this many colours the rest collapse into "+N colours".
const MAX_SWATCHES = 4;

const titleCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// The image and text are one link (a big tap target, one tab stop). The colour dots are NOT inside
// that link, because a button inside a link is invalid and unreachable by keyboard; they sit below
// it in the same card. Hovering or focusing a dot previews that colour's photo, and a click (a
// tap, on touch) keeps it.
export function ProductCard({
  product,
  priority = false,
  sizes = '(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw',
  footer,
}: ProductCardProps) {
  const { t, tn } = useT();
  const [preview, setPreview] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const active = preview ?? picked;
  const swatch = product.swatches.find((s) => s.color === active);
  const image = swatch?.image ?? product.image;
  const shown = product.swatches.slice(0, MAX_SWATCHES);
  const more = product.swatches.length - shown.length;

  return (
    // A flex column, so an optional footer (the gift finder's "why") sits under the card inside
    // the grid cell instead of spilling over the next row.
    <li data-pet={accentForPetAttribute(product.attributes.pet)} className="flex min-w-0 flex-col">
      <div className="group relative flex flex-1 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-transform hover:-translate-y-0.5">
        <Link
          to={`/products/${product.slug}`}
          data-testid={TEST_IDS.productCard}
          className="flex flex-1 flex-col"
        >
          <div className="relative aspect-square bg-pet-soft">
            {image ? (
              <img
                src={image.url}
                srcSet={productSrcSet(image.url)}
                sizes={sizes}
                width={image.width}
                height={image.height}
                alt={image.alt}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                className={`h-full w-full object-cover ${product.inStock ? '' : 'opacity-60'}`}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-pet-strong" aria-hidden>
                {t('catalog.card.noImage')}
              </div>
            )}
            <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
              {!product.inStock && (
                <Badge
                  tone="neutral"
                  data-testid={TEST_IDS.soldOutBadge}
                  className="border-ink bg-surface text-ink"
                >
                  {t('catalog.card.soldOut')}
                </Badge>
              )}
              <ProductBadges badges={product.badges} />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
            {/* Two lines at most: the clamp keeps every card in a row the same height even for
                the longest product name; the full name is still in the accessible name. */}
            <h3
              data-testid={TEST_IDS.productCardName}
              className="line-clamp-2 break-words font-display text-base font-semibold leading-snug"
            >
              {product.name}
            </h3>
            {product.rating.count > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <RatingStars tenths={product.rating.averageTenths} size="sm" />
                <span aria-hidden="true">
                  {formatRating(product.rating.averageTenths)} ({product.rating.count})
                </span>
                <span className="sr-only">{tn('catalog.card.reviews', product.rating.count)}</span>
              </p>
            )}
            <div className="mt-auto flex flex-col">
              {memberBeatsSale(product.member, product.sale) && product.member ? (
                <MemberPrice
                  member={product.member}
                  regularCents={product.price.minCents}
                  currency={product.price.currency}
                  from={product.price.minCents !== product.price.maxCents}
                  className="text-pet-strong"
                />
              ) : product.sale ? (
                <SalePrice
                  sale={product.sale}
                  currency={product.price.currency}
                  className="text-pet-strong"
                />
              ) : (
                <Price
                  cents={product.price.minCents}
                  maxCents={product.price.maxCents}
                  currency={product.price.currency}
                  className="text-pet-strong"
                />
              )}
              <UnitPrice unitPrice={product.unitPrice} currency={product.price.currency} />
            </div>
          </div>
        </Link>
        {/* Outside the product link: a link inside a link is invalid. */}
        <MemberTeaser
          show={product.hasMemberPrice}
          returnTo={`/products/${product.slug}`}
          className="px-3 pb-3 sm:px-4 sm:pb-4"
        />
        {product.swatches.length > 0 && (
          <div
            role="group"
            aria-label={t('catalog.card.coloursOf', { name: product.name })}
            className="flex flex-wrap items-center gap-1 px-3 pb-3 sm:px-4 sm:pb-4"
            onMouseLeave={() => setPreview(null)}
          >
            {shown.map((s) => (
              <button
                key={s.color}
                type="button"
                data-testid={TEST_IDS.swatch}
                aria-label={titleCase(s.color)}
                aria-pressed={active === s.color}
                onMouseEnter={() => setPreview(s.color)}
                onFocus={() => setPreview(s.color)}
                onBlur={() => setPreview(null)}
                onClick={() => setPicked((current) => (current === s.color ? null : s.color))}
                className="flex size-7 items-center justify-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: s.hex }}
                  className={`size-5 rounded-full border border-ink/30 ${
                    active === s.color ? 'ring-2 ring-pet-strong ring-offset-1' : ''
                  }`}
                />
              </button>
            ))}
            {more > 0 && (
              <span data-testid={TEST_IDS.swatchMore} className="text-xs font-semibold text-muted">
                {tn('catalog.card.moreColours', more)}
              </span>
            )}
          </div>
        )}
        {/* Last in the DOM (after the link and the colour dots), pinned top right by CSS. */}
        <WishlistHeart
          productId={product.id}
          productName={product.name}
          className="absolute right-2 top-2 z-10"
        />
      </div>
      {footer}
    </li>
  );
}
