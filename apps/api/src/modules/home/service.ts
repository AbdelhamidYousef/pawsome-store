import {
  HOME_BESTSELLER_COUNT,
  type HomeResponse,
  type Testimonial,
  type TestimonialsResponse,
} from '@store/shared';
import { asc, avg, count, desc, eq } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import { testimonials } from '../../db/schema/index.ts';
import { listBestsellerCards } from '../catalog/service.ts';
import { localizeCopy } from '../i18n/copy.ts';

import { getHomeContent } from './content.ts';

// One function for the whole homepage payload. Caching is the same as the rest of the public API:
// the router stamps the 60 s public cache header, and the bestseller part reads the badge index,
// which is itself kept for a minute.
export async function getHome(): Promise<HomeResponse> {
  const [content, bestsellers] = await Promise.all([
    getHomeContent(),
    listBestsellerCards(HOME_BESTSELLER_COUNT),
  ]);
  const promo = content.promoTile;
  return {
    heroSlides: content.heroSlides.map((s) => ({
      ...s,
      title: localizeCopy(s.title),
      text: localizeCopy(s.text),
      ctaLabel: localizeCopy(s.ctaLabel),
    })),
    // Switched on but empty is the same as off.
    promoTile:
      promo.enabled && promo.text
        ? { ...promo, text: localizeCopy(promo.text), linkLabel: localizeCopy(promo.linkLabel) }
        : null,
    bestsellers,
  };
}

export async function getTestimonials(): Promise<TestimonialsResponse> {
  const [featured, [stats]] = await Promise.all([
    db
      .select({
        id: testimonials.id,
        name: testimonials.name,
        pet: testimonials.pet,
        rating: testimonials.rating,
        quote: testimonials.quote,
      })
      .from(testimonials)
      .where(eq(testimonials.isFeatured, true))
      .orderBy(desc(testimonials.rating), asc(testimonials.createdAt), asc(testimonials.id))
      .limit(6),
    db.select({ n: count(), mean: avg(testimonials.rating) }).from(testimonials),
  ]);
  const n = stats?.n ?? 0;
  return {
    data: featured.map((t) => ({
      ...t,
      pet: localizeCopy(t.pet),
      quote: localizeCopy(t.quote),
    })) satisfies Testimonial[],
    meta: {
      count: n,
      average: n > 0 && stats?.mean ? Math.round(Number(stats.mean) * 10) / 10 : null,
    },
  };
}
