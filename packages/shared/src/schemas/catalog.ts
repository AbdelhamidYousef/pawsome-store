import { z } from 'zod';

import { BADGES, BADGE_SLUGS } from '../badges.ts';
import { FeedingRowSchema } from '../feeding.ts';
import { NetUnitSchema } from '../pets.ts';

import { BundleDetailSchema, KitTeaserSchema } from './bundles.ts';
import { PaginatedSchema, PaginationQuerySchema, DataSchema, LangSlugsSchema } from './common.ts';
import { ConstituentSchema, FaqSchema, SizeGuideSchema, SpecSchema } from './pdp.ts';
import { MemberOfferSchema, SaleOfferSchema } from './promotions.ts';
import { RatingSummarySchema } from './reviews.ts';
import { SafetyNoticeSchema } from './safety.ts';

// Attribute keys the shop filters and builds facets on. A constant, not "whatever is in the
// jsonb", so the filter UI is predictable and the facet query stays cheap.
export const FACET_KEYS = ['pet', 'material', 'ageStage'] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

// ---------- shared pieces ----------

export const ImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  alt: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  variantId: z.string().nullable(),
});
export type ProductImage = z.infer<typeof ImageSchema>;

export const PriceRangeSchema = z.object({
  minCents: z.number().int().min(0),
  maxCents: z.number().int().min(0),
  currency: z.string().length(3),
});
export type PriceRange = z.infer<typeof PriceRangeSchema>;

// ---------- categories ----------

export const CategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  parentId: z.string().nullable(),
  sortOrder: z.number().int(),
  // Theme data for the per-pet look; only top-level categories have it.
  accentColor: z.string().nullable(),
  icon: z.string().nullable(),
  // Active products in this category, children included, so a parent shows its true total.
  productCount: z.number().int().min(0),
});
export type Category = z.infer<typeof CategorySchema>;

// The tree is one level deep (Dogs > Toys), so children are plain categories, no recursion.
export const CategoryNodeSchema = CategorySchema.extend({
  children: z.array(CategorySchema),
  // Detail endpoint only (hreflang).
  slugs: LangSlugsSchema.optional(),
});
export type CategoryNode = z.infer<typeof CategoryNodeSchema>;

export const CategoryTreeResponseSchema = DataSchema(z.array(CategoryNodeSchema));
export const CategoryResponseSchema = DataSchema(CategoryNodeSchema);

// ---------- product cards (lists) ----------

export const BadgeSchema = z.enum(BADGES);

// Derived on the server (packages/shared/src/badges.ts); never raw stock numbers.
export const UnitPriceSchema = z.object({
  cents: z.number().int().min(0),
  per: z.enum(['kg', 'L']),
});
export type UnitPriceDto = z.infer<typeof UnitPriceSchema>;

export const BrandRefSchema = z.object({ slug: z.string(), name: z.string() });
export type BrandRef = z.infer<typeof BrandRefSchema>;

// One dot per colour on a card. `image` is that colour's own picture when there is one.
export const SwatchSchema = z.object({
  color: z.string(),
  hex: z.string(),
  image: ImageSchema.nullable(),
});
export type Swatch = z.infer<typeof SwatchSchema>;

export const CardAttributesSchema = z.object({
  pet: z.string().optional(),
  material: z.string().optional(),
  brand: z.string().optional(),
  ageStage: z.string().optional(),
});

export const ProductCardSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  categorySlug: z.string(),
  image: ImageSchema.nullable(),
  price: PriceRangeSchema,
  inStock: z.boolean(),
  attributes: CardAttributesSchema,
  brand: BrandRefSchema.nullable(),
  badges: z.array(BadgeSchema),
  // Of the default variant; null when it has no net amount (a toy).
  unitPrice: UnitPriceSchema.nullable(),
  swatches: z.array(SwatchSchema),
  // The best flash-sale offer among the product's variants right now; null when none.
  sale: SaleOfferSchema.nullable(),
  // True when a variant has a member price below its regular one; the amount is in `member` and
  // only for a signed-in shopper (null for guests).
  hasMemberPrice: z.boolean(),
  member: MemberOfferSchema.nullable(),
  // Approved reviews only (denormalised on the product, phase 17); count 0 means "no stars shown".
  rating: RatingSummarySchema,
});
export type ProductCard = z.infer<typeof ProductCardSchema>;

// ---------- facets ----------

export const FacetValueSchema = z.object({
  value: z.string(),
  count: z.number().int().min(0),
  // Display text when the value is a slug (brand, tag).
  label: z.string().optional(),
});

export const FacetsSchema = z.object({
  attributes: z.record(z.string(), z.array(FacetValueSchema)),
  // Normalised relations and derived badges, counted over the same scope as the attributes.
  brand: z.array(FacetValueSchema),
  tag: z.array(FacetValueSchema),
  badge: z.array(FacetValueSchema),
  // Null when the current result set is empty.
  price: z.object({ min: z.number().int(), max: z.number().int() }).nullable(),
});
export type Facets = z.infer<typeof FacetsSchema>;

// The quick-filter chips for this result set, already ordered (see quick-chips.ts). Defaulted so a
// response (or a test fixture) that predates them still parses.
export const QuickChipSchema = z.object({
  kind: z.enum(['badge', 'brand', 'tag']),
  value: z.string(),
  label: z.string(),
  count: z.number().int().min(0),
});

export const ProductListResponseSchema = PaginatedSchema(ProductCardSchema).extend({
  facets: FacetsSchema,
  chips: z.array(QuickChipSchema).default([]),
});
export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;

// ---------- product detail ----------

