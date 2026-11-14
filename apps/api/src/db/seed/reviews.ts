import { inArray, like, sql } from 'drizzle-orm';

import type { Tx } from '../client.ts';
import {
  galleryPhotoProducts,
  galleryPhotos,
  products as productsTable,
  reviewPhotos,
  reviews,
  sessions,
  users,
} from '../schema/index.ts';

import { bundleSeeds } from './bundles.ts';
import type { ProductSeed } from './expand.ts';
import { imageRowsFor } from './images.ts';
import {
  CROWD_EMAIL_PATTERN,
  crowdReviewers,
  generateCrowdReviews,
  kindFor,
  type CrowdProduct,
} from './review-crowd.ts';

// Phase 17 demo content: about 60 invented reviews spread over 22 products (mixed ratings, some
// pending or rejected, some with pet details or a photo) and 12 gallery photos. Everything is
// generated deterministically from a fixed seed, so every run (and every machine) gets the same
// rows and the seed stays idempotent. No real person or brand: reviewers are made-up names on the
// reserved `.test` domain.
//
// Photos reuse the catalogue's own product pictures (`/products/...`, already committed and
// credited in apps/web/public/products/CREDITS.md): no new art, and nothing to keep in step.
// TODO(image task): real customer-style photos can replace these paths later (admin gallery).

export const REVIEWER_EMAIL_DOMAIN = '@pawsome.test';
const REVIEWER_NAMES: [string, string][] = [
  ['Mara', 'Kowalski'],
  ['Jonas', 'Berg'],
  ['Priya', 'Nair'],
  ['Tom', 'Hughes'],
  ['Elena', 'Rossi'],
  ['Kasper', 'Lund'],
  ['Amara', 'Okafor'],
  ['Lucas', 'Meyer'],
  ['Sofia', 'Alvarez'],
  ['Noah', 'Brandt'],
  ['Ines', 'Duarte'],
  ['Felix', 'Wagner'],
  ['Hana', 'Sato'],
  ['Oskar', 'Virtanen'],
];
const reviewerEmail = (i: number) =>
  `reviewer${String(i + 1).padStart(2, '0')}${REVIEWER_EMAIL_DOMAIN}`;

// Small deterministic generator (mulberry32): same numbers on every run.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Phrases are shared on purpose: the topic chips only show words that three different reviews use.
const POSITIVE = [
  'Really well made and the stitching feels sturdy.',
  'Easy to clean, I just rinse it and it looks new again.',
  'Great value for the price, I would buy it again.',
  'It arrived quickly and was packed carefully.',
  'The quality is much better than I expected.',
  'Soft and comfortable, and it still looks great after weeks of use.',
  'Honestly the best purchase we made this year.',
];
const MIXED = [
  'Decent quality for the price, though the size runs a little small.',
  'It does the job but I expected it to feel more sturdy.',
  'Good idea and easy to clean, but it took a while to arrive.',
];
const NEGATIVE = [
  'Disappointed, it started to wear out after only a few weeks.',
  'The size was smaller than the photos suggest and it felt flimsy.',
];
const PET_LINES: Record<string, string[]> = {
  dog: ['My dog loves it and hasn’t put it down.', 'Our puppy took to it straight away.'],
  cat: ['My cat claimed it within minutes.', 'Both of our cats fight over it.'],
  bird: ['My parrot is curious about it every morning.', 'The budgies took to it quickly.'],
  fish: ['The fish settled in nicely and the water stayed clear.'],
  'small-pet': ['My guinea pigs are using it every day.', 'The rabbit hops straight to it.'],
  reptile: ['My gecko uses it daily and seems very comfortable.'],
};
const TITLES: Record<'good' | 'mixed' | 'bad', string[]> = {
  good: ['Love it', 'Great buy', 'Exactly what we needed', 'Worth every cent', 'Highly recommend'],
  mixed: ['Good, not perfect', 'Does the job', 'Fine for the price'],
  bad: ['Not for us', 'Disappointing', 'Expected better'],
};
const REJECT_REASONS = ['Contains a link to another shop', 'Not about this product'];

const WEIGHT_G: Record<string, [number, number]> = {
  dog: [3_000, 38_000],
  cat: [2_500, 7_000],
  bird: [30, 1_200],
  'small-pet': [300, 2_000],
  reptile: [20, 4_000],
};

export const SEEDED_REVIEW_TARGET = 60;
const PRODUCT_COUNT = 22;

