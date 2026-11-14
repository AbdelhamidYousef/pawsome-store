import { type WishlistItem } from '@store/shared';
import { Link } from 'react-router-dom';

import { HeartIcon } from '../components/icons';
import { Container } from '../components/layout/Container';
import { Seo } from '../components/Seo';
import { Button, buttonClasses } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../features/auth/AuthProvider';
import { useAddToCartAction } from '../features/cart/queries';
import { useStorePath } from '../features/stores/StoreContext';
import { useWishlist, useWishlistActions } from '../features/wishlist/queries';
import { useT } from '../i18n';
import { useFormat } from '../i18n/format';
import { TEST_IDS } from '../lib/test-ids';

export function WishlistItemCard({
  item,
  onRemove,
}: {
  item: WishlistItem;
  onRemove?: (() => void) | undefined;
}) {
  const cart = useAddToCartAction({ id: item.productId, name: item.name });
  const { t } = useT();
  const fmt = useFormat();
  return (
    <li
      data-testid={TEST_IDS.wishlistRow}
      className="flex min-w-0 gap-3 rounded-card border border-line bg-surface p-3 shadow-card"
    >
      <Link
        to={`/products/${item.slug}`}
        className="h-24 w-24 shrink-0 overflow-hidden rounded-control bg-pet-soft"
      >
        {item.image && (
          <img
            src={item.image.url}
            alt={item.image.alt}
            width={item.image.width}
            height={item.image.height}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={`/products/${item.slug}`}
          className="line-clamp-2 break-words font-display font-semibold hover:underline"
        >
          {item.name}
        </Link>
        {item.variantName && <p className="truncate text-sm text-muted">{item.variantName}</p>}
        {item.priceCents !== null && (
          <p className="font-semibold">{fmt.money(item.priceCents, item.currency)}</p>
        )}
        <div className="mt-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!item.available || !item.variantId}
            loading={cart.pending}
            onClick={() =>
              item.variantId &&
              cart.add({ id: item.variantId, sku: item.slug, priceCents: item.priceCents ?? 0 }, 1)
            }
          >
            {item.available ? t('loyalty.wishlist.moveToCart') : t('loyalty.wishlist.soldOut')}
          </Button>
          {onRemove && (
            <Button size="sm" variant="ghost" onClick={onRemove}>
              {t('loyalty.wishlist.remove')}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function WishlistPage() {
  const { data, isPending, error } = useWishlist();
  const { remove, share } = useWishlistActions();
  const { user } = useAuth();
  const { t } = useT();
  const storePath = useStorePath();
  const shareUrl = data?.shareToken
    ? `${window.location.origin}${storePath(`/w/${data.shareToken}`)}`
    : null;

  return (
    <Container className="pb-16 pt-8 sm:pb-24 sm:pt-10" data-testid={TEST_IDS.pageWishlist}>
      <Seo title={t('loyalty.wishlist.title')} noindex />
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">
        {t('loyalty.wishlist.title')}
      </h1>
      {isPending && <Skeleton className="mt-6 h-32 w-full rounded-card" />}
      {error && <p className="mt-6 text-danger">{t('loyalty.wishlist.error')}</p>}
      {data && data.items.length === 0 && (
        <div className="mx-auto mt-8 flex max-w-xl flex-col items-center gap-5 rounded-card bg-surface px-6 py-12 text-center shadow-card sm:px-10">
          <span
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary-strong"
          >
            <HeartIcon className="h-9 w-9" />
          </span>
          <p className="text-lg">{t('loyalty.wishlist.empty')}</p>
          <Link to="/" className={buttonClasses('primary', 'lg')}>
            {t('loyalty.wishlist.keepBrowsing')}
          </Link>
        </div>
      )}
      {data && data.items.length > 0 && (
        <>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {data.items.map((item) => (
              <WishlistItemCard key={item.id} item={item} onRemove={() => remove.mutate(item.id)} />
            ))}
          </ul>
          <section
            aria-labelledby="share-heading"
            data-testid={TEST_IDS.wishlistShare}
            className="mt-8 max-w-xl rounded-card border-2 border-line bg-pet-soft p-4"
          >
            <h2 id="share-heading" className="font-display text-xl font-bold">
              {t('loyalty.wishlist.shareTitle')}
            </h2>
            {user ? (
              <>
                <p className="mt-1 text-sm text-muted">{t('loyalty.wishlist.shareText')}</p>
                {shareUrl ? (
                  <>
                    <p
                      className="mt-2 break-all font-semibold"
                      data-testid={TEST_IDS.wishlistShareLink}
                    >
                      {shareUrl}
                    </p>
                    <Button
                      className="mt-2"
                      variant="secondary"
                      loading={share.isPending}
                      onClick={() => share.mutate(false)}
                    >
                      {t('loyalty.wishlist.stopSharing')}
                    </Button>
                  </>
                ) : (
                  <Button
                    className="mt-2"
                    loading={share.isPending}
                    onClick={() => share.mutate(true)}
                  >
                    {t('loyalty.wishlist.createLink')}
                  </Button>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm">
                <Link to="/login?next=%2Fwishlist" className="font-semibold underline">
                  {t('loyalty.wishlist.signIn')}
                </Link>{' '}
                {t('loyalty.wishlist.signInRest')}
              </p>
            )}
          </section>
        </>
      )}
    </Container>
  );
}
