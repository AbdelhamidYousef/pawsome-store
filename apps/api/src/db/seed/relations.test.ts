import { describe, expect, it } from 'vitest';

import { bundleSeeds } from './bundles.ts';
import { products } from './products.ts';
import { BOUGHT_TOGETHER_PICKS, boughtTogetherPlan } from './relations.ts';

const plan = boughtTogetherPlan(products, bundleSeeds);
const bySlug = new Map(products.map((p) => [p.slug, p]));
const kitSlugs = new Set(bundleSeeds.map((b) => b.slug));

describe('bought-together plan', () => {
  it('gives every product and kit 2-3 distinct picks, never itself and never a kit', () => {
    expect(plan.size).toBe(products.length + bundleSeeds.length);
    for (const [slug, picks] of plan) {
      expect(picks.length, slug).toBeGreaterThanOrEqual(2);
      expect(picks.length, slug).toBeLessThanOrEqual(BOUGHT_TOGETHER_PICKS);
      expect(new Set(picks).size, slug).toBe(picks.length);
      expect(picks, slug).not.toContain(slug);
      expect(
        picks.some((p) => kitSlugs.has(p)),
        slug,
      ).toBe(false);
    }
  });

  it('pairs the same pet and, outside fish, a different category', () => {
    for (const p of products) {
      for (const pick of plan.get(p.slug)!) {
        const other = bySlug.get(pick)!;
        expect(other.pet, `${p.slug} -> ${pick}`).toBe(p.pet);
        if (p.pet !== 'fish')
          expect(other.categorySlug, `${p.slug} -> ${pick}`).not.toBe(p.categorySlug);
      }
    }
  });

  it('never suggests a part of the kit being viewed', () => {
    for (const b of bundleSeeds) {
      const parts = b.parts.map((x) => x.productSlug);
      expect(
        plan.get(b.slug)!.some((p) => parts.includes(p)),
        b.slug,
      ).toBe(false);
    }
  });

  it('uses the whole category, not the same three picks everywhere', () => {
    const picked = new Set([...plan.values()].flat());
    expect(picked.size).toBeGreaterThan(60);
  });
});
