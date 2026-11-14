import { z } from 'zod';

import { ProductCardSchema } from './catalog.ts';
import { DataSchema, LangSlugsSchema, PaginatedSchema, PaginationQuerySchema } from './common.ts';

// ---------- pet-care guides (public) ----------

export const GuideCategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  guideCount: z.number().int().min(0),
});
export type GuideCategory = z.infer<typeof GuideCategorySchema>;
export const GuideCategoriesResponseSchema = DataSchema(z.array(GuideCategorySchema));

export const GuideCardSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  coverUrl: z.string().nullable(),
  category: z.object({ slug: z.string(), name: z.string() }),
  publishedAt: z.string(),
  readingMinutes: z.number().int().min(1),
});
export type GuideCard = z.infer<typeof GuideCardSchema>;

export const GuideListQuerySchema = PaginationQuerySchema.extend({
  category: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export type GuideListQuery = z.infer<typeof GuideListQuerySchema>;
export const GuideListResponseSchema = PaginatedSchema(GuideCardSchema);
export type GuideListResponse = z.infer<typeof GuideListResponseSchema>;

export const GuideDetailSchema = GuideCardSchema.extend({
  bodyMd: z.string(),
  products: z.array(ProductCardSchema),
  related: z.array(GuideCardSchema),
  // The slug in every UI language, for hreflang.
  slugs: LangSlugsSchema.optional(),
});
export type GuideDetail = z.infer<typeof GuideDetailSchema>;
export const GuideDetailResponseSchema = DataSchema(GuideDetailSchema);

// Words per minute for the "N min read" label: a common adult silent-reading figure.
export const READING_WPM = 200;
export const readingMinutes = (words: number): number =>
  Math.max(1, Math.ceil(words / READING_WPM));
