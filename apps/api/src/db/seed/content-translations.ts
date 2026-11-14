import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SizeGuideTableSchema } from '@store/shared';
import { and, eq, sql } from 'drizzle-orm';
import matter from 'gray-matter';
import { z } from 'zod';

import type { Tx } from '../client.ts';
import {
  charities,
  charityTranslations,
  galleryPhotos,
  galleryPhotoTranslations,
  helpArticles,
  helpArticleTranslations,
  productFaqs,
  productFaqTranslations,
  products,
  productSpecs,
  productSpecTranslations,
  productTranslations,
  sizeGuides,
  sizeGuideTranslations,
} from '../schema/index.ts';

import { CONTENT_DIR } from './content.ts';
import { SEED_LANGS } from './translations.ts';

// The id-keyed content translations as data (read side: modules/i18n/content-translations.ts).
//   - help answers: `content/help/<lang>/<slug>.md` (front matter `slug`, `question`; body = answer)
//   - everything else: `translations/content/<lang>.json`, keyed by the ENGLISH text, because the
//     rows are generated from templates (every product has a "Material" label and the same three
//     care sentences), so one entry translates every row that carries that English text.
//   - gallery captions need no file: a caption is a product name, so it takes that product's
//     translated name (the catalogue translations are seeded first).
// Everything is an upsert, so running the seed twice changes nothing and a hand edit of a file is
// picked up by the next run. Spec, FAQ and photo rows are re-created by the seed (new ids), which
// is why this runs LAST and rewrites their translations each time.

const DIR = join(fileURLToPath(new URL('.', import.meta.url)), 'translations', 'content');

const ContentFileSchema = z
  .object({
    specLabels: z.record(z.string(), z.string()).default({}),
    specValues: z.record(z.string(), z.string()).default({}),
    faqs: z
      .record(z.string(), z.object({ question: z.string(), answer: z.string() }).strict())
      .default({}),
    deliveryNotes: z.record(z.string(), z.string()).default({}),
    sizeGuides: z
      .record(
        z.string(),
        z
          .object({
            title: z.string(),
            table: SizeGuideTableSchema,
            howtoMd: z.string(),
            tip: z.string().nullable(),
          })
          .strict(),
      )
      .default({}),
    charities: z
      .record(z.string(), z.object({ name: z.string(), description: z.string() }).strict())
      .default({}),
  })
  .strict();
export type ContentFile = z.infer<typeof ContentFileSchema>;

const HelpFrontSchema = z.object({ slug: z.string(), question: z.string().min(1) }).strict();

