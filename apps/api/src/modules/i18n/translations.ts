/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- the five table pairs share a shape but not a type; this file is the one place that treats them alike */
import type { LangSlugs } from '@store/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import {
  brands,
  brandTranslations,
  categories,
  categoryTranslations,
  collections,
  collectionTranslations,
  guides,
  guideTranslations,
  products,
  productTranslations,
} from '../../db/schema/index.ts';

import { currentLang } from './context.ts';

// Read side of the catalogue translations. Services build their English answer as before and then
// lay the translated fields over it: `overlay` looks the rows up by the English (base) slug, which
// every response already carries, so no query had to change. A field that is null or has no row
// falls back to English one by one (`pick`).

export type Entity = 'product' | 'category' | 'brand' | 'collection' | 'guide';
export type Translation = Record<string, string | null | undefined>;

export const TABLES: Record<
  Entity,
  { base: any; tr: any; fk: any; fkKey: string; fields: string[] }
> = {
  product: {
    base: products,
    tr: productTranslations,
    fk: productTranslations.productId,
    fkKey: 'productId',
    fields: ['name', 'description'],
  },
  category: {
    base: categories,
    tr: categoryTranslations,
    fk: categoryTranslations.categoryId,
    fkKey: 'categoryId',
    fields: ['name', 'description'],
  },
  brand: {
    base: brands,
    tr: brandTranslations,
    fk: brandTranslations.brandId,
    fkKey: 'brandId',
    fields: ['name', 'tagline', 'story'],
  },
  collection: {
    base: collections,
    tr: collectionTranslations,
    fk: collectionTranslations.collectionId,
    fkKey: 'collectionId',
    fields: ['name', 'description'],
  },
  guide: {
    base: guides,
    tr: guideTranslations,
    fk: guideTranslations.guideId,
    fkKey: 'guideId',
    fields: ['title', 'summary', 'bodyMd'],
  },
};

export const ENTITIES = Object.keys(TABLES) as Entity[];
export const translatableFields = (entity: Entity): readonly string[] => [
  ...TABLES[entity].fields,
  'slug',
  'metaTitle',
  'metaDescription',
];

/**
 * Translations of the given entities (by base slug) in the request's language. Empty for English
 * and for an empty list, with no query at all.
 */
export async function loadTranslations(
  entity: Entity,
  baseSlugs: readonly string[],
  lang = currentLang(),
): Promise<Map<string, Translation>> {
  const out = new Map<string, Translation>();
  if (lang === 'en' || baseSlugs.length === 0) return out;
  const { base, tr, fk } = TABLES[entity];
  const rows = (await db
    .select({ baseSlug: base.slug, t: tr })
    .from(tr)
    .innerJoin(base, eq(base.id, fk))
    .where(and(eq(tr.locale, lang), inArray(base.slug, [...baseSlugs])))) as {
    baseSlug: string;
    t: Translation;
  }[];
  for (const row of rows) out.set(row.baseSlug, row.t);
  return out;
}

/** The translated value when there is a non-empty one, else the English one. */
export function pick(t: Translation | undefined, field: string, english: string): string;
export function pick(
  t: Translation | undefined,
  field: string,
  english: string | null,
): string | null;
export function pick(t: Translation | undefined, field: string, english: string | null) {
  const value = t?.[field];
  return value !== undefined && value !== null && value.trim() !== '' ? value : english;
}

/**
 * Lays translations over items that carry the entity's base slug. `apply` returns the translated
 * copy of one item; it is only called when a row exists.
 */
export async function overlay<T extends { slug: string }>(
  entity: Entity,
  items: readonly T[],
  apply: (item: T, t: Translation) => T,
): Promise<T[]> {
  const found = await loadTranslations(
    entity,
    items.map((i) => i.slug),
  );
  if (found.size === 0) return [...items];
  return items.map((item) => {
    const t = found.get(item.slug);
    return t ? apply(item, t) : item;
  });
}

/**
 * The English (base) slug for a slug from the URL. Order: an English slug is itself; otherwise a
 * translated slug of the request's language; otherwise a translated slug of any other language
 * (a link shared from another store: the page then answers with the right slug and the web
 * redirects). Unknown slugs pass through unchanged, so the usual 404 still happens.
 */
export async function resolveSlug(entity: Entity, slug: string): Promise<string> {
  const { base, tr, fk } = TABLES[entity];
  const own = (await db
    .select({ id: base.id })
    .from(base)
    .where(eq(base.slug, slug))
    .limit(1)) as unknown[];
  if (own.length > 0) return slug;
  const lang = currentLang();
  const rows = (await db
    .select({ baseSlug: base.slug, locale: tr.locale })
    .from(tr)
    .innerJoin(base, eq(base.id, fk))
    .where(eq(tr.slug, slug))
    .orderBy(sql`(${tr.locale} = ${lang}) desc`)
    .limit(1)) as { baseSlug: string }[];
  return rows[0]?.baseSlug ?? slug;
}

/**
 * The page's slug in every UI language, for hreflang: the translated slug where one exists, else the
 * English (base) one. One query, whatever the request's language.
 */
export async function slugsByLang(entity: Entity, baseSlug: string): Promise<LangSlugs> {
  const { base, tr, fk } = TABLES[entity];
  const rows = (await db
    .select({ locale: tr.locale, slug: tr.slug })
    .from(tr)
    .innerJoin(base, eq(base.id, fk))
    .where(eq(base.slug, baseSlug))) as { locale: string; slug: string | null }[];
  const out: LangSlugs = { en: baseSlug, de: baseSlug, fr: baseSlug };
  for (const row of rows) {
    if ((row.locale === 'de' || row.locale === 'fr') && row.slug && row.slug.trim() !== '') {
      out[row.locale] = row.slug;
    }
  }
  return out;
}