export const VariantSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  options: z.record(z.string(), z.string()),
  priceCents: z.number().int().min(0),
  compareAtPriceCents: z.number().int().min(0).nullable(),
  currency: z.string().length(3),
  isDefault: z.boolean(),
  // Never the raw stock count: that is business information a competitor could scrape.
  available: z.boolean(),
  lowStock: z.boolean(),
  netAmount: z.number().int().positive().nullable(),
  netUnit: NetUnitSchema.nullable(),
  unitPrice: UnitPriceSchema.nullable(),
  isTrial: z.boolean(),
  swatchHex: z.string().nullable(),
  sale: SaleOfferSchema.nullable(),
  hasMemberPrice: z.boolean(),
  member: MemberOfferSchema.nullable(),
  // Guaranteed analysis per 100 g (empty for a toy). The tab shows the selected variant's.
  constituents: z.array(ConstituentSchema),
});
export type Variant = z.infer<typeof VariantSchema>;

export const BreadcrumbItemSchema = z.object({ slug: z.string(), name: z.string() });

export const ProductDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  // The slug in every UI language, for hreflang.
  slugs: LangSlugsSchema.optional(),
  name: z.string(),
  description: z.string(),
  category: BreadcrumbItemSchema,
  // Root first, current category last.
  breadcrumb: z.array(BreadcrumbItemSchema),
  attributes: z.object({
    pet: z.string().optional(),
    material: z.string().optional(),
    brand: z.string().optional(),
    ageStage: z.string().optional(),
    size: z.string().optional(),
  }),
  brand: BrandRefSchema.nullable(),
  tags: z.array(z.object({ slug: z.string(), name: z.string() })),
  badges: z.array(BadgeSchema),
  // Ordered option axes the picker is built from, e.g. ["color", "size"].
  optionKeys: z.array(z.string()),
  price: PriceRangeSchema,
  inStock: z.boolean(),
  variants: z.array(VariantSchema),
  images: z.array(ImageSchema),
  // Active safety notices (recalls, warnings) that touch any variant of this product.
  safetyNotices: z.array(SafetyNoticeSchema),
  specs: z.array(SpecSchema),
  faqs: z.array(FaqSchema),
  // Empty for products that are not fed (a toy), and then the Feeding guide tab is left out.
  feedingTable: z.array(FeedingRowSchema),
  sizeGuide: SizeGuideSchema.nullable(),
  deliveryNote: z.string().nullable(),
  // Set on a kit's own page (what is inside, what it saves); null for an ordinary product.
  bundle: BundleDetailSchema.nullable(),
  // Kits this product is part of ("Make it a kit"); empty for most products.
  kits: z.array(KitTeaserSchema),
  rating: RatingSummarySchema,
  // Demo gate: the order waits for a (simulated) vet's approval after payment.
  requiresVetApproval: z.boolean(),
});
export type ProductDetail = z.infer<typeof ProductDetailSchema>;
export const ProductDetailResponseSchema = DataSchema(ProductDetailSchema);

// ---------- list query ----------

export const PRODUCT_SORTS = [
  'relevance',
  'price_asc',
  'price_desc',
  'unit_price_asc',
  'newest',
  'name',
] as const;
export const ProductSortSchema = z.enum(PRODUCT_SORTS);
export type ProductSort = z.infer<typeof ProductSortSchema>;

// Express's default query parser leaves `attr.material=plush,rubber` as the flat key
// "attr.material". This moves every such key into one `attr` object before validation, so the
// schema describes the shape the code wants, not the shape the URL happens to have.
const ATTR_PREFIX = 'attr.';
function groupAttrParams(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input;
  const out: Record<string, unknown> = {};
  const attr: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith(ATTR_PREFIX)) attr[key.slice(ATTR_PREFIX.length)] = value;
    else out[key] = value;
  }
  if (Object.keys(attr).length > 0) out.attr = attr;
  return out;
}

// "plush,rubber" -> ['plush', 'rubber']; a repeated parameter arrives as an array and is joined
// the same way, so `?attr.x=a&attr.x=b` and `?attr.x=a,b` mean the same thing.
const AttrValuesSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(',')))
  .pipe(z.array(z.string().trim().min(1).max(60)).min(1).max(20));

// A comma list or repeated parameter of slugs ("a,b" or ?x=a&x=b) -> ['a', 'b'].
const SlugListSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(',')))
  .pipe(z.array(z.string().trim().min(1).max(60)).min(1).max(20));

const BooleanFlagSchema = z.enum(['true', 'false']).transform((v) => v === 'true');

export const ProductListQuerySchema = z.preprocess(
  groupAttrParams,
  PaginationQuerySchema.extend({
    category: z.string().trim().min(1).max(100).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    // Left unset by default: the service picks `relevance` when there is a search and `newest`
    // otherwise, which a static schema default cannot express.
    sort: ProductSortSchema.optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    inStock: BooleanFlagSchema.optional(),
    // OR within one filter, AND across filters (same rule as `attr`).
    brand: SlugListSchema.optional(),
    tag: SlugListSchema.optional(),
    badge: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(',')))
      .pipe(z.array(z.enum(BADGE_SLUGS)).min(1).max(5))
      .optional(),
    // Browse one collection; only a collection that is live right now matches anything.
    collection: z.string().trim().min(1).max(100).optional(),
    attr: z
      .record(
        z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,31}$/, 'invalid attribute key'),
        AttrValuesSchema,
      )
      .default({}),
  }).refine(
    (q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice,
    {
      message: 'minPrice must not exceed maxPrice',
      path: ['minPrice'],
    },
  ),
);
export type ProductListQuery = z.output<typeof ProductListQuerySchema>;

export const SlugParamsSchema = z.object({ slug: z.string().trim().min(1).max(200) });
