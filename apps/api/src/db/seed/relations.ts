import { and, eq, inArray } from 'drizzle-orm';

import type { Tx } from '../client.ts';
import { productRelations } from '../schema/index.ts';

import type { BundleSeed } from './bundles.ts';
import type { ProductSeed } from './expand.ts';

// "Frequently bought together", picked by hand-written rules instead of left to the random sales
// history: the editor's picks come first on the PDP (modules/catalog/recommendations.ts), so every
// seeded product gets three. Rules: the same pet, a category that goes WITH this one (a toy gets
// treats, a lead and a bed, not another toy), never a kit (so never a kit that contains the product
// itself), never a part of the kit being viewed. Pure function, so the rules are unit-tested.

// For each category, the categories that complement it, in order (one pick from each).
const COMPLEMENTS: Record<string, string[]> = {
  'dog-toys': ['dog-treats', 'dog-walk', 'dog-beds'],
  'dog-beds': ['dog-toys', 'dog-treats', 'dog-bowls'],
  'dog-treats': ['dog-toys', 'dog-bowls', 'dog-walk'],
  'dog-bowls': ['dog-treats', 'dog-beds', 'dog-walk'],
  'dog-walk': ['dog-treats', 'dog-toys', 'dog-bowls'],
  'cat-toys': ['cat-treats', 'cat-beds', 'cat-bowls'],
  'cat-beds': ['cat-toys', 'cat-treats', 'cat-bowls'],
  'cat-treats': ['cat-toys', 'cat-bowls', 'cat-beds'],
  'cat-bowls': ['cat-treats', 'cat-toys', 'cat-travel'],
  'cat-travel': ['cat-treats', 'cat-beds', 'cat-toys'],
  'bird-toys': ['bird-food', 'bird-feeders', 'bird-cages'],
  'bird-food': ['bird-feeders', 'bird-toys', 'bird-cages'],
  'bird-cages': ['bird-feeders', 'bird-toys', 'bird-food'],
  'bird-feeders': ['bird-food', 'bird-toys', 'bird-cages'],
  // Fish has two categories: food goes with tank kit, tank kit with food and more tank kit.
  'fish-food': ['fish-tanks', 'fish-tanks', 'fish-food'],
  'fish-tanks': ['fish-food', 'fish-tanks', 'fish-food'],
  'small-toys': ['small-food', 'small-housing', 'small-bowls'],
  'small-food': ['small-bowls', 'small-toys', 'small-housing'],
  'small-housing': ['small-bowls', 'small-food', 'small-toys'],
  'small-bowls': ['small-food', 'small-housing', 'small-toys'],
  'reptile-terrariums': ['reptile-heat', 'reptile-decor', 'reptile-feeders'],
  'reptile-heat': ['reptile-decor', 'reptile-feeders', 'reptile-terrariums'],
  'reptile-decor': ['reptile-heat', 'reptile-feeders', 'reptile-food'],
  'reptile-feeders': ['reptile-food', 'reptile-decor', 'reptile-heat'],
  'reptile-food': ['reptile-feeders', 'reptile-heat', 'reptile-decor'],
};
export const BOUGHT_TOGETHER_PICKS = 3;

// FNV-1a: a stable starting point per slug, so neighbours in a category get different picks.
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** slug → the slugs to suggest with it, in order. Kits are keyed by their own slug. */
export function boughtTogetherPlan(
  products: readonly ProductSeed[],
  bundles: readonly BundleSeed[],
): Map<string, string[]> {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const byCategory = new Map<string, ProductSeed[]>();
  for (const p of products)
    byCategory.set(p.categorySlug, [...(byCategory.get(p.categorySlug) ?? []), p]);

  const picksFor = (key: string, category: string, exclude: Set<string>): string[] => {
    const wanted = COMPLEMENTS[category];
    if (!wanted) throw new Error(`no bought-together rule for category ${category}`);
    const picks: string[] = [];
    const h = hash(key);
    for (const [i, cat] of wanted.entries()) {
      const pool = (byCategory.get(cat) ?? []).filter(
        (p) => !exclude.has(p.slug) && !picks.includes(p.slug),
      );
      if (pool.length === 0) continue;
      picks.push(pool[(h + i * 7) % pool.length]!.slug);
    }
    return picks.slice(0, BOUGHT_TOGETHER_PICKS);
  };

  const plan = new Map<string, string[]>();
  for (const p of products) plan.set(p.slug, picksFor(p.slug, p.categorySlug, new Set([p.slug])));
  for (const b of bundles) {
    const parts = b.parts.map((part) => part.productSlug);
    const first = bySlug.get(parts[0] ?? '');
    if (!first) throw new Error(`kit ${b.slug}: unknown part ${parts[0]}`);
    plan.set(b.slug, picksFor(b.slug, first.categorySlug, new Set(parts)));
  }
  return plan;
}

/** Replaces the bought-together picks of every seeded product and kit (re-runnable). */
export async function seedBoughtTogether(
  tx: Tx,
  plan: ReadonlyMap<string, string[]>,
  idBySlug: ReadonlyMap<string, string>,
): Promise<void> {
  const id = (slug: string) => {
    const found = idBySlug.get(slug);
    if (!found) throw new Error(`bought-together: ${slug} is not seeded`);
    return found;
  };
  const owners = [...plan.keys()].map(id);
  await tx
    .delete(productRelations)
    .where(
      and(
        inArray(productRelations.productId, owners),
        eq(productRelations.kind, 'bought_together'),
      ),
    );
  const rows = [...plan].flatMap(([slug, picks]) =>
    picks.map((pick, sortOrder) => ({
      productId: id(slug),
      relatedId: id(pick),
      kind: 'bought_together' as const,
      sortOrder,
    })),
  );
  if (rows.length > 0) await tx.insert(productRelations).values(rows);
}