export async function seedReviews(
  tx: Tx,
  opts: {
    products: readonly ProductSeed[];
    productId: ReadonlyMap<string, string>;
    // Unusable password hash (users.ts): reviewer accounts cannot sign in.
    lockedHash: string;
    now: Date;
  },
) {
  const { products, productId, lockedHash, now } = opts;
  const rand = rng(17);
  const DAY = 24 * 60 * 60 * 1000;

  // ---- reviewers ----
  const reviewerRows = await tx
    .insert(users)
    .values(
      REVIEWER_NAMES.map(([firstName, lastName], i) => ({
        email: reviewerEmail(i),
        firstName,
        lastName,
        passwordHash: lockedHash,
      })),
    )
    .onConflictDoUpdate({
      target: users.email,
      set: {
        firstName: sql.raw('excluded."first_name"'),
        lastName: sql.raw('excluded."last_name"'),
        passwordHash: sql.raw('excluded."password_hash"'),
      },
    })
    .returning({ id: users.id, email: users.email });
  const reviewerId = (i: number) => {
    const row = reviewerRows.find((r) => r.email === reviewerEmail(i));
    if (!row) throw new Error(`reviewer ${i} was not inserted`);
    return row.id;
  };

  await tx.delete(sessions).where(
    inArray(
      sessions.userId,
      reviewerRows.map((r) => r.id),
    ),
  );

  // Re-running replaces the seeded reviews only (their photos and votes go by cascade); reviews
  // written by anyone else, including e2e and real use, stay.
  await tx.delete(reviews).where(
    inArray(
      reviews.userId,
      reviewerRows.map((r) => r.id),
    ),
  );

  // ---- reviews ----
  const step = Math.floor(products.length / PRODUCT_COUNT);
  const chosen = Array.from({ length: PRODUCT_COUNT }, (_, i) => products[i * step]!);
  const counts = [3, 2, 4, 3, 2, 3, 4, 2, 3, 3, 2, 4, 3, 2, 3, 4, 2, 3, 3, 2, 4, 3]; // sums to 64 -> cut to 60
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;

  let total = 0;
  const approvedByProduct = new Map<string, { count: number; sum: number }>();
  for (const [p, product] of chosen.entries()) {
    const pid = productId.get(product.slug);
    if (!pid) throw new Error(`product ${product.slug} was not inserted`);
    for (let k = 0; k < (counts[p] ?? 2) && total < SEEDED_REVIEW_TARGET; k++, total++) {
      const roll = rand();
      const rating = roll < 0.45 ? 5 : roll < 0.75 ? 4 : roll < 0.87 ? 3 : roll < 0.95 ? 2 : 1;
      const tone = rating >= 4 ? 'good' : rating === 3 ? 'mixed' : 'bad';
      const sentences = [
        pick(PET_LINES[product.pet] ?? PET_LINES.dog!),
        pick(tone === 'good' ? POSITIVE : tone === 'mixed' ? MIXED : NEGATIVE),
        ...(tone === 'good' && rand() < 0.6 ? [pick(POSITIVE)] : []),
      ];
      const s = rand();
      // Mostly approved; a few waiting, a couple turned down.
      const status = s < 0.78 ? 'approved' : s < 0.92 ? 'pending' : 'rejected';
      const weight = WEIGHT_G[product.pet];
      const withPet = rand() < 0.5 && weight !== undefined;
      const helpful = status === 'approved' ? Math.floor(rand() * rand() * 15) : 0;
      const createdAt = new Date(now.getTime() - Math.floor(1 + rand() * 180) * DAY);

      const [row] = await tx
        .insert(reviews)
        .values({
          productId: pid,
          userId: reviewerId((p * 3 + k) % REVIEWER_NAMES.length),
          rating,
          title: pick(TITLES[tone]),
          body: [...new Set(sentences)].join(' '),
          // Seeded reviews carry the flag without an order: the demo has no purchase history to
          // point at (real ones get `order_id` from the paid order, see reviews/service.ts).
          verifiedBuyer: rand() < 0.6,
          petAgeMonths: withPet ? 3 + Math.floor(rand() * 150) : null,
          petWeightG: withPet ? weight[0] + Math.floor(rand() * (weight[1] - weight[0])) : null,
          wouldRecommend: rating >= 3 ? true : rand() < 0.2,
          status,
          rejectReason: status === 'rejected' ? pick(REJECT_REASONS) : null,
          helpfulCount: helpful,
          createdAt,
          moderatedAt: status === 'pending' ? null : new Date(createdAt.getTime() + DAY),
        })
        .returning({ id: reviews.id });
      if (!row) throw new Error('review insert returned no row');

      if (status === 'approved') {
        const agg = approvedByProduct.get(pid) ?? { count: 0, sum: 0 };
        approvedByProduct.set(pid, { count: agg.count + 1, sum: agg.sum + rating });
        const image = imageRowsFor(product)[0];
        if (rand() < 0.2 && image && !image.url.endsWith('.svg')) {
          await tx.insert(reviewPhotos).values({ reviewId: row.id, path: image.url, position: 0 });
        }
      }
    }
  }

  await seedCrowdReviews(tx, { products, productId, lockedHash, now });

  // The aggregate is recomputed from the approved reviews for EVERY product (not only the seeded
  // ones), so it is right after a re-seed even when other reviews exist.
  await tx.execute(sql`
    update products set
      rating_count = (select count(*)::int from reviews r
        where r.product_id = products.id and r.status = 'approved'),
      rating_sum = (select coalesce(sum(r.rating), 0)::int from reviews r
        where r.product_id = products.id and r.status = 'approved')
  `);

  // ---- gallery: twelve photos built from catalogue pictures ----
  // The pictures are product shots, so the caption names the product and no pet is credited
  // (the storefront calls the strip "Pawsome at home", not customer photos).
  await tx.delete(galleryPhotos).where(like(galleryPhotos.path, '/products/%'));
  const withPhoto = products.filter((p) => {
    const img = imageRowsFor(p)[0];
    return img && !img.url.endsWith('.svg') && productId.has(p.slug);
  });
  const gStep = Math.max(1, Math.floor(withPhoto.length / 12));
  for (let i = 0; i < 12; i++) {
    const main = withPhoto[(i * gStep + 3) % withPhoto.length]!;
    const [photo] = await tx
      .insert(galleryPhotos)
      .values({
        path: imageRowsFor(main)[0]!.url,
        caption: main.name,
        petName: '',
        sortOrder: i + 1,
        // One stays a draft, so the admin screen has both states to show.
        published: i !== 11,
      })
      .returning({ id: galleryPhotos.id });
    if (!photo) throw new Error('gallery insert returned no row');
    // The main product plus up to two more of the same pet, so the modal has something to browse.
    const mates = withPhoto
      .filter((p) => p.pet === main.pet && p.slug !== main.slug)
      .slice(i % 3, (i % 3) + (i % 3 === 0 ? 1 : 2));
    const linked = [main, ...mates].map((p) => productId.get(p.slug)!);
    await tx
      .insert(galleryPhotoProducts)
      .values([...new Set(linked)].map((pid) => ({ photoId: photo.id, productId: pid })));
  }
}

