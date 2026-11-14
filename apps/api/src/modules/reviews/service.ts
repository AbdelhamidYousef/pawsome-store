import {
  averageTenths,
  type AdminReview,
  type AdminReviewListResponseSchema,
  type AdminReviewQuerySchema,
  type ReviewInput,
  type ReviewListResponse,
} from '@store/shared';
import type { ReviewListQuerySchema } from '@store/shared';
import type { z } from 'zod';

import { db } from '../../db/client.ts';
import { uniqueViolation } from '../../lib/db-errors.ts';
import { conflict, forbidden, notFound, validation } from '../../lib/errors.ts';
import { removePhotos, savePhoto, type UploadConfig } from '../../lib/uploads.ts';
import { resolveSlug } from '../i18n/translations.ts';

import * as repo from './repo.ts';
import { extractTopics, type Topic } from './topics.ts';

// An explicit allow-list, NOT the shared `isPaidOrLater`: that one also counts `refunded`, and a
// refunded buyer did not keep the product, so the "Verified buyer" badge must not follow them.
// A status added later does not verify anyone until it is listed here on purpose.
const VERIFIED_STATUSES: repo.PaidStatus[] = ['paid', 'processing', 'shipped', 'delivered'];

export type CreateReviewResult = { id: string; status: 'pending'; verifiedBuyer: boolean };

// `verified_buyer` is decided HERE, from the database, and never read from the request: a trust
// badge the client could set would be worth nothing. A new review is always `pending`; only a
// moderator moves it on (17.6), so nothing a stranger types reaches the public page unreviewed.
export async function createReview(
  userId: string,
  slug: string,
  input: ReviewInput,
  upload?: { files: Buffer[]; config: UploadConfig },
): Promise<CreateReviewResult> {
  // The PDP passes the URL's slug, which is the translated one on the de/fr stores.
  const product = await repo.findActiveProduct(await resolveSlug('product', slug));
  if (!product) throw notFound('Product not found');

  const orderId = await repo.findPaidOrderId(userId, product.id, VERIFIED_STATUSES);

  const files = upload?.files ?? [];
  if (files.length > 0 && !upload?.config.enabled) {
    throw validation(undefined, 'Photo upload is switched off in this demo.');
  }
  // Photos are written before the insert so the row never points at a missing file; if the insert
  // then fails (duplicate review), the files are removed again.
  const photoPaths: string[] = [];
  try {
    for (const file of files) photoPaths.push(await savePhoto(upload!.config, file));
  } catch (err) {
    await removePhotos(upload!.config, photoPaths);
    throw err;
  }

  try {
    const row = await db.transaction(async (tx) => {
      const review = await repo.insertReview(tx, {
        productId: product.id,
        userId,
        orderId: orderId ?? null,
        rating: input.rating,
        title: input.title,
        body: input.body,
        verifiedBuyer: orderId !== undefined,
        petAgeMonths: input.petAgeMonths ?? null,
        petWeightG: input.petWeightG ?? null,
        sizePurchased: input.sizePurchased ?? null,
        wouldRecommend: input.wouldRecommend,
        status: 'pending',
      });
      if (photoPaths.length > 0) await repo.insertPhotos(tx, review.id, photoPaths);
      return review;
    });
    return { id: row.id, status: 'pending', verifiedBuyer: row.verifiedBuyer };
  } catch (err) {
    if (upload) await removePhotos(upload.config, photoPaths);
    // The unique (user, product) index is the real guard; a pre-check would race.
    if (uniqueViolation(err) === 'reviews_user_product_unique') {
      throw conflict('CONFLICT', 'You have already reviewed this product.');
    }
    throw err;
  }
}

// ---------- public reads ----------

const PAGE_SIZE = 10;
const TOPIC_TTL_MS = 5 * 60_000;

// Topics are recomputed from the approved texts, not stored, so moderation never has to maintain
// them; a 5 minute per-product cache keeps a busy product page from re-reading every review.
const topicCache = new Map<string, { at: number; topics: Topic[] }>();

export function clearTopicCache(): void {
  topicCache.clear();
}

async function topicsFor(productId: string, now: number): Promise<Topic[]> {
  const hit = topicCache.get(productId);
  if (hit && now - hit.at < TOPIC_TTL_MS && now >= hit.at) return hit.topics;
  const topics = extractTopics(await repo.approvedTexts(productId));
  topicCache.set(productId, { at: now, topics });
  return topics;
}