export function loadContentFile(lang: string): ContentFile {
  const path = join(DIR, `${lang}.json`);
  if (!existsSync(path)) return ContentFileSchema.parse({});
  return ContentFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

export interface HelpTranslation {
  slug: string;
  question: string;
  answerMd: string;
}

export function loadHelpTranslations(lang: string, dir: string = CONTENT_DIR): HelpTranslation[] {
  const folder = join(dir, 'help', lang);
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((file) => {
      const parsed = matter(readFileSync(join(folder, file), 'utf8'));
      const front = HelpFrontSchema.parse(parsed.data);
      if (`${front.slug}.md` !== file) {
        throw new Error(`content/help/${lang}/${file}: slug "${front.slug}" must match the file`);
      }
      const answerMd = parsed.content.trim();
      if (answerMd === '') throw new Error(`content/help/${lang}/${file}: empty body`);
      return { slug: front.slug, question: front.question, answerMd };
    });
}

const CHUNK = 500;
async function inChunks<T>(rows: readonly T[], write: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await write(rows.slice(i, i + CHUNK));
}
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

/** Upserts every content translation of every language; returns the number of rows written. */
export async function seedContentTranslations(
  tx: Tx,
  files: Record<string, ContentFile> = Object.fromEntries(
    SEED_LANGS.map((l) => [l, loadContentFile(l)]),
  ),
  help: Record<string, HelpTranslation[]> = Object.fromEntries(
    SEED_LANGS.map((l) => [l, loadHelpTranslations(l)]),
  ),
): Promise<number> {
  let written = 0;
  const now = sql`now()`;

  const articles = await tx
    .select({ id: helpArticles.id, slug: helpArticles.slug })
    .from(helpArticles);
  const articleId = new Map(articles.map((a) => [a.slug, a.id]));
  const specs = await tx.select().from(productSpecs);
  const faqs = await tx.select().from(productFaqs);
  const guides = await tx.select({ id: sizeGuides.id, slug: sizeGuides.slug }).from(sizeGuides);
  const photos = await tx
    .select({ id: galleryPhotos.id, caption: galleryPhotos.caption })
    .from(galleryPhotos);
  const charityRows = await tx.select({ id: charities.id, slug: charities.slug }).from(charities);
  const productRows = await tx
    .select({ id: products.id, name: products.name, deliveryNote: products.deliveryNote })
    .from(products);

  for (const [locale, file] of Object.entries(files)) {
    // help answers
    const helpRows = (help[locale] ?? []).map((h) => {
      const id = articleId.get(h.slug);
      if (!id)
        throw new Error(`content/help/${locale}/${h.slug}.md: no help article with this slug`);
      return { articleId: id, locale, question: h.question, answerMd: h.answerMd };
    });
    await inChunks(helpRows, (rows) =>
      tx
        .insert(helpArticleTranslations)
        .values(rows)
        .onConflictDoUpdate({
          target: [helpArticleTranslations.articleId, helpArticleTranslations.locale],
          set: { question: excluded('question'), answerMd: excluded('answer_md'), updatedAt: now },
        }),
    );
    written += helpRows.length;

    // specs: label and value are looked up separately; a row with neither known is skipped
    const specRows = specs.flatMap((s) => {
      const label = file.specLabels[s.label] ?? null;
      const value = file.specValues[s.value] ?? null;
      return label || value ? [{ specId: s.id, locale, label, value }] : [];
    });
    await inChunks(specRows, (rows) =>
      tx
        .insert(productSpecTranslations)
        .values(rows)
        .onConflictDoUpdate({
          target: [productSpecTranslations.specId, productSpecTranslations.locale],
          set: { label: excluded('label'), value: excluded('value'), updatedAt: now },
        }),
    );
    written += specRows.length;

    const faqRows = faqs.flatMap((f) => {
      const t = file.faqs[f.question];
      return t ? [{ faqId: f.id, locale, question: t.question, answer: t.answer }] : [];
    });
    await inChunks(faqRows, (rows) =>
      tx
        .insert(productFaqTranslations)
        .values(rows)
        .onConflictDoUpdate({
          target: [productFaqTranslations.faqId, productFaqTranslations.locale],
          set: { question: excluded('question'), answer: excluded('answer'), updatedAt: now },
        }),
    );
    written += faqRows.length;

    // delivery notes live on the product's own translation row (created empty if need be)
    const noteRows = productRows.flatMap((p) => {
      const note = p.deliveryNote ? file.deliveryNotes[p.deliveryNote] : undefined;
      return note ? [{ productId: p.id, locale, deliveryNote: note }] : [];
    });
    await inChunks(noteRows, (rows) =>
      tx
        .insert(productTranslations)
        .values(rows)
        .onConflictDoUpdate({
          target: [productTranslations.productId, productTranslations.locale],
          set: { deliveryNote: excluded('delivery_note'), updatedAt: now },
        }),
    );
    written += noteRows.length;

    for (const [slug, t] of Object.entries(file.sizeGuides)) {
      const guide = guides.find((g) => g.slug === slug);
      if (!guide) throw new Error(`${locale}.json: no size guide with slug "${slug}"`);
      await tx
        .insert(sizeGuideTranslations)
        .values({
          sizeGuideId: guide.id,
          locale,
          title: t.title,
          rows: t.table,
          howtoMd: t.howtoMd,
          tip: t.tip,
        })
        .onConflictDoUpdate({
          target: [sizeGuideTranslations.sizeGuideId, sizeGuideTranslations.locale],
          set: {
            title: t.title,
            rows: t.table,
            howtoMd: t.howtoMd,
            tip: t.tip,
            updatedAt: now,
          },
        });
      written += 1;
    }

    for (const [slug, t] of Object.entries(file.charities)) {
      const charity = charityRows.find((c) => c.slug === slug);
      if (!charity) throw new Error(`${locale}.json: no charity with slug "${slug}"`);
      await tx
        .insert(charityTranslations)
        .values({ charityId: charity.id, locale, ...t })
        .onConflictDoUpdate({
          target: [charityTranslations.charityId, charityTranslations.locale],
          set: { ...t, updatedAt: now },
        });
      written += 1;
    }

    // gallery captions: a caption that is a product name takes that product's translated name
    const names = await tx
      .select({ name: products.name, translated: productTranslations.name })
      .from(productTranslations)
      .innerJoin(products, eq(products.id, productTranslations.productId))
      .where(and(eq(productTranslations.locale, locale)));
    const nameOf = new Map(
      names.flatMap((n) => (n.translated ? [[n.name, n.translated] as const] : [])),
    );
    const captionRows = photos.flatMap((p) => {
      const caption = nameOf.get(p.caption);
      return caption ? [{ photoId: p.id, locale, caption }] : [];
    });
    await inChunks(captionRows, (rows) =>
      tx
        .insert(galleryPhotoTranslations)
        .values(rows)
        .onConflictDoUpdate({
          target: [galleryPhotoTranslations.photoId, galleryPhotoTranslations.locale],
          set: { caption: excluded('caption'), updatedAt: now },
        }),
    );
    written += captionRows.length;
  }
  return written;
}
