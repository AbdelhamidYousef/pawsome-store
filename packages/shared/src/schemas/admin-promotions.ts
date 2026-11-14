import { z } from 'zod';

import { DataSchema } from './common.ts';

// Back-office contract for discount codes, bulk tiers and the gift rule. The database has check
// constraints for the same rules; these schemas give a person the sentence before the database does.

// Every amount column is a Postgres `integer` (int4): a bigger number would fail at the database
// with a 500 instead of a sentence.
const INT4_MAX = 2_147_483_647;
const Cents = z.number().int().max(INT4_MAX, 'That number is too large');
const Iso = z.iso.datetime({ offset: true });

export const DiscountKindSchema = z.enum(['percent', 'fixed', 'free_shipping']);
export type DiscountKind = z.infer<typeof DiscountKindSchema>;

// Amounts in the store currencies other than EUR (the plain cents fields are EUR): `{ GBP: 500 }`.
// A currency left out means the rule is not offered there; nothing is ever converted. On input the
// map is optional: left out, a PUT keeps what is stored; sent, it replaces the whole map.
export const OtherCurrencySchema = z.enum(['GBP']);
export type OtherCurrency = z.infer<typeof OtherCurrencySchema>;
export const NON_EUR_CURRENCIES = OtherCurrencySchema.options;
const ByCurrency = (amount: z.ZodNumber) => z.partialRecord(OtherCurrencySchema, amount);
const ByCurrencyOut = z.partialRecord(OtherCurrencySchema, Cents);

const optionalCap = (label: string) =>
  z
    .number()
    .int(`${label} must be a whole number`)
    .positive(`${label} must be above 0, or empty for no limit`)
    .nullable();

export const AdminDiscountCodeInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'A code needs at least 3 characters')
      .max(40, 'A code can have at most 40 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Codes are letters, numbers, - and _ only'),
    kind: DiscountKindSchema,
    // percent: 1..100. fixed: cents. free_shipping: 0.
    value: Cents,
    minSpendCents: Cents.min(0, 'The minimum spend cannot be negative').default(0),
    valueByCurrency: ByCurrency(Cents.positive('The amount must be above 0')).optional(),
    minSpendByCurrency: ByCurrency(Cents.min(0, 'The minimum spend cannot be negative')).optional(),
    startsAt: Iso.nullable().default(null),
    endsAt: Iso.nullable().default(null),
    maxUses: optionalCap('Total uses').default(null),
    perCustomerMax: optionalCap('Uses per customer').default(null),
    excludeSaleItems: z.boolean().default(false),
    firstOrderOnly: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'percent' && (v.value < 1 || v.value > 100)) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'A percentage is 1 to 100' });
    }
    if (v.kind === 'fixed' && v.value <= 0) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'The amount must be above 0' });
    }
    if (v.kind !== 'fixed' && v.valueByCurrency && Object.keys(v.valueByCurrency).length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['valueByCurrency'],
        message: 'Only a fixed amount has a value per currency',
      });
    }
    if (v.kind === 'free_shipping' && v.value !== 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Free shipping has no value',
      });
    }
    if (v.startsAt && v.endsAt && Date.parse(v.endsAt) <= Date.parse(v.startsAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'The end must be after the start',
      });
    }
  });
export type AdminDiscountCodeInput = z.input<typeof AdminDiscountCodeInputSchema>;
export type AdminDiscountCodeParsed = z.output<typeof AdminDiscountCodeInputSchema>;

export const AdminDiscountCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  kind: DiscountKindSchema,
  value: Cents,
  minSpendCents: Cents,
  valueByCurrency: ByCurrencyOut,
  minSpendByCurrency: ByCurrencyOut,
  startsAt: Iso.nullable(),
  endsAt: Iso.nullable(),
  maxUses: Cents.nullable(),
  perCustomerMax: Cents.nullable(),
  excludeSaleItems: z.boolean(),
  firstOrderOnly: z.boolean(),
  active: z.boolean(),
  archivedAt: Iso.nullable(),
  // Redemption rows that are not released: what the usage cap counts.
  liveRedemptions: Cents,
  createdAt: Iso,
});
export type AdminDiscountCode = z.infer<typeof AdminDiscountCodeSchema>;

export const AdminDiscountCodeListResponseSchema = DataSchema(z.array(AdminDiscountCodeSchema));
export const AdminDiscountCodeResponseSchema = DataSchema(AdminDiscountCodeSchema);

// DELETE answers what it did: a code that was ever redeemed is archived, never removed.
export const AdminDiscountCodeDeleteResponseSchema = DataSchema(
  z.object({ outcome: z.enum(['deleted', 'archived']) }),
);
export type AdminDiscountCodeDeleteResponse = z.infer<typeof AdminDiscountCodeDeleteResponseSchema>;

