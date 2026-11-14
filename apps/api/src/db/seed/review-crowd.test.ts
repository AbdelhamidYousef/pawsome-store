import { describe, expect, it } from 'vitest';

import { products } from './products.ts';
import {
  CROWD_MAX,
  CROWD_MIN,
  CROWD_POOL_SIZE,
  crowdReviewers,
  generateCrowdReviews,
  KIND_BY_SLUG,
  kindFor,
  type CrowdProduct,
} from './review-crowd.ts';

// No database: the generator's shape, from the real catalogue.
const now = new Date('2026-11-14T10:30:00Z');
const catalogue: CrowdProduct[] = products.map((p) => ({
  id: p.slug,
  slug: p.slug,
  pet: p.pet,
  kind: kindFor(p.categorySlug, p.slug),
  bestseller: p.bestseller ?? false,
  axes: p.axes.map((a) => ({
    key: a.key,
    labels: a.values.filter((v) => !v.isTrial).map((v) => v.label),
  })),
}));
const rows = generateCrowdReviews(catalogue, now);
const byProduct = new Map<string, typeof rows>();
for (const r of rows) {
  const list = byProduct.get(r.productId) ?? [];
  list.push(r);
  byProduct.set(r.productId, list);
}

describe('crowd reviews generator', () => {
  it('only overrides the text kind of products that exist', () => {
    const slugs = new Set(products.map((p) => p.slug));
    expect(Object.keys(KIND_BY_SLUG).filter((s) => !slugs.has(s))).toEqual([]);
  });

  it('never repeats the title as a body sentence', () => {
    const same = (a: string) =>
      a
        .replace(/[.!]+$/, '')
        .trim()
        .toLowerCase();
    const echoes = rows.filter((r) =>
      r.body.split(/(?<=[.!])\s+/).some((x) => x.includes(' ') && same(x) === same(r.title)),
    );
    expect(echoes.length).toBe(0);
  });

  it('is deterministic', () => {
    expect(generateCrowdReviews(catalogue, now)).toEqual(rows);
  });

  it('gives every product 100-1000 reviews, mostly 120-400, bestsellers 600+', () => {
    expect(byProduct.size).toBe(catalogue.length);
    const counts = catalogue.map((p) => byProduct.get(p.id)!.length);
    for (const n of counts) {
      expect(n).toBeGreaterThanOrEqual(CROWD_MIN);
      expect(n).toBeLessThanOrEqual(CROWD_MAX);
    }
    const typical = counts.filter((n) => n >= 120 && n <= 400).length;
    expect(typical / counts.length).toBeGreaterThan(0.7);
    for (const p of catalogue.filter((c) => c.bestseller)) {
      expect(byProduct.get(p.id)!.length).toBeGreaterThanOrEqual(600);
    }
    // Room for Neon's free tier: well under 50k rows.
    expect(rows.length).toBeLessThan(50_000);
  });

  it('keeps every product average between 4.2 and 4.8, with some 1-3 star reviews', () => {
    for (const list of byProduct.values()) {
      const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
      expect(avg).toBeGreaterThanOrEqual(4.2);
      expect(avg).toBeLessThanOrEqual(4.8);
    }
    const low = rows.filter((r) => r.rating <= 2).length / rows.length;
    const three = rows.filter((r) => r.rating === 3).length / rows.length;
    expect(low).toBeGreaterThan(0.02);
    expect(low).toBeLessThan(0.08);
    expect(three).toBeGreaterThan(0.03);
  });

  it('uses each reviewer at most once per product, from the pool', () => {
    for (const list of byProduct.values()) {
      expect(new Set(list.map((r) => r.reviewer)).size).toBe(list.length);
    }
    expect(rows.every((r) => r.reviewer >= 0 && r.reviewer < CROWD_POOL_SIZE)).toBe(true);
    expect(new Set(crowdReviewers().map((r) => r.email)).size).toBe(CROWD_POOL_SIZE);
  });

  it('writes filled-in, varied text dated over the past 18 months', () => {
    expect(rows.some((r) => /[{}]/.test(r.title + r.body))).toBe(false);
    expect(rows.every((r) => r.title.length > 0 && r.body.length > 0)).toBe(true);
    // Varied: within one product, most bodies are different.
    for (const list of byProduct.values()) {
      expect(new Set(list.map((r) => r.body)).size / list.length).toBeGreaterThan(0.6);
    }
    const oldest = now.getTime() - 549 * 24 * 60 * 60 * 1000;
    for (const r of rows) {
      expect(r.createdAt.getTime()).toBeLessThan(now.getTime());
      expect(r.createdAt.getTime()).toBeGreaterThan(oldest);
      expect(r.moderatedAt.getTime()).toBeGreaterThanOrEqual(r.createdAt.getTime());
      expect(r.moderatedAt.getTime()).toBeLessThanOrEqual(now.getTime());
    }
    expect(rows.filter((r) => r.verifiedBuyer).length / rows.length).toBeGreaterThan(0.8);
  });

  it('gives the same rows for any time on the same day (a re-seed changes nothing)', () => {
    const later = generateCrowdReviews(catalogue.slice(0, 5), new Date('2026-11-14T23:59:00Z'));
    expect(later).toEqual(generateCrowdReviews(catalogue.slice(0, 5), now));
  });
});
