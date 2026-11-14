import { HeartIcon } from '../../components/icons';
import { useToast } from '../../components/ui/Toast';
import { useT } from '../../i18n';
import { TEST_IDS } from '../../lib/test-ids';

import { useWishlist, useWishlistActions } from './queries';

// A toggle on a product card and on the product page. It is a button next to the card's link, not
// inside it (a button in a link is invalid and unreachable by keyboard). `aria-pressed` carries the
// state, so the label stays the same and a screen reader says "pressed" or "not pressed".
export function WishlistHeart({
  productId,
  productName,
  className = '',
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const { data } = useWishlist();
  const { add, remove } = useWishlistActions();
  const toast = useToast();
  const { t } = useT();
  const saved = data?.items.find((i) => i.productId === productId);
  const busy = add.isPending || remove.isPending;

  const toggle = () => {
    const fail = () => toast.show(t('loyalty.wishlist.updateFailed'), 'error');
    if (saved) remove.mutate(saved.id, { onError: fail });
    else {
      add.mutate(
        { productId },
        {
          onSuccess: () => toast.show(t('loyalty.wishlist.saved', { name: productName }), 'love'),
          onError: fail,
        },
      );
    }
  };

  return (
    <button
      type="button"
      aria-pressed={!!saved}
      aria-label={t('loyalty.wishlist.saveLabel', { name: productName })}
      data-testid={TEST_IDS.wishlistHeart}
      disabled={busy}
      onClick={toggle}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-full bg-surface/90 text-primary-strong shadow-card hover:bg-pet-soft disabled:opacity-60 ${className}`}
    >
      <HeartIcon filled={!!saved} />
    </button>
  );
}