// ----- bulk tiers -----
export const AdminBulkTierInputSchema = z.object({
  minCents: Cents.positive('The threshold must be above 0'),
  minByCurrency: ByCurrency(Cents.positive('The threshold must be above 0')).optional(),
  percent: Cents.min(1, 'A percentage is 1 to 100').max(100, 'A percentage is 1 to 100'),
  active: z.boolean().default(true),
});
export type AdminBulkTierInput = z.input<typeof AdminBulkTierInputSchema>;
export type AdminBulkTierParsed = z.output<typeof AdminBulkTierInputSchema>;

export const AdminBulkTierSchema = z.object({
  id: z.string(),
  minCents: Cents,
  minByCurrency: ByCurrencyOut,
  percent: Cents,
  active: z.boolean(),
});
export type AdminBulkTier = z.infer<typeof AdminBulkTierSchema>;
export const AdminBulkTierListResponseSchema = DataSchema(z.array(AdminBulkTierSchema));
export const AdminBulkTierResponseSchema = DataSchema(AdminBulkTierSchema);

// ----- gift rule -----
export const AdminGiftRuleInputSchema = z.object({
  thresholdCents: Cents.positive('The threshold must be above 0'),
  thresholdByCurrency: ByCurrency(Cents.positive('The threshold must be above 0')).optional(),
  // A SKU or a variant id.
  variant: z.string().trim().min(1, 'Enter the gift variant SKU').max(80),
});
export type AdminGiftRuleInput = z.input<typeof AdminGiftRuleInputSchema>;

export const AdminGiftRuleSchema = z.object({
  id: z.string(),
  thresholdCents: Cents,
  thresholdByCurrency: ByCurrencyOut,
  variantId: z.string(),
  sku: z.string(),
  productName: z.string(),
  variantName: z.string(),
});
export type AdminGiftRule = z.infer<typeof AdminGiftRuleSchema>;
export const AdminGiftRuleResponseSchema = DataSchema(AdminGiftRuleSchema.nullable());

// ----- flash sales (step 18.8b) -----
export const AdminFlashSaleStatusSchema = z.enum(['scheduled', 'active', 'ended']);
export type AdminFlashSaleStatus = z.infer<typeof AdminFlashSaleStatusSchema>;

export const AdminFlashSaleItemInputSchema = z.object({
  // A SKU or a variant id.
  variant: z.string().trim().min(1, 'Enter the SKU').max(80),
  salePriceCents: Cents.positive('The sale price must be above 0'),
});
export type AdminFlashSaleItemInput = z.input<typeof AdminFlashSaleItemInputSchema>;

export const AdminFlashSaleInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Give the sale a name').max(80, 'At most 80 characters'),
    startsAt: Iso,
    endsAt: Iso,
    items: z
      .array(AdminFlashSaleItemInputSchema)
      .min(1, 'Add at least one item')
      .max(100, 'A sale can have at most 100 items'),
  })
  .superRefine((v, ctx) => {
    if (Date.parse(v.endsAt) <= Date.parse(v.startsAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'The end must be after the start',
      });
    }
  });
export type AdminFlashSaleInput = z.input<typeof AdminFlashSaleInputSchema>;
export type AdminFlashSaleInputParsed = z.output<typeof AdminFlashSaleInputSchema>;

// An active sale may only get an earlier end (ending it now is POST .../end).
export const AdminFlashSaleEndInputSchema = z.object({ endsAt: Iso });
export type AdminFlashSaleEndInput = z.input<typeof AdminFlashSaleEndInputSchema>;

export const AdminFlashSaleItemSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  sku: z.string(),
  productName: z.string(),
  variantName: z.string(),
  // The variant's regular price now (the % off is measured against it).
  regularCents: Cents,
  salePriceCents: Cents,
  // Omnibus reference fixed at activation; null before that or when there was no price history.
  referenceCents: Cents.nullable(),
});
export type AdminFlashSaleItem = z.infer<typeof AdminFlashSaleItemSchema>;

export const AdminFlashSaleSchema = z.object({
  id: z.string(),
  name: z.string(),
  startsAt: Iso,
  endsAt: Iso,
  status: AdminFlashSaleStatusSchema,
  itemCount: Cents,
  items: z.array(AdminFlashSaleItemSchema),
  createdAt: Iso,
});
export type AdminFlashSale = z.infer<typeof AdminFlashSaleSchema>;
export const AdminFlashSaleListResponseSchema = DataSchema(z.array(AdminFlashSaleSchema));
export const AdminFlashSaleResponseSchema = DataSchema(AdminFlashSaleSchema);

// The variant behind a SKU, for the form's "regular price" and % off before saving.
export const AdminVariantLookupResponseSchema = DataSchema(
  z.object({
    variantId: z.string(),
    sku: z.string(),
    productName: z.string(),
    variantName: z.string(),
    regularCents: Cents,
  }),
);
export type AdminVariantLookup = z.infer<typeof AdminVariantLookupResponseSchema>['data'];
