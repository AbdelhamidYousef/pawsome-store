import { createElement } from 'react';

import { readRecentlyViewed } from '../../lib/recently-viewed';
import { RecentlyViewed } from '../catalog/pdp/RecentlyViewed';
import { ShoppableGallery } from '../gallery/ShoppableGallery';
import { SeasonalCollectionSlot } from '../merchandising/SeasonalCollectionSlot';
import { NewsletterSlot } from '../newsletter/NewsletterSlot';

import { registerHomeSlot } from './slots';

// Slots whose component already exists. The phases that add the others (recently viewed, gallery,
// newsletter) register theirs the same way, from their own feature folder.
registerHomeSlot({ id: 'seasonal', render: () => createElement(SeasonalCollectionSlot) });

// Phase 16: the visitor's own recently viewed products. Nothing renders for a first-time visitor
// (the synchronous check below) and the strip drops itself if none of the ids is still on sale.
registerHomeSlot({
  id: 'recently-viewed',
  enabled: () => readRecentlyViewed().length > 0,
  render: () => createElement(RecentlyViewed),
});

// Phase 17: the "Pawsome at home" gallery. It renders nothing until the API says there
// is at least one published photo, so an empty gallery leaves no heading behind.
registerHomeSlot({ id: 'customer-gallery', render: () => createElement(ShoppableGallery) });
// Phase 19: the newsletter sign-up (double opt-in, welcome code after the confirming click).
registerHomeSlot({ id: 'newsletter', render: () => createElement(NewsletterSlot) });
