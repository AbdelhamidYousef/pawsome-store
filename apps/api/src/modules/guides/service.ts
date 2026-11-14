import {
  readingMinutes,
  type GuideCard,
  type GuideCategory,
  type GuideDetail,
  type GuideListQuery,
  type GuideListResponse,
} from '@store/shared';

import { notFound } from '../../lib/errors.ts';
import * as catalog from '../catalog/service.ts';
import { loadTranslations, overlay, pick, resolveSlug, slugsByLang } from '../i18n/translations.ts';

import * as repo from './repo.ts';

const RELATED_COUNT = 3;

function toCard(row: repo.GuideCardRow): GuideCard {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverUrl: row.coverUrl,
    category: { slug: row.categorySlug, name: row.categoryName },
    // Visible guides always have a date (the visibility rule compares it with now()).
    publishedAt: (row.publishedAt ?? new Date(0)).toISOString(),
    readingMinutes: readingMinutes(row.words),
  };
}

export async function listCategories(): Promise<GuideCategory[]> {
  const rows = await repo.listCategories();
  return rows.filter((r) => r.guideCount > 0);
}

const translateCards = <T extends GuideCard>(cards: T[]) =>
  overlay('guide', cards, (c, t) => ({
    ...c,
    slug: pick(t, 'slug', c.slug),
    title: pick(t, 'title', c.title),
    summary: pick(t, 'summary', c.summary),
  }));

export async function listGuides(query: GuideListQuery): Promise<GuideListResponse> {
  const { rows, total } = await repo.listGuides({
    category: query.category,
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  });
  return {
    data: await translateCards(rows.map(toCard)),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getGuide(slugFromUrl: string): Promise<GuideDetail> {
  const guide = await repo.findGuideBySlug(await resolveSlug('guide', slugFromUrl));
  // Unknown, draft and not-yet-published guides all look the same from outside: 404.
  if (!guide) throw notFound('Guide not found');
  const [productIds, related] = await Promise.all([
    repo.listProductIds(guide.id),
    repo.listRelated(guide, RELATED_COUNT),
  ]);
  const [[card], relatedCards, translations, slugs] = await Promise.all([
    translateCards([toCard(guide)]),
    translateCards(related.map(toCard)),
    loadTranslations('guide', [guide.slug]),
    slugsByLang('guide', guide.slug),
  ]);
  return {
    ...(card as GuideCard),
    slugs,
    bodyMd: pick(translations.get(guide.slug), 'bodyMd', guide.bodyMd),
    products: await catalog.listCardsByIds(productIds),
    related: relatedCards,
  };
}
