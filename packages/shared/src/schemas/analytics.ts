import { z } from 'zod';

import { STORE_ZONE } from '../delivery.ts';

import { DataSchema } from './common.ts';

// ---------- admin analytics ----------

export const ANALYTICS_MAX_DAYS = 366;
// The shop's calendar: "a day" in every figure is a day in this zone, not in UTC or the viewer's.
// The same zone as dispatch cutoffs (one shop, one clock).
export const STORE_TIME_ZONE = STORE_ZONE;

export const AnalyticsIntervalSchema = z.enum(['day', 'week', 'month']);
export type AnalyticsInterval = z.infer<typeof AnalyticsIntervalSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-11-30');

// Money is reported one currency at a time and never summed across: a EUR order and a GBP order
// are different amounts, and no rate is applied (phase 21). EUR unless the admin picks another.
export const ReportCurrencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(z.string().regex(/^[A-Z]{3}$/, 'Use a currency code like EUR'))
  .default('EUR');

export const AdminAnalyticsQuerySchema = z.object({
  currency: ReportCurrencySchema,
  from: isoDate.optional(),
  to: isoDate.optional(),
  interval: AnalyticsIntervalSchema.default('day'),
  // A variant is "low" when what can be sold (quantity - reserved) is at or below this.
  lowStock: z.coerce.number().int().min(0).max(1000).default(5),
});
export type AdminAnalyticsQuery = z.input<typeof AdminAnalyticsQuerySchema>;

export const AnalyticsReportSchema = z.enum(['orders', 'products', 'low-stock']);
export type AnalyticsReport = z.infer<typeof AnalyticsReportSchema>;

export const AdminAnalyticsExportQuerySchema = AdminAnalyticsQuerySchema.extend({
  report: AnalyticsReportSchema,
});

const cents = z.number().int();

export const AnalyticsProductRowSchema = z.object({
  productId: z.string().nullable(),
  name: z.string(),
  units: z.number().int(),
  revenueCents: cents,
});

export const AdminAnalyticsSchema = z.object({
  range: z.object({
    from: z.string(),
    to: z.string(),
    interval: AnalyticsIntervalSchema,
    timeZone: z.string(),
  }),
  currency: z.string().length(3),
  // Paid-or-later orders placed in the range; revenue is net of refunds, integer cents.
  revenue: z.object({
    totalCents: cents,
    series: z.array(
      z.object({ bucket: z.string(), revenueCents: cents, orders: z.number().int() }),
    ),
  }),
  orders: z.number().int(),
  aovCents: cents,
  topByUnits: z.array(AnalyticsProductRowSchema),
  topByRevenue: z.array(AnalyticsProductRowSchema),
  lowStock: z.array(
    z.object({
      variantId: z.string(),
      productId: z.string(),
      sku: z.string(),
      productName: z.string(),
      variantName: z.string(),
      available: z.number().int(),
    }),
  ),
  lowStockThreshold: z.number().int(),
  returns: z.object({
    returnedUnits: z.number().int(),
    deliveredUnits: z.number().int(),
    /** Returned / delivered units in basis points (100 = 1 %), integer, half up. */
    rateBp: z.number().int(),
  }),
});
export type AdminAnalytics = z.infer<typeof AdminAnalyticsSchema>;
export const AdminAnalyticsResponseSchema = DataSchema(AdminAnalyticsSchema);
