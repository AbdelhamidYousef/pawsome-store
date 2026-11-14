import { useEffect, type ReactNode } from 'react';

import { Container } from '../components/layout/Container';
import { Seo } from '../components/Seo';
import { ProductGrid, ProductGridSkeleton } from '../features/catalog/ProductGrid';
import '../features/home/builtin-slots';
import { useFreeDeliveryAmount } from '../features/home/free-delivery';
import { HeroCarousel } from '../features/home/HeroCarousel';
import {
  GuidesTeaser,
  HeroSkeleton,
  HeroTrust,
  Testimonials,
  TrustBar,
} from '../features/home/HomeSections';
import { useHome } from '../features/home/queries';
import { ShopByPet } from '../features/home/ShopByPet';
import { getHomeSlots, type HomeSlot } from '../features/home/slots';
import { SafetyBanner } from '../features/safety/SafetyBanner';
import { useT } from '../i18n';
import { TEST_IDS } from '../lib/test-ids';
import { track } from '../lib/track';

// Section titles share one size and weight across the homepage.
const SECTION_TITLE = 'mb-6 text-[1.75rem] font-bold leading-tight sm:text-4xl';

// Every section after the hero sits in a Container with a top margin. `empty:hidden` drops the
// whole block (margin included) when its component rendered nothing, so an optional section that
// has nothing to show never leaves a gap.
function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Container className="mt-[var(--space-section)] empty:hidden" data-home-section={id}>
      {children}
    </Container>
  );
}

function renderSlot(slot: HomeSlot) {
  return (
    <Section key={slot.id} id={slot.id}>
      {slot.render()}
    </Section>
  );
}

export default function HomePage() {
  const { t } = useT();
  const freeFrom = useFreeDeliveryAmount();
  const { data, isPending, isError } = useHome();
  const slots = getHomeSlots();

  useEffect(() => {
    track({ name: 'view_home' });
  }, []);

  return (
    <div data-testid={TEST_IDS.pageHome} className="pb-[var(--space-section)]">
      <Seo
        title="Pawsome"
        canonical="/"
        description={t('shell.home.seoDescription', { amount: freeFrom })}
      />

      <SafetyBanner />

      <h1 className="sr-only">{t('shell.home.h1')}</h1>

      {data ? <HeroCarousel slides={data.heroSlides} trust={<HeroTrust />} /> : <HeroSkeleton />}
      <TrustBar />

      <Section id="shop-by-pet">
        <ShopByPet />
      </Section>

      <Section id="bestsellers">
        <h2 className={SECTION_TITLE}>{t('shell.home.bestsellers')}</h2>
        {isError ? (
          <p role="alert" className="rounded-card bg-danger-soft p-4 text-danger">
            {t('shell.home.bestsellersError')}
          </p>
        ) : (
          <div aria-busy={isPending}>
            {isPending ? (
              <ProductGridSkeleton count={4} />
            ) : (
              <ProductGrid products={data.bestsellers} listId="bestsellers" />
            )}
          </div>
        )}
      </Section>

      {slots.filter((s) => s.id === 'seasonal').map(renderSlot)}

      <Section id="guides">
        <GuidesTeaser />
      </Section>

      <Section id="testimonials">
        <Testimonials />
      </Section>

      {slots.filter((s) => s.id !== 'seasonal').map(renderSlot)}
    </div>
  );
}
