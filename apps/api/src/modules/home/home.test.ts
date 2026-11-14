import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { db } from '../../db/client.ts';
import { homeContent, testimonials } from '../../db/schema/index.ts';
import { HERO_SLIDE_SEEDS, PROMO_TILE_SEED } from '../../db/seed/home.ts';
import { MENU_PROMO_SEEDS } from '../../db/seed/menu-promos.ts';
import { testimonialSeeds } from '../../db/seed/testimonials.ts';
import { makeTestApp } from '../../test/app.ts';
import { createProduct } from '../../test/factories.ts';
import { bodyOf } from '../../test/http.ts';
import { COPY_KEYS } from '../i18n/copy.ts';

const app = makeTestApp();

interface HomeBody {
  data: {
    heroSlides: { title: string }[];
    promoTile: { text: string } | null;
    bestsellers: { name: string }[];
  };
}
const home = async () => request(app).get('/api/v1/home');

describe('GET /home', () => {
  it('falls back to the default slides, no promo and no products on an empty shop', async () => {
    const res = await home();
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('max-age=60');
    const { data } = bodyOf<HomeBody>(res);
    expect(data.heroSlides).toHaveLength(3);
    expect(data.promoTile).toBeNull();
    expect(data.bestsellers).toEqual([]);
  });

  it('returns the stored slides and an enabled promo tile', async () => {
    await db.insert(homeContent).values([
      {
        key: 'hero_slides',
        value: [{ title: 'Edited', text: 't', ctaLabel: 'Go', ctaHref: '/c/dogs', imageUrl: null }],
      },
      {
        key: 'promo_tile',
        value: { enabled: true, text: 'Sale!', linkLabel: 'Go', linkHref: '/' },
      },
    ]);
    const { data } = bodyOf<HomeBody>(await home());
    expect(data.heroSlides.map((s) => s.title)).toEqual(['Edited']);
    expect(data.promoTile?.text).toBe('Sale!');
  });

  it('hides a promo tile that is switched on but has no text', async () => {
    await db
      .insert(homeContent)
      .values({ key: 'promo_tile', value: { enabled: true, text: null } });
    expect(bodyOf<HomeBody>(await home()).data.promoTile).toBeNull();
  });

  it('lists bestsellers first and tops up with the newest products', async () => {
    await createProduct({ name: 'Plain old', createdAt: new Date('2025-01-01') });
    await createProduct({ name: 'Star', isBestsellerOverride: true });
    await createProduct({ name: 'Draft star', isBestsellerOverride: true, status: 'draft' });
    const { data } = bodyOf<HomeBody>(await home());
    const names = data.bestsellers.map((p) => p.name);
    expect(names).toEqual(['Star', 'Plain old']);
  });
});

describe('GET /testimonials', () => {
  it('returns featured quotes and the rating over all of them', async () => {
    await db.insert(testimonials).values([
      { name: 'A', pet: 'a', rating: 5, quote: 'q1', isFeatured: true },
      { name: 'B', pet: 'b', rating: 4, quote: 'q2', isFeatured: true },
      { name: 'C', pet: 'c', rating: 4, quote: 'q3', isFeatured: false },
    ]);
    const res = await request(app).get('/api/v1/testimonials');
    const body = bodyOf<{ data: { name: string }[]; meta: { count: number; average: number } }>(
      res,
    );
    expect(body.data.map((t) => t.name)).toEqual(['A', 'B']);
    expect(body.meta).toEqual({ count: 3, average: 4.3 });
  });

  it('has a null average when there are none', async () => {
    const body = bodyOf<{ meta: { average: number | null } }>(
      await request(app).get('/api/v1/testimonials'),
    );
    expect(body.meta.average).toBeNull();
  });
});

describe('seeded copy per store', () => {
  const homeIn = (store: string) => request(app).get('/api/v1/home').set('X-Store-View', store);

  it('shows the seeded hero, promo and testimonials in the store language and currency', async () => {
    await db.insert(homeContent).values([
      { key: 'hero_slides', value: HERO_SLIDE_SEEDS },
      { key: 'promo_tile', value: PROMO_TILE_SEED },
    ]);
    await db.insert(testimonials).values(testimonialSeeds.map((t) => ({ ...t })));

    const de = bodyOf<HomeBody>(await homeIn('de-de')).data;
    expect(de.heroSlides[0]?.title).toBe('Hier beginnt das Schwanzwedeln');
    expect(de.promoTile?.text).toMatch(/^Kostenloser Versand ab 49 €/);
    const fr = bodyOf<HomeBody>(await homeIn('fr-fr')).data;
    expect(fr.heroSlides[2]?.title).toBe('Petits animaux, grand amour');

    const uk = bodyOf<HomeBody>(await homeIn('uk-en')).data;
    expect(uk.heroSlides[0]?.title).toBe('Happy tails start here');
    expect(uk.promoTile?.text).toContain('£42');
    const ukQuotes = bodyOf<{ data: { quote: string }[] }>(
      await request(app).get('/api/v1/testimonials').set('X-Store-View', 'uk-en'),
    ).data.map((t) => t.quote);
    expect(ukQuotes.join(' ')).not.toMatch(/euro/i);
    const deQuotes = bodyOf<{ data: { pet: string }[] }>(
      await request(app).get('/api/v1/testimonials').set('X-Store-View', 'de-de'),
    ).data.map((t) => t.pet);
    expect(deQuotes).toContain('Biscuit, Beagle');
  });

  it('keeps text an admin typed (no catalogue entry) as typed', async () => {
    await db.insert(homeContent).values({
      key: 'hero_slides',
      value: [{ title: 'Edited', text: 't', ctaLabel: 'Go', ctaHref: '/c/dogs', imageUrl: null }],
    });
    expect(bodyOf<HomeBody>(await homeIn('de-de')).data.heroSlides[0]?.title).toBe('Edited');
  });

  // A seed edit must not leave a translation behind that no longer matches anything.
  it('has no catalogue key that the seed no longer contains', () => {
    const seeded = new Set<string>(
      [
        ...HERO_SLIDE_SEEDS.flatMap((s) => [s.title, s.text, s.ctaLabel]),
        PROMO_TILE_SEED.text,
        PROMO_TILE_SEED.linkLabel,
        ...MENU_PROMO_SEEDS.flatMap((p) => [p.title, p.subtitle, p.imageAlt]),
        ...testimonialSeeds.flatMap((t) => [t.pet, t.quote]),
      ].filter((s): s is string => s !== null),
    );
    expect([...COPY_KEYS].filter((k) => !seeded.has(k))).toEqual([]);
  });
});
