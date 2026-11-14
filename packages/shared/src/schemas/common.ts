import { z } from 'zod';

// Every success response is `{ data }`; lists add `meta`. Defining the envelope here (not in the
// API) means the web parses responses with the very schema the API validated them against.
export const DataSchema = <T extends z.ZodType>(item: T) => z.object({ data: item });

// A catalogue page's slug in every UI language: its translated slug, or the English one where it has
// none. Only detail endpoints fill it; <Seo> uses it so each hreflang alternate carries the slug of
// its own store view (not the current page's slug, which would only work through a redirect).
export const LangSlugsSchema = z.object({ en: z.string(), de: z.string(), fr: z.string() });
export type LangSlugs = z.infer<typeof LangSlugsSchema>;

export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const PaginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), meta: PaginationMetaSchema });

// Offset pagination (see decisions log): page is 1-based, and limit is capped so one request
// cannot ask the database for the whole catalog.
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

// Optional text: an empty string means "none", so forms can send what the input holds. `undefined`
// stays undefined, which on a PATCH means "leave it alone".
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v === undefined ? undefined : v === null || v === '' ? null : v));

export const requiredText = (max: number) => z.string().trim().min(1, 'Required').max(max);
