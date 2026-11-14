import type { SizeGuideTable } from '@store/shared';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '../../db/client.ts';
import {
  charityTranslations,
  galleryPhotoTranslations,
  helpArticleTranslations,
  productFaqTranslations,
  productSpecTranslations,
  sizeGuideTranslations,
} from '../../db/schema/index.ts';

import { currentLang } from './context.ts';

// Read side of the id-keyed content translations (help answers, specs, FAQs, size guides, gallery
// captions, charity). Same contract as the catalogue overlay: the service builds its English answer
// first, these lay the language over it, and a missing row or an empty field is English. Nothing
// here queries for English requests.

// The translated value when it is non-empty, else the English one (the id-keyed rows are typed, so
// this takes the field itself rather than the catalogue overlay's string-keyed `pick`).
function use(value: string | null | undefined, en: string): string;
function use(value: string | null | undefined, en: string | null): string | null;
function use(value: string | null | undefined, en: string | null) {
  return value !== undefined && value !== null && value.trim() !== '' ? value : en;
}

const english = (lang: string, ids: readonly string[]) => lang === 'en' || ids.length === 0;

export async function translateHelp<T extends { id: string; question: string; answerMd: string }>(
  rows: readonly T[],
  lang = currentLang(),
): Promise<{ rows: T[]; translated: Set<string> }> {
  const translated = new Set<string>();
  if (
    english(
      lang,
      rows.map((r) => r.id),
    )
  )
    return { rows: [...rows], translated };
  const found = await db
    .select()
    .from(helpArticleTranslations)
    .where(
      and(
        eq(helpArticleTranslations.locale, lang),
        inArray(
          helpArticleTranslations.articleId,
          rows.map((r) => r.id),
        ),
      ),
    );
  const byId = new Map(found.map((t) => [t.articleId, t]));
  return {
    rows: rows.map((r) => {
      const t = byId.get(r.id);
      if (!t) return r;
      const question = use(t.question, r.question);
      const answerMd = use(t.answerMd, r.answerMd);
      if (answerMd !== r.answerMd) translated.add(r.id);
      return { ...r, question, answerMd };
    }),
    translated,
  };
}

export async function translateSpecs<T extends { id: string; label: string; value: string }>(
  rows: readonly T[],
  lang = currentLang(),
): Promise<T[]> {
  if (
    english(
      lang,
      rows.map((r) => r.id),
    )
  )
    return [...rows];
  const found = await db
    .select()
    .from(productSpecTranslations)
    .where(
      and(
        eq(productSpecTranslations.locale, lang),
        inArray(
          productSpecTranslations.specId,
          rows.map((r) => r.id),
        ),
      ),
    );
  const byId = new Map(found.map((t) => [t.specId, t]));
  return rows.map((r) => {
    const t = byId.get(r.id);
    return t ? { ...r, label: use(t.label, r.label), value: use(t.value, r.value) } : r;
  });
}

export async function translateFaqs<T extends { id: string; question: string; answer: string }>(
  rows: readonly T[],
  lang = currentLang(),
): Promise<T[]> {
  if (
    english(
      lang,
      rows.map((r) => r.id),
    )
  )
    return [...rows];
  const found = await db
    .select()
    .from(productFaqTranslations)
    .where(
      and(
        eq(productFaqTranslations.locale, lang),
        inArray(
          productFaqTranslations.faqId,
          rows.map((r) => r.id),
        ),
      ),
    );
  const byId = new Map(found.map((t) => [t.faqId, t]));
  return rows.map((r) => {
    const t = byId.get(r.id);
    return t ? { ...r, question: use(t.question, r.question), answer: use(t.answer, r.answer) } : r;
  });
}

export interface SizeGuideText {
  title: string;
  table: SizeGuideTable;
  howtoMd: string;
  tip: string | null;
}

/**
 * The size guide in the request's language. The translated chart is only used when it has the same
 * shape as the English one (same number of columns, rows and cells): a half-edited chart would
 * misalign every number under the wrong heading, so it falls back to English as a whole. Row
 * `size` always comes from the English chart because variants match on it.
 */
export async function translateSizeGuide<T extends SizeGuideText>(
  guideId: string,
  guide: T,
  lang = currentLang(),
): Promise<T> {
  if (english(lang, [guideId])) return guide;
  const [t] = await db
    .select()
    .from(sizeGuideTranslations)
    .where(
      and(eq(sizeGuideTranslations.sizeGuideId, guideId), eq(sizeGuideTranslations.locale, lang)),
    );
  if (!t) return guide;
  const en = guide.table;
  const tr = t.rows;
  const sameShape =
    tr !== null &&
    tr.columns.length === en.columns.length &&
    tr.rows.length === en.rows.length &&
    tr.rows.every((r, i) => r.values.length === en.rows[i]!.values.length);
  return {
    ...guide,
    title: use(t.title, guide.title),
    table:
      sameShape && tr
        ? {
            columns: tr.columns,
            rows: tr.rows.map((r, i) => ({ ...r, size: en.rows[i]!.size })),
          }
        : en,
    howtoMd: use(t.howtoMd, guide.howtoMd),
    tip: use(t.tip, guide.tip),
  };
}

export async function translateCaptions<T extends { id: string; caption: string }>(
  rows: readonly T[],
  lang = currentLang(),
): Promise<T[]> {
  if (
    english(
      lang,
      rows.map((r) => r.id),
    )
  )
    return [...rows];
  const found = await db
    .select()
    .from(galleryPhotoTranslations)
    .where(
      and(
        eq(galleryPhotoTranslations.locale, lang),
        inArray(
          galleryPhotoTranslations.photoId,
          rows.map((r) => r.id),
        ),
      ),
    );
  const byId = new Map(found.map((t) => [t.photoId, t]));
  return rows.map((r) => {
    const t = byId.get(r.id);
    return t ? { ...r, caption: use(t.caption, r.caption) } : r;
  });
}

export async function translateCharity<T extends { id: string; name: string; description: string }>(
  charity: T,
  lang = currentLang(),
): Promise<T> {
  if (english(lang, [charity.id])) return charity;
  const [t] = await db
    .select()
    .from(charityTranslations)
    .where(
      and(eq(charityTranslations.charityId, charity.id), eq(charityTranslations.locale, lang)),
    );
  return t
    ? {
        ...charity,
        name: use(t.name, charity.name),
        description: use(t.description, charity.description),
      }
    : charity;
}
