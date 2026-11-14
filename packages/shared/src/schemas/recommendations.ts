import { z } from 'zod';

import { MAX_LINE_QUANTITY } from './cart.ts';
import { ProductCardSchema } from './catalog.ts';
import { DataSchema } from './common.ts';

// What "frequently bought together" adds to the cart for one product: its default sellable
// variant (a size picker per suggestion would bury the block), with the price the shopper sees.
export const RecommendedVariantSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  priceCents: z.number().int().min(0),
  // A running flash sale's price, or null. Member prices are never in here: this answer is
  // cacheable and must read the same for everybody.
  saleCents: z.number().int().min(0).nullable(),
  // The running sale's 30-day reference price (Omnibus), or null: "You save" is counted from it.
  referenceCents: z.number().int().min(0).nullable(),
  currency: z.string().length(3),
});
export type RecommendedVariant = z.infer<typeof RecommendedVariantSchema>;

export const RecommendationItemSchema = z.object({
  card: ProductCardSchema,
  variant: RecommendedVariantSchema,
});
export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;

export const RecommendationsSchema = z.object({
  boughtTogether: z.array(RecommendationItemSchema),
  related: z.array(ProductCardSchema),
});
export type Recommendations = z.infer<typeof RecommendationsSchema>;
export const RecommendationsResponseSchema = DataSchema(RecommendationsSchema);

export const MAX_BY_IDS = 12;
// `?ids=a,b,c`: a comma list of product ids, in the order the caller wants them back.
export const ByIdsQuerySchema = z.object({
  ids: z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.uuid()).min(1).max(MAX_BY_IDS)),
});
export const ByIdsResponseSchema = DataSchema(z.array(ProductCardSchema));

// ---------- bulk add ----------

export const MAX_BULK_LINES = 10;
export const BulkAddCartItemsSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.uuid(),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .min(1)
    .max(MAX_BULK_LINES)
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      items.forEach((item, i) => {
        if (seen.has(item.variantId)) {
          ctx.addIssue({ code: 'custom', path: [i, 'variantId'], message: 'Each item once' });
        }
        seen.add(item.variantId);
      });
    }),
});
export type BulkAddCartItemsInput = z.input<typeof BulkAddCartItemsSchema>;

// What a refused bulk add says per line (in the error's `details.failures`).
export const BulkAddFailureSchema = z.object({
  variantId: z.string(),
  code: z.enum(['NOT_FOUND', 'OUT_OF_STOCK', 'TRIAL_LIMIT']),
  message: z.string(),
  maxQty: z.number().int().min(0).optional(),
});
export type BulkAddFailure = z.infer<typeof BulkAddFailureSchema>;
