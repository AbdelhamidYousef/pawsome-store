import type { GalleryPhoto, GalleryProduct } from '@store/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Price } from '../../components/ui/Price';
import { useT } from '../../i18n';
import { cn } from '../../lib/cn';
import { TEST_IDS } from '../../lib/test-ids';
import { track } from '../../lib/track';
import { useAddToCartAction } from '../cart/queries';
import { useGallery } from '../reviews/queries';

// #RealPawsomePets: customers' photos as square tiles with a caption overlay (pet name in the
// display font, "with <product>" under it). On the homepage, with 9 or more photos, the first is a
// big 2x2 feature tile and eight small ones fill the rest, so the rows are always full (4 columns:
// 2+2 / 2+2 / 4; 2 columns: 2 / 2+2 ... ); "Show more photos" adds 8 at a time. Elsewhere (the
// product page) it is a plain grid. A click opens a dialog with the photo, the caption and the
// products in it, each with its own "Add to cart", so the shopper buys without leaving the page.
// Nothing at all renders while loading, on an error, or when there are no published photos: an
// empty gallery must not leave a heading with nothing under it.
const FEATURED_MIN = 9;
const MORE_STEP = 8;

export function ShoppableGallery({
  productId,
  heading,
  intro,
}: {
  /** Only photos that feature this product (the product page); everything otherwise. */
  productId?: string;
  heading?: string;
  intro?: string;
}) {
  const { t } = useT();
  const { data } = useGallery(productId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [extra, setExtra] = useState(0);
  if (!data || data.length === 0) return null;
  const open = data.find((p) => p.id === openId) ?? null;
  const featured = !productId && data.length >= FEATURED_MIN;
  const shown = data.slice(0, (featured ? FEATURED_MIN : MORE_STEP) + extra);

  return (
    <section
      aria-labelledby={`gallery-heading-${productId ?? 'home'}`}
      className={productId ? 'mt-10' : undefined}
    >
      <h2
        id={`gallery-heading-${productId ?? 'home'}`}
        className={cn(
          'font-display font-semibold leading-tight',
          productId ? 'text-2xl sm:text-3xl' : 'text-[1.75rem] sm:text-4xl',
        )}
      >
        {heading ?? t('shell.gallery.heading')}
      </h2>
      <p className="mt-1 text-muted">{intro ?? t('shell.gallery.intro')}</p>
      <ul
        data-testid={TEST_IDS.galleryGrid}
        className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
      >
        {shown.map((photo, i) => (
          <li
            key={photo.id}
            className={cn('min-w-0', featured && i === 0 && 'col-span-2 row-span-2')}
          >
            <GalleryTile
              photo={photo}
              big={featured && i === 0}
              onOpen={() => {
                track({ name: 'gallery_open', photoId: photo.id });
                setOpenId(photo.id);
              }}
            />
          </li>
        ))}
      </ul>
      {shown.length < data.length && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={() => setExtra((n) => n + MORE_STEP)}>
            {t('shell.gallery.more')}
          </Button>
        </div>
      )}
      <Dialog
        open={open !== null}
        onClose={() => setOpenId(null)}
        title={t('shell.gallery.shop')}
        className="md:max-w-4xl"
      >
        {open && <GalleryModalBody photo={open} />}
      </Dialog>
    </section>
  );
}

function GalleryTile({
  photo,
  big,
  onOpen,
}: {
  photo: GalleryPhoto;
  big: boolean;
  onOpen: () => void;
}) {
  const { t } = useT();
  const product = photo.products[0];
  return (
    <button
      type="button"
      data-testid={TEST_IDS.galleryItem}
      aria-label={t('shell.gallery.open', {
        name: photo.caption || photo.petName || t('shell.gallery.customerPhotoLower'),
      })}
      onClick={onOpen}
      className="group relative block aspect-square w-full overflow-hidden rounded-card bg-pet-soft shadow-card"
    >
      <img
        src={photo.path}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
      />
      {(photo.petName || product) && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-x-0 bottom-0 flex flex-col items-start bg-gradient-to-t from-[rgb(31_27_46/0.78)] via-[rgb(31_27_46/0.45)] to-transparent px-3 pb-3 pt-10 text-left text-surface',
            big && 'sm:px-5 sm:pb-5',
          )}
        >
          {photo.petName && (
            <span
              className={cn(
                'font-display font-semibold leading-tight',
                big ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg',
              )}
            >
              {photo.petName}
            </span>
          )}
          {product && (
            <span className="line-clamp-1 text-xs sm:text-sm">
              {t('shell.gallery.with', { product: product.name })}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

function GalleryModalBody({ photo }: { photo: GalleryPhoto }) {
  const { t } = useT();
  return (
    <div
      data-testid={TEST_IDS.galleryModal}
      className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-8"
    >
      <img
        src={photo.path}
        alt={
          photo.caption ||
          t('shell.gallery.petOf', { name: photo.petName || t('shell.gallery.aCustomer') })
        }
        className="aspect-square w-full rounded-card bg-pet-soft object-cover"
      />
      <div className="flex min-w-0 flex-col gap-4">
        <p className="font-display text-2xl font-semibold leading-tight">
          {photo.caption || photo.petName || t('shell.gallery.customerPhoto')}
        </p>
        {photo.petName && (
          <p className="-mt-1 self-start rounded-full bg-pet-soft px-3 py-1 text-sm font-semibold text-pet-strong">
            {t('shell.gallery.pictured', { name: photo.petName })}
          </p>
        )}
        {photo.products.length > 0 ? (
          <>
            <h3 className="mt-2 font-display text-lg font-semibold">
              {t('shell.gallery.inPhoto')}
            </h3>
            <ul className="flex flex-col divide-y divide-line border-y border-line">
              {photo.products.map((p) => (
                <GalleryProductRow key={p.id} product={p} />
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">{t('shell.gallery.noProducts')}</p>
        )}
      </div>
    </div>
  );
}

function GalleryProductRow({ product }: { product: GalleryProduct }) {
  const { t } = useT();
  const cart = useAddToCartAction(product);
  return (
    <li data-testid="gallery-product" className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-control bg-pet-soft object-cover"
        />
      )}
      <div className="min-w-[8rem] flex-1">
        <Link
          to={`/products/${product.slug}`}
          className="block font-display font-semibold leading-snug text-ink hover:underline"
        >
          {product.name}
        </Link>
        <div className="font-semibold text-pet-strong">
          <Price cents={product.priceCents} currency={product.currency} />
        </div>
      </div>
      {product.variantId ? (
        <Button
          size="md"
          className="w-full sm:w-auto"
          loading={cart.pending}
          aria-label={t('shell.gallery.addAria', { name: product.name })}
          onClick={() =>
            cart.add(
              { id: product.variantId!, sku: product.variantId!, priceCents: product.priceCents },
              1,
            )
          }
        >
          {t('shell.gallery.add')}
        </Button>
      ) : (
        <span className="text-sm font-semibold text-danger">{t('shell.gallery.soldOut')}</span>
      )}
    </li>
  );
}
