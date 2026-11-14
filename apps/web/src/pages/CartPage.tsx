import { Link } from 'react-router-dom';

import { CartIcon } from '../components/icons';
import { Container } from '../components/layout/Container';
import { Seo } from '../components/Seo';
import { buttonClasses, Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { CartContents } from '../features/cart/CartContents';
import { CartSummary } from '../features/cart/CartSummary';
import { useCart } from '../features/cart/queries';
import { RecentlyViewed } from '../features/catalog/pdp/RecentlyViewed';
import { petName } from '../features/navigation/pet-names';
import { useT } from '../i18n';
import { PETS } from '../lib/pets';
import { TEST_IDS } from '../lib/test-ids';

export default function CartPage() {
  const { t } = useT();
  const { data: cart, isPending, error, refetch } = useCart();

  return (
    <Container className="pb-16 pt-8 sm:pb-24 sm:pt-10" data-testid={TEST_IDS.cartPage}>
      <Seo title={t('cart.title')} noindex />
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t('cart.title')}</h1>

      {isPending && (
        <div className="mt-6 flex flex-col gap-4" aria-busy="true">
          <p className="sr-only" role="status">
            {t('cart.loading')}
          </p>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {error && !cart && (
        <div className="mt-6" role="alert">
          <p className="font-semibold text-danger">{t('cart.loadError')}</p>
          <Button className="mt-3" onClick={() => void refetch()}>
            {t('cart.tryAgain')}
          </Button>
        </div>
      )}

      {cart && cart.items.length === 0 && (
        <div
          className="mx-auto mt-8 flex max-w-2xl flex-col items-center gap-5 rounded-card bg-surface px-6 py-12 text-center shadow-card sm:px-10"
          data-testid={TEST_IDS.cartEmpty}
        >
          <span
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary-strong"
          >
            <CartIcon className="h-9 w-9" />
          </span>
          <p className="text-lg">{t('cart.empty.page')}</p>
          <Link to="/" className={buttonClasses('primary', 'lg')}>
            {t('cart.continueShopping')}
          </Link>
          <ul className="mt-2 flex flex-wrap justify-center gap-2">
            {PETS.map((pet) => (
              <li key={pet.slug} data-pet={pet.accent}>
                <Link
                  to={`/c/${pet.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full bg-pet-soft px-4 font-semibold text-pet-strong"
                >
                  {petName(t, pet)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {cart && cart.items.length > 0 && (
        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
          <div className="min-w-0">
            <CartContents cart={cart} />
          </div>
          {/* Sticks to the top on desktop only. It used to stick to the bottom edge on phones, but
              with the code box, bars and rules it can be taller than a phone screen and would
              cover the lines; on a phone it now simply follows them. */}
          <aside
            aria-label={t('cart.summary.aria')}
            className="rounded-card border-2 border-line bg-surface p-4 shadow-card lg:sticky lg:top-32 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto lg:p-5"
          >
            <CartSummary cart={cart} />
          </aside>
        </div>
      )}
      {cart && <RecentlyViewed max={6} />}
    </Container>
  );
}