// Rows per INSERT. Each batch travels as ONE jsonb parameter (no 65 535-parameter limit), about
// 1.5 MB; a handful of round trips writes the ~40k rows even on a remote database.
const CROWD_BATCH = 4000;

/**
 * The crowd: 100-1000 approved reviews per catalogue product and kit, from a pool of 1100 invented
 * customers (one review per customer per product, as the unique key demands). Idempotent:
 * an upsert on (user, product) that rewrites a row only when its content changed, then a delete of
 * crowd rows the generator no longer produces. The seed is the source of truth for these rows: a
 * re-seed puts back a crowd review an admin rejected or deleted (approved again, same text), and a
 * re-seed on a later day rewrites every row because the dates move with "today". Helpful counts are
 * written once and then left alone, so real votes on a seeded review survive a re-seed.
 */
export async function seedCrowdReviews(
  tx: Tx,
  opts: {
    products: readonly ProductSeed[];
    productId: ReadonlyMap<string, string>;
    // Unusable password hash (users.ts): reviewer accounts cannot sign in.
    lockedHash: string;
    now: Date;
  },
): Promise<number> {
  const { products, productId, lockedHash, now } = opts;

  const pool = crowdReviewers();
  const userRows = await tx
    .insert(users)
    .values(pool.map((r) => ({ ...r, passwordHash: lockedHash })))
    .onConflictDoUpdate({
      target: users.email,
      set: {
        firstName: sql.raw('excluded."first_name"'),
        lastName: sql.raw('excluded."last_name"'),
        passwordHash: sql.raw('excluded."password_hash"'),
      },
    })
    .returning({ id: users.id, email: users.email });
  // Nobody signs in as a seeded reviewer: drop any session one might have.
  await tx.delete(sessions).where(
    inArray(
      sessions.userId,
      userRows.map((r) => r.id),
    ),
  );
  const idByEmail = new Map(userRows.map((r) => [r.email, r.id]));
  const userIds = pool.map((r) => {
    const id = idByEmail.get(r.email);
    if (!id) throw new Error(`reviewer ${r.email} was not inserted`);
    return id;
  });

  const catalogue: CrowdProduct[] = products.map((p) => {
    const id = productId.get(p.slug);
    if (!id) throw new Error(`product ${p.slug} was not inserted`);
    return {
      id,
      slug: p.slug,
      pet: p.pet,
      kind: kindFor(p.categorySlug, p.slug),
      bestseller: p.bestseller ?? false,
      axes: p.axes
        .map((a) => ({
          key: a.key,
          labels: a.values.filter((v) => !v.isTrial).map((v) => v.label),
        }))
        .filter((a) => a.labels.length > 0),
    };
  });
  const kits = await tx
    .select({ id: productsTable.id, slug: productsTable.slug })
    .from(productsTable)
    .where(
      inArray(
        productsTable.slug,
        bundleSeeds.map((b) => b.slug),
      ),
    );
  const all = [
    ...catalogue,
    ...kits.map((k) => ({
      id: k.id,
      slug: k.slug,
      pet: 'dog' as const,
      kind: 'kit' as const,
      bestseller: false,
      axes: [],
    })),
  ];

  const rows = generateCrowdReviews(all, now).map((r) => ({
    product_id: r.productId,
    user_id: userIds[r.reviewer]!,
    rating: r.rating,
    title: r.title,
    body: r.body,
    verified_buyer: r.verifiedBuyer,
    pet_age_months: r.petAgeMonths,
    pet_weight_g: r.petWeightG,
    size_purchased: r.sizePurchased,
    would_recommend: r.wouldRecommend,
    helpful_count: r.helpfulCount,
    created_at: r.createdAt.toISOString(),
    moderated_at: r.moderatedAt.toISOString(),
  }));

  for (let i = 0; i < rows.length; i += CROWD_BATCH) {
    const batch = JSON.stringify(rows.slice(i, i + CROWD_BATCH));
    await tx.execute(sql`
      insert into reviews (product_id, user_id, rating, title, body, verified_buyer, pet_age_months,
        pet_weight_g, size_purchased, would_recommend, status, helpful_count, created_at, moderated_at)
      select x.product_id, x.user_id, x.rating, x.title, x.body, x.verified_buyer, x.pet_age_months,
        x.pet_weight_g, x.size_purchased, x.would_recommend, 'approved', x.helpful_count,
        x.created_at, x.moderated_at
      from jsonb_to_recordset(${batch}::jsonb) as x(product_id uuid, user_id uuid, rating smallint,
        title text, body text, verified_buyer boolean, pet_age_months integer, pet_weight_g integer,
        size_purchased text, would_recommend boolean, helpful_count integer,
        created_at timestamptz, moderated_at timestamptz)
      on conflict on constraint reviews_user_product_unique do update set
        rating = excluded.rating, title = excluded.title, body = excluded.body,
        verified_buyer = excluded.verified_buyer, pet_age_months = excluded.pet_age_months,
        pet_weight_g = excluded.pet_weight_g, size_purchased = excluded.size_purchased,
        would_recommend = excluded.would_recommend, status = 'approved', reject_reason = null,
        created_at = excluded.created_at, moderated_at = excluded.moderated_at
      where (reviews.rating, reviews.title, reviews.body, reviews.verified_buyer,
          reviews.pet_age_months, reviews.pet_weight_g, reviews.size_purchased,
          reviews.would_recommend, reviews.status, reviews.created_at, reviews.moderated_at)
        is distinct from (excluded.rating, excluded.title, excluded.body, excluded.verified_buyer,
          excluded.pet_age_months, excluded.pet_weight_g, excluded.size_purchased,
          excluded.would_recommend, 'approved'::review_status, excluded.created_at,
          excluded.moderated_at)
    `);
  }

  // Crowd rows the generator no longer makes (a product left the catalogue, a count went down).
  const keys = JSON.stringify(rows.map((r) => ({ p: r.product_id, u: r.user_id })));
  await tx.execute(sql`
    delete from reviews r
    where r.user_id in (select id from users where email like ${CROWD_EMAIL_PATTERN})
      and not exists (
        select 1 from jsonb_to_recordset(${keys}::jsonb) as k(p uuid, u uuid)
        where k.p = r.product_id and k.u = r.user_id)
  `);
  return rows.length;
}
