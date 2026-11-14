import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { HELP_TOPICS } from '@store/shared';
import { inArray, sql } from 'drizzle-orm';
import matter from 'gray-matter';
import { z } from 'zod';

import { slugify } from '../../lib/slug.ts';
import type { Tx } from '../client.ts';
import {
  guideCategories,
  guideProducts,
  guides,
  helpArticles,
  testimonials,
} from '../schema/index.ts';

import { testimonialSeeds } from './testimonials.ts';

// The Markdown files are the authoring format; Postgres is where the app reads. The seed is the
// bridge, and the writing pass that produces the real copy only replaces files in this folder.
export const CONTENT_DIR = new URL('../../../content/', import.meta.url).pathname;

const slugField = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'a lowercase-hyphen slug');

// `.strict()`: a typo in a key ("sumary") must fail the seed, not silently publish a guide
// without its summary. `z.coerce.date()` because YAML turns an unquoted 2026-03-04 into a Date.
export const GuideFrontMatterSchema = z
  .object({
    title: z.string().trim().min(1),
    slug: slugField,
    category: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    products: z.array(slugField).default([]),
    publishedAt: z.coerce.date(),
    // A site path to the 16:9 cover in apps/web/public, e.g. /guides/<slug>.webp. Optional: the
    // UI draws a category-coloured block when a guide has none.
    cover: z
      .string()
      .regex(/^\/guides\/[a-z0-9-]+\.(webp|png|jpg|jpeg|avif)$/, 'a path like /guides/<slug>.webp')
      .optional(),
  })
  .strict();

export const HelpFrontMatterSchema = z
  .object({
    slug: slugField,
    topic: z.enum(HELP_TOPICS),
    question: z.string().trim().min(1),
    // Position inside the topic; files without one keep their alphabetical order.
    order: z.number().int().optional(),
  })
  .strict();

export interface GuideSeed extends z.output<typeof GuideFrontMatterSchema> {
  bodyMd: string;
  categorySlug: string;
}
export interface HelpSeed extends z.output<typeof HelpFrontMatterSchema> {
  answerMd: string;
}
export interface ContentSeed {
  guides: GuideSeed[];
  help: HelpSeed[];
}

function readMarkdown(dir: string): { file: string; data: unknown; body: string }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((file) => {
      const parsed = matter(readFileSync(join(dir, file), 'utf8'));
      return { file, data: parsed.data, body: parsed.content.trim() };
    });
}

// Every problem is reported with the file name, and the first bad file stops the seed: shipping a
// half-seeded catalogue of content is worse than failing loudly on a developer's machine.
function parseFile<S extends z.ZodType>(
  schema: S,
  entry: { file: string; data: unknown; body: string },
): z.output<S> {
  const result = schema.safeParse(entry.data);
  if (!result.success) {
    throw new Error(
      `content/${entry.file}: invalid front matter\n${z.prettifyError(result.error)}`,
    );
  }
  if (entry.body === '') throw new Error(`content/${entry.file}: the Markdown body is empty`);
  const slug = (result.data as { slug: string }).slug;
  if (slug !== basename(entry.file, '.md')) {
    throw new Error(`content/${entry.file}: slug "${slug}" must match the file name`);
  }
  return result.data;
}

function assertUnique(kind: string, slugs: string[]): void {
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) throw new Error(`duplicate ${kind} slug "${slug}"`);
    seen.add(slug);
  }
}

export function loadContent(dir: string = CONTENT_DIR): ContentSeed {
  const guideSeeds = readMarkdown(join(dir, 'guides')).map((entry): GuideSeed => {
    const front = parseFile(GuideFrontMatterSchema, entry);
    return { ...front, bodyMd: entry.body, categorySlug: slugify(front.category) };
  });
  const helpSeeds = readMarkdown(join(dir, 'help')).map((entry): HelpSeed => ({
    ...parseFile(HelpFrontMatterSchema, entry),
    answerMd: entry.body,
  }));
  assertUnique(
    'guide',
    guideSeeds.map((g) => g.slug),
  );
  assertUnique(
    'help article',
    helpSeeds.map((h) => h.slug),
  );
  return { guides: guideSeeds, help: helpSeeds };
}

