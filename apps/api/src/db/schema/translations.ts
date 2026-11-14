import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { brands } from './brands.ts';
import { categories } from './categories.ts';
import { collections } from './collections.ts';
import { guides } from './guides.ts';
import { products } from './products.ts';

// Catalogue translations: one table per entity (a JSONB column could not carry a per-locale
// unique slug or a foreign key). English stays in the base columns and is the fallback, so every
// translated column here is NULLABLE: null means "not translated yet, show the English field",
// decided field by field. `locale` is the language (`de`, `fr`); both English store views share
// the base columns. `slug` is unique per locale, and a null slug keeps the English URL.
const common = {
  locale: text('locale').notNull(),
  slug: text('slug'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const productTranslations = pgTable(
  'product_translations',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name'),
    description: text('description'),
    // The "ships separately" style note under the delivery tab (products.delivery_note).
    deliveryNote: text('delivery_note'),
    ...common,
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.locale] }),
    uniqueIndex('product_translations_locale_slug_idx').on(t.locale, t.slug),
    index('product_translations_name_idx').on(t.locale, t.name),
  ],
);

export const categoryTranslations = pgTable(
  'category_translations',
  {
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    name: text('name'),
    description: text('description'),
    ...common,
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.locale] }),
    uniqueIndex('category_translations_locale_slug_idx').on(t.locale, t.slug),
  ],
);

export const brandTranslations = pgTable(
  'brand_translations',
  {
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    name: text('name'),
    tagline: text('tagline'),
    story: text('story'),
    ...common,
  },
  (t) => [
    primaryKey({ columns: [t.brandId, t.locale] }),
    uniqueIndex('brand_translations_locale_slug_idx').on(t.locale, t.slug),
  ],
);

export const collectionTranslations = pgTable(
  'collection_translations',
  {
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    name: text('name'),
    description: text('description'),
    ...common,
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.locale] }),
    uniqueIndex('collection_translations_locale_slug_idx').on(t.locale, t.slug),
  ],
);

export const guideTranslations = pgTable(
  'guide_translations',
  {
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guides.id, { onDelete: 'cascade' }),
    title: text('title'),
    summary: text('summary'),
    bodyMd: text('body_md'),
    ...common,
  },
  (t) => [
    primaryKey({ columns: [t.guideId, t.locale] }),
    uniqueIndex('guide_translations_locale_slug_idx').on(t.locale, t.slug),
  ],
);
