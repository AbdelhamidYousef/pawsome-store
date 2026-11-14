import { useState } from 'react';

import { useT } from '../../../i18n';
import { readRecentlyViewed } from '../../../lib/recently-viewed';
import { useProductsByIds } from '../queries';

import { ProductRail } from './ProductRail';

// The strip itself. The ids are read once when it first renders (before the product page records
// its own view), so it never flickers when the list changes underneath it. Products that are no
// longer on sale are simply missing from the API's answer.
export function RecentlyViewed({
  excludeId,
  heading: headingProp,
  max = 8,
}: {
  /** The product page's own id: you are looking at it already. */
  excludeId?: string;
  heading?: string;
  max?: number;
}) {
  const { t } = useT();
  const heading = headingProp ?? t('pdp.recent.heading');
  const [ids] = useState(() =>
    readRecentlyViewed()
      .filter((id) => id !== excludeId)
      .slice(0, max),
  );
  const { data } = useProductsByIds(ids);
  if (ids.length === 0 || !data || data.length === 0) return null;
  return (
    <section
      aria-labelledby="recently-viewed-heading"
      data-testid="recently-viewed"
      className="mt-16 sm:mt-20"
    >
      <ProductRail
        cards={data}
        label={heading}
        testId="recently-viewed-list"
        heading={heading}
        headingId="recently-viewed-heading"
      />
    </section>
  );
}