const authorName = (first: string | null, last: string | null) =>
  first ? `${first} ${(last ?? '').charAt(0)}.`.replace(/ \.$/, '') : 'A Pawsome customer';

export async function listReviews(
  slug: string,
  query: z.output<typeof ReviewListQuerySchema>,
  viewerId: string | null,
  uploadsEnabled: boolean,
  now = Date.now(),
): Promise<ReviewListResponse> {
  const productId = await repo.findProductId(await resolveSlug('product', slug));
  if (!productId) throw notFound('Product not found');

  const [page, sum, topics] = await Promise.all([
    repo.listApproved(
      productId,
      {
        ...(query.rating && { rating: query.rating }),
        ...(query.topic && { topic: query.topic.toLowerCase() }),
      },
      query.sort,
      viewerId,
      PAGE_SIZE,
      (query.page - 1) * PAGE_SIZE,
    ),
    repo.summary(productId),
    topicsFor(productId, now),
  ]);

  const photosOf = new Map<string, { id: string; path: string }[]>();
  for (const p of page.photos) {
    const list = photosOf.get(p.reviewId) ?? [];
    list.push({ id: p.id, path: p.path });
    photosOf.set(p.reviewId, list);
  }

  return {
    data: page.rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verifiedBuyer: r.verifiedBuyer,
      authorName: authorName(r.firstName, r.lastName),
      petAgeMonths: r.petAgeMonths,
      petWeightG: r.petWeightG,
      sizePurchased: r.sizePurchased,
      wouldRecommend: r.wouldRecommend,
      helpfulCount: r.helpfulCount,
      votedHelpful: r.voted,
      photos: photosOf.get(r.id) ?? [],
      createdAt: r.createdAt.toISOString(),
    })),
    meta: {
      page: query.page,
      limit: PAGE_SIZE,
      total: page.total,
      totalPages: Math.ceil(page.total / PAGE_SIZE),
    },
    summary: {
      rating: {
        count: sum.total,
        averageTenths: averageTenths(sum.total, sum.sum),
      },
      breakdown: [sum.s1, sum.s2, sum.s3, sum.s4, sum.s5],
      recommendPercent: sum.recommendPercent,
      topics,
      uploadsEnabled,
    },
  };
}

// Toggle: a second call from the same user takes the vote back. Your own review is off limits
// (403) and only approved reviews are public at all (anything else is a 404, not a hint).
export async function toggleHelpful(userId: string, reviewId: string) {
  const review = await repo.findApprovedReview(reviewId);
  if (!review) throw notFound('Review not found');
  if (review.userId === userId) throw forbidden('You cannot vote on your own review.');
  return repo.toggleVote(reviewId, userId);
}

// ---------- admin ----------

type AdminRows = Awaited<ReturnType<typeof repo.adminList>>;

function toAdminReview(r: AdminRows['rows'][number], photos: AdminRows['photos']): AdminReview {
  return {
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    productSlug: r.productSlug,
    authorName: authorName(r.firstName, r.lastName),
    // Moderators see the email (to judge "is this a real customer"); the public never does.
    authorEmail: r.email,
    rating: r.rating,
    title: r.title,
    body: r.body,
    verifiedBuyer: r.verifiedBuyer,
    petAgeMonths: r.petAgeMonths,
    petWeightG: r.petWeightG,
    sizePurchased: r.sizePurchased,
    wouldRecommend: r.wouldRecommend,
    status: r.status,
    rejectReason: r.rejectReason,
    photos: photos.filter((p) => p.reviewId === r.id).map((p) => ({ id: p.id, path: p.path })),
    createdAt: r.createdAt.toISOString(),
    moderatedAt: r.moderatedAt?.toISOString() ?? null,
  };
}

export async function adminList(
  query: z.output<typeof AdminReviewQuerySchema>,
): Promise<z.input<typeof AdminReviewListResponseSchema>> {
  const page = await repo.adminList(query.status, query.limit, (query.page - 1) * query.limit);
  return {
    data: page.rows.map((r) => toAdminReview(r, page.photos)),
    meta: {
      page: query.page,
      limit: query.limit,
      total: page.total,
      totalPages: Math.ceil(page.total / query.limit),
    },
  };
}

export async function adminOne(id: string): Promise<AdminReview> {
  const page = await repo.adminListOne(id);
  if (!page) throw notFound('Review not found');
  return toAdminReview(page.row, page.photos);
}
