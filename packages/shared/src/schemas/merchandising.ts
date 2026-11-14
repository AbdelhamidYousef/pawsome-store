import { z } from 'zod';

import { DataSchema, LangSlugsSchema } from './common.ts';

// Brands, collections and health-need tags: the "merchandising" side of the catalogue. Public
// shapes first, then the admin inputs.

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(SLUG_PATTERN, 'Lower-case letters, digits and dashes');
const ColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'A colour like #A1B2C3');

// ---------- public ----------

export const BrandSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  tagline: z.string(),
  story: z.string(),
  accentColor: z.string(),
  logoUrl: z.string().nullable(),
  // Active products that carry the brand.
  productCount: z.number().int().min(0),
  // Detail endpoint only (hreflang).
  slugs: LangSlugsSchema.optional(),
});
export type Brand = z.infer<typeof BrandSchema>;
export const BrandListResponseSchema = DataSchema(z.array(BrandSchema));
export const BrandResponseSchema = DataSchema(BrandSchema);

export const CollectionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  accentColor: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  productCount: z.number().int().min(0),
  // Detail endpoint only (hreflang).
  slugs: LangSlugsSchema.optional(),
});
export type Collection = z.infer<typeof CollectionSchema>;
export const CollectionListResponseSchema = DataSchema(z.array(CollectionSchema));
export const CollectionResponseSchema = DataSchema(CollectionSchema);

export const TagSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  productCount: z.number().int().min(0),
});
export type Tag = z.infer<typeof TagSchema>;
export const TagListResponseSchema = DataSchema(z.array(TagSchema));

// ---------- admin ----------

export const AdminBrandInputSchema = z.object({
  slug: SlugSchema,
  name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(120).default(''),
  story: z.string().trim().max(600).default(''),
  accentColor: ColorSchema.default('#F59E0B'),
  logoUrl: z.string().trim().max(300).nullish(),
});
export type AdminBrandInput = z.input<typeof AdminBrandInputSchema>;

// The slug is not editable: /brands/:slug must not move because a name was corrected.
export const AdminBrandUpdateSchema = AdminBrandInputSchema.omit({ slug: true })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'Nothing to update');
export type AdminBrandUpdate = z.input<typeof AdminBrandUpdateSchema>;

const IsoDate = z.iso.datetime({ offset: true });

const collectionWindowOk = (v: { startsAt?: string | null; endsAt?: string | null }) =>
  !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt);
const WINDOW_MESSAGE = 'The end must be after the start';

export const AdminCollectionInputSchema = z
  .object({
    slug: SlugSchema,
    name: z.string().trim().min(1).max(60),
    description: z.string().trim().max(300).default(''),
    accentColor: ColorSchema.default('#8B5CF6'),
    startsAt: IsoDate.nullish(),
    endsAt: IsoDate.nullish(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(10_000).default(0),
  })
  .refine(collectionWindowOk, { message: WINDOW_MESSAGE, path: ['endsAt'] });
export type AdminCollectionInput = z.input<typeof AdminCollectionInputSchema>;

export const AdminCollectionUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    description: z.string().trim().max(300),
    accentColor: ColorSchema,
    startsAt: IsoDate.nullable(),
    endsAt: IsoDate.nullable(),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(10_000),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'Nothing to update')
  .refine(collectionWindowOk, { message: WINDOW_MESSAGE, path: ['endsAt'] });
export type AdminCollectionUpdate = z.input<typeof AdminCollectionUpdateSchema>;

export const AdminCollectionSchema = CollectionSchema.extend({
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  // Switched on and inside its window right now (what the public sees).
  isLive: z.boolean(),
  // Ordered members (id, name, slug), so the admin picker can show and reorder them.
  productIds: z.array(z.string()),
  products: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
});
export type AdminCollection = z.infer<typeof AdminCollectionSchema>;
export const AdminCollectionListResponseSchema = DataSchema(z.array(AdminCollectionSchema));
export const AdminCollectionResponseSchema = DataSchema(AdminCollectionSchema);

// The whole ordered list replaces the previous one (that is how reordering is saved).
export const AdminCollectionProductsSchema = z.object({
  productIds: z
    .array(z.uuid())
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, 'A product can appear once'),
});
export type AdminCollectionProducts = z.input<typeof AdminCollectionProductsSchema>;

export const AdminTagInputSchema = z.object({
  slug: SlugSchema,
  name: z.string().trim().min(1).max(40),
});
export type AdminTagInput = z.input<typeof AdminTagInputSchema>;
export const AdminTagUpdateSchema = z.object({ name: z.string().trim().min(1).max(40) });

export const AdminProductTagsSchema = z.object({
  tagIds: z
    .array(z.uuid())
    .max(12)
    .refine((ids) => new Set(ids).size === ids.length, 'A tag can appear once'),
});
export type AdminProductTags = z.input<typeof AdminProductTagsSchema>;