function must(map: ReadonlyMap<string, string>, key: string): string {
  const value = map.get(key);
  if (!value) throw new Error(`seed: "${key}" was not inserted`);
  return value;
}

const excluded = (column: string) => sql.raw(`excluded."${column}"`);

// Upserts by slug, so seeding again refreshes the files' text in place and never duplicates. A
// guide that links a product the catalogue does not have fails the seed (a dead link is a bug).
export async function seedContent(
  tx: Tx,
  content: ContentSeed,
  productId: ReadonlyMap<string, string>,
): Promise<void> {
  // ---- guide categories, in the order they first appear ----
  const categories = new Map<string, string>();
  for (const g of content.guides) {
    if (!categories.has(g.categorySlug)) categories.set(g.categorySlug, g.category);
  }
  const categoryRows = await tx
    .insert(guideCategories)
    .values([...categories].map(([slug, name], i) => ({ slug, name, sortOrder: i })))
    .onConflictDoUpdate({
      target: guideCategories.slug,
      set: { name: excluded('name'), sortOrder: excluded('sort_order') },
    })
    .returning({ id: guideCategories.id, slug: guideCategories.slug });
  const categoryId = new Map(categoryRows.map((r) => [r.slug, r.id]));

  // ---- guides and their product links ----
  if (content.guides.length > 0) {
    const guideRows = await tx
      .insert(guides)
      .values(
        content.guides.map((g) => ({
          categoryId: must(categoryId, g.categorySlug),
          slug: g.slug,
          title: g.title,
          summary: g.summary,
          bodyMd: g.bodyMd,
          status: 'published' as const,
          publishedAt: g.publishedAt,
          coverUrl: g.cover ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: guides.slug,
        set: {
          title: excluded('title'),
          summary: excluded('summary'),
          bodyMd: excluded('body_md'),
          categoryId: excluded('category_id'),
          publishedAt: excluded('published_at'),
          // The file is the source of truth: dropping `cover` from it clears the cover too.
          coverUrl: excluded('cover_url'),
        },
      })
      .returning({ id: guides.id, slug: guides.slug });
    const guideId = new Map(guideRows.map((r) => [r.slug, r.id]));

    const links = content.guides.flatMap((g) =>
      g.products.map((slug) => {
        const pid = productId.get(slug);
        if (!pid) throw new Error(`guide "${g.slug}" links unknown product "${slug}"`);
        return { guideId: must(guideId, g.slug), productId: pid };
      }),
    );
    // Links have no data of their own, so replacing a seeded guide's links is the idempotent way
    // to also drop a product removed from its front matter.
    await tx.delete(guideProducts).where(inArray(guideProducts.guideId, [...guideId.values()]));
    if (links.length > 0) await tx.insert(guideProducts).values(links);
  }

  // ---- help articles ----
  if (content.help.length > 0) {
    await tx
      .insert(helpArticles)
      .values(
        content.help.map((h, i) => ({
          slug: h.slug,
          topic: h.topic,
          question: h.question,
          answerMd: h.answerMd,
          sortOrder: h.order ?? i,
        })),
      )
      .onConflictDoUpdate({
        target: helpArticles.slug,
        set: {
          topic: excluded('topic'),
          question: excluded('question'),
          answerMd: excluded('answer_md'),
          sortOrder: excluded('sort_order'),
        },
      });
  }

  // ---- testimonials: no natural key, so add only the ones whose (name, pet) is missing ----
  const existing = await tx
    .select({ name: testimonials.name, pet: testimonials.pet })
    .from(testimonials);
  const have = new Set(existing.map((t) => `${t.name}|${t.pet}`));
  const fresh = testimonialSeeds.filter((t) => !have.has(`${t.name}|${t.pet}`));
  if (fresh.length > 0) await tx.insert(testimonials).values(fresh);
}
