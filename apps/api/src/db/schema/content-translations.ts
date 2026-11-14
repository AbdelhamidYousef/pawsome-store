import type { SizeGuideTable } from '@store/shared';
import { jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { charities } from './charity.ts';
import { galleryPhotos } from './gallery.ts';
import { helpArticles } from './help-articles.ts';
import { productFaqs, productSpecs } from './pdp-content.ts';
import { sizeGuides } from './size-guides.ts';

// Translations of the content that has no slug of its own (help answers, product specs and FAQs,
// size guides, gallery captions, the charity). Same rules as translations.ts: English stays in the
// base columns and is the fallback, every translated column is NULLABLE (null = show English,
// decided field by field), `locale` is `de` or `fr`, and a row goes with its parent (cascade).
// These are keyed by the parent's id, not by a slug: they have no URL, so no per-locale slug,
// no meta fields, and nothing for the catalogue overlay (which looks rows up by slug) to join on.
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
const locale = () => text('locale').notNull();

export const helpArticleTranslations = pgTable(
  'help_article_translations',
  {
    articleId: uuid('article_id')
      .notNull()
      .references(() => helpArticles.id, { onDelete: 'cascade' }),
    locale: locale(),
    question: text('question'),
    answerMd: text('answer_md'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.locale] })],
);

export const productSpecTranslations = pgTable(
  'product_spec_translations',
  {
    specId: uuid('spec_id')
      .notNull()
      .references(() => productSpecs.id, { onDelete: 'cascade' }),
    locale: locale(),
    label: text('label'),
    value: text('value'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.specId, t.locale] })],
);

export const productFaqTranslations = pgTable(
  'product_faq_translations',
  {
    faqId: uuid('faq_id')
      .notNull()
      .references(() => productFaqs.id, { onDelete: 'cascade' }),
    locale: locale(),
    question: text('question'),
    answer: text('answer'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.faqId, t.locale] })],
);

export const sizeGuideTranslations = pgTable(
  'size_guide_translations',
  {
    sizeGuideId: uuid('size_guide_id')
      .notNull()
      .references(() => sizeGuides.id, { onDelete: 'cascade' }),
    locale: locale(),
    title: text('title'),
    // The whole chart in the language: column headings, row labels and cell texts. The row `size`
    // (the option value a variant carries) is always taken from the English chart, never from here.
    rows: jsonb('rows').$type<SizeGuideTable>(),
    howtoMd: text('howto_md'),
    tip: text('tip'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.sizeGuideId, t.locale] })],
);

export const galleryPhotoTranslations = pgTable(
  'gallery_photo_translations',
  {
    photoId: uuid('photo_id')
      .notNull()
      .references(() => galleryPhotos.id, { onDelete: 'cascade' }),
    locale: locale(),
    caption: text('caption'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.photoId, t.locale] })],
);

export const charityTranslations = pgTable(
  'charity_translations',
  {
    charityId: uuid('charity_id')
      .notNull()
      .references(() => charities.id, { onDelete: 'cascade' }),
    locale: locale(),
    name: text('name'),
    description: text('description'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.charityId, t.locale] })],
);
