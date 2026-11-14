import { z } from 'zod';

import { storeCodeSchema } from '../stores.ts';

import { IdParamsSchema } from './account.ts';
import { DataSchema } from './common.ts';
import { CartPricingSchema } from './promotions.ts';

// Most of one line a shopper may hold; mirrors the cart_items check constraint.
export const MAX_LINE_QUANTITY = 99;

// ---------- requests ----------

export const AddCartItemSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});
export type AddCartItemInput = z.input<typeof AddCartItemSchema>;

// 0 removes the line, so the stepper's "minus" at 1 can send a single request.
export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(MAX_LINE_QUANTITY),
});
export type UpdateCartItemInput = z.input<typeof UpdateCartItemSchema>;

export const CartItemParamsSchema = IdParamsSchema;

// ---------- the cart ----------

export const CartItemSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSlug: z.string(),
  variantName: z.string(),
  sku: z.string(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  // Current catalog price: the cart stores none, so this is always fresh.
  unitPriceCents: z.number().int().min(0),
  quantity: z.number().int().min(1),
  // unitPrice x quantity, also for a sold-out line (shown struck through); only purchasable lines
  // count toward the cart's subtotal.
  lineTotalCents: z.number().int().min(0),
  // Units that can be bought right now (stock minus reserved); 0 means sold out.
  available: z.number().int().min(0),
  // The most the stepper may offer: min(99, available).
  maxQty: z.number().int().min(0),
});
export type CartItem = z.infer<typeof CartItemSchema>;

// OUT_OF_STOCK: available is 0; the line stays (greyed) so the shopper sees what happened.
// QTY_REDUCED: the quantity exceeded stock and was lowered (`quantity` is the new value).
// VARIANT_UNAVAILABLE: the product or variant was archived; the line was removed.
// PRICE_CHANGED: the catalog price differs from the one the shopper last saw; shown once, with
// `previousUnitPriceCents` and the new `unitPriceCents`.
export const CartWarningCodeSchema = z.enum([
  'OUT_OF_STOCK',
  'QTY_REDUCED',
  'VARIANT_UNAVAILABLE',
  'PRICE_CHANGED',
]);
export type CartWarningCode = z.infer<typeof CartWarningCodeSchema>;

export const CartWarningSchema = z.object({
  code: CartWarningCodeSchema,
  variantId: z.string(),
  productName: z.string(),
  variantName: z.string(),
  previousQuantity: z.number().int().optional(),
  quantity: z.number().int().optional(),
  previousUnitPriceCents: z.number().int().min(0).optional(),
  unitPriceCents: z.number().int().min(0).optional(),
});
export type CartWarning = z.infer<typeof CartWarningSchema>;

export const CartSchema = z.object({
  items: z.array(CartItemSchema),
  currency: z.string().length(3),
  // Purchasable lines only (sold-out lines are excluded from every total below).
  subtotalCents: z.number().int().min(0),
  itemCount: z.number().int().min(0),
  weightGrams: z.number().int().min(0),
  // Things that changed since the shopper last looked; empty on a calm cart.
  warnings: z.array(CartWarningSchema),
  // Promotions applied by the pricing engine (phase 18).
  pricing: CartPricingSchema,
  // True when a line the shopper can buy needs a vet's approval: checkout then asks for the vet.
  requiresVetApproval: z.boolean(),
});
export type Cart = z.infer<typeof CartSchema>;

export const CartResponseSchema = DataSchema(CartSchema);
export type CartResponse = z.infer<typeof CartResponseSchema>;

// Details attached to an OUT_OF_STOCK 409 from the mutation endpoints.
export const OutOfStockDetailsSchema = z.object({
  variantId: z.string(),
  // What the shopper may hold of this variant in total (min(99, available)).
  maxQty: z.number().int().min(0),
  // What they already hold.
  inCart: z.number().int().min(0),
  requested: z.number().int().min(0),
});
export type OutOfStockDetails = z.infer<typeof OutOfStockDetailsSchema>;

// What switching to another store view would drop from the cart: the lines with no price in that
// store's currency (nothing is ever converted). A read, so the shopper can be asked first; the
// lines only really drop when the cart is next read in the new store.
export const StoreSwitchPreviewQuerySchema = z.object({ store: storeCodeSchema });
export const StoreSwitchPreviewSchema = z.object({
  dropped: z.array(
    z.object({ variantId: z.string(), productName: z.string(), variantName: z.string() }),
  ),
});
export type StoreSwitchPreview = z.infer<typeof StoreSwitchPreviewSchema>;
export const StoreSwitchPreviewResponseSchema = DataSchema(StoreSwitchPreviewSchema);
