import { describe, expect, it } from 'vitest';

import { MATERIAL_BY_SLUG, MATERIAL_CODES, materialFacet } from './materials.ts';
import { products } from './products.ts';

const FOOD = new Set([
  'dog-treats',
  'cat-treats',
  'bird-food',
  'fish-food',
  'small-food',
  'reptile-food',
]);

describe('material facet vocabulary', () => {
  it('covers every seeded product and nothing else', () => {
    expect(Object.keys(MATERIAL_BY_SLUG).sort()).toEqual(products.map((p) => p.slug).sort());
  });

  it('gives food and treats no material, and everything else a vocabulary code', () => {
    for (const p of products) {
      const code = materialFacet(p);
      if (FOOD.has(p.categorySlug)) expect(code, p.slug).toBeUndefined();
      else expect(MATERIAL_CODES, p.slug).toContain(code);
    }
  });

  it('has no one-off values: every code is used by at least two products', () => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const code = materialFacet(p);
      if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...MATERIAL_CODES].sort());
    for (const [code, n] of counts) expect(n, code).toBeGreaterThanOrEqual(2);
  });
});
