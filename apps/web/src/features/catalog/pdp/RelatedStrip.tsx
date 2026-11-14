import { useT } from '../../../i18n';
import { useRecommendations } from '../queries';

import { ProductRail } from './ProductRail';

// "You may also like": the editor's related picks, else the same category (the API decides).
export function RelatedStrip({ productSlug }: { productSlug: string }) {
  const { t } = useT();
  const { data } = useRecommendations(productSlug);
  if (!data || data.related.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" data-testid="related" className="mt-16 sm:mt-20">
      <ProductRail
        cards={data.related}
        label={t('pdp.related.label')}
        testId="related-list"
        heading={t('pdp.related.heading')}
        headingId="related-heading"
      />
    </section>
  );
}
