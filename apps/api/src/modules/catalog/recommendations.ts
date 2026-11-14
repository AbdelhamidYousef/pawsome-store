import {
  OrderStatusSchema,
  isPaidOrLater,
  type ProductCard,
  type Recommendations,
} from '@store/shared';

import { notFound } from '../../lib/errors.ts';
import { resolveSlug } from '../i18n/translations.ts';
import { saleOffersForProducts } from '../promotions/service.ts';

import * as repo from './recommendations-repo.ts';
import { listCardsInOrder, type Viewer } from './service.ts';

const PAID_STATUSES = OrderStatusSchema.options.filter(isPaidOrLater);

// "Frequently bought together" shows at most three suggestions, "related" a short strip.
export const BOUGHT_TOGETHER_MAX = 3;
export const RELATED_MAX = 6;
// Candidates are over-fetched: some will be sold out or off sale by the time cards are built.
const POOL = 16;

function unique(ids: string[], exclude: ReadonlySet<string>): string[] {
  const seen = new Set(exclude);
  return ids.filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
}

// Recommendations are ranked by sources anyone can explain, in this order:
//   1. what the editor picked for this product (product_relations),
//   2. what other customers bought together with it (distinct paid orders),
//   3. other products of the same category, the same brand first.
// (Machine learning was rejected: too little data and no way to say why an item appears.)
// Cards are built for the VIEWER like every catalog answer (a member sees member prices, a guest
// never gets a member number), and only products that can be bought right now are shown.
export async function getRecommendations(slug: string, viewer: Viewer): Promise<Recommendations> {
  // The PDP passes the URL's slug, which is the translated one on the de/fr stores.
  const ref = await repo.findActiveProductRef(await resolveSlug('product', slug));
  if (!ref) throw notFound('Product not found');

  const [pickedTogether, pickedRelated, together, sameCategory] = await Promise.all([
    repo.editorialIds(ref.id, 'bought_together'),
    repo.editorialIds(ref.id, 'related'),
    repo.coPurchasedIds(ref.id, PAID_STATUSES, POOL),
    repo.sameCategoryIds(ref, POOL),
  ]);
  const self = new Set([ref.id]);

  const togetherIds = unique([...pickedTogether, ...together, ...sameCategory], self).slice(
    0,
    POOL,
  );
  const togetherCards = await listCardsInOrder(togetherIds, viewer, { inStockOnly: true });
  const sellable = await repo.sellableVariants(togetherCards.map((c) => c.id));
  const offers = await saleOffersForProducts(togetherCards.map((c) => c.id));
  const boughtTogether = togetherCards
    .flatMap((card) => {
      const variant = sellable.get(card.id);
      if (!variant) return [];
      return [
        {
          card,
          variant: {
            id: variant.id,
            sku: variant.sku,
            name: variant.name,
            priceCents: variant.priceCents,
            currency: variant.currency,
            saleCents: offers.byVariant.get(variant.id)?.priceCents ?? null,
          },
        },
      ];
    })
    .slice(0, BOUGHT_TOGETHER_MAX);

  const taken = new Set([ref.id, ...boughtTogether.map((i) => i.card.id)]);
  const relatedIds = unique([...pickedRelated, ...sameCategory], taken).slice(0, POOL);
  const related: ProductCard[] = (
    await listCardsInOrder(relatedIds, viewer, { inStockOnly: true })
  ).slice(0, RELATED_MAX);

  return { boughtTogether, related };
}

// The recently viewed strip: the caller's ids, in their order, only what is still on sale.
export async function getByIds(ids: string[], viewer: Viewer): Promise<ProductCard[]> {
  return listCardsInOrder([...new Set(ids)], viewer);
}
