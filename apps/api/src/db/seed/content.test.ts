import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { db } from '../client.ts';

import { loadContent, seedContent } from './content.ts';
import { runSeed } from './index.ts';

async function contentCounts() {
  const rows = await db.execute<Record<string, number>>(sql`
    select
      (select count(*)::int from guide_categories) as categories,
      (select count(*)::int from guides) as guides,
      (select count(*)::int from guide_products) as links,
      (select count(*)::int from help_articles) as help,
      (select count(*)::int from testimonials) as testimonials`);
  return rows[0];
}

// A throwaway content folder, so a test can break exactly one file.
function contentDir(files: { guides?: Record<string, string>; help?: Record<string, string> }) {
  const dir = mkdtempSync(join(tmpdir(), 'pawsome-content-'));
  for (const kind of ['guides', 'help'] as const) {
    mkdirSync(join(dir, kind));
    for (const [name, text] of Object.entries(files[kind] ?? {})) {
      writeFileSync(join(dir, kind, name), text);
    }
  }
  return dir;
}

const goodGuide = `---
title: "A guide"
slug: a-guide
category: Dogs
summary: "Short."
products: []
publishedAt: 2026-03-04
---

Body.
`;

describe('content seed', () => {
  it('seeds ten guides and twenty help articles, and seeding twice changes nothing', async () => {
    await runSeed();
    const first = await contentCounts();
    await runSeed();
    expect(await contentCounts()).toEqual(first);
    expect(first).toMatchObject({ guides: 10, help: 20, testimonials: 6 });
    expect(first?.links).toBeGreaterThan(10);
  });

  it('refreshes a guide in place instead of duplicating it', async () => {
    await runSeed();
    await db.execute(
      sql`update guides set title = 'Edited by hand', cover_url = '/guides/stale.webp' where slug = 'choosing-a-dog-toy'`,
    );
    await runSeed();
    const rows = await db.execute<{ title: string; cover_url: string | null }>(
      sql`select title, cover_url from guides where slug = 'choosing-a-dog-toy'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('How to choose a dog toy');
    const file = loadContent().guides.find((g) => g.slug === 'choosing-a-dog-toy');
    expect(rows[0]?.cover_url).toBe(file?.cover ?? null);
  });

  it('parses front matter, including an unquoted date and the category slug', () => {
    const [guide] = loadContent(contentDir({ guides: { 'a-guide.md': goodGuide } })).guides;
    expect(guide).toMatchObject({ slug: 'a-guide', categorySlug: 'dogs', bodyMd: 'Body.' });
    expect(guide?.publishedAt).toEqual(new Date('2026-03-04'));
  });

  it('reads an optional cover path into the guide', () => {
    const withCover = goodGuide.replace(
      'products: []',
      'products: []\ncover: /guides/a-guide.webp',
    );
    const [guide] = loadContent(contentDir({ guides: { 'a-guide.md': withCover } })).guides;
    expect(guide?.cover).toBe('/guides/a-guide.webp');
    const [plain] = loadContent(contentDir({ guides: { 'a-guide.md': goodGuide } })).guides;
    expect(plain?.cover).toBeUndefined();
  });

  it.each([
    [
      'a cover outside /guides/',
      goodGuide.replace('products: []', 'products: []\ncover: https://x.test/a.png'),
      'cover',
    ],
    ['a missing summary', goodGuide.replace('summary: "Short."\n', ''), 'summary'],
    ['an unknown key', goodGuide.replace('products: []', 'sumary: x'), 'sumary'],
    ['a bad date', goodGuide.replace('2026-03-04', 'last tuesday'), 'publishedAt'],
    [
      'a slug that is not the file name',
      goodGuide.replace('slug: a-guide', 'slug: other'),
      'file name',
    ],
    ['an empty body', goodGuide.replace('Body.', ''), 'body is empty'],
  ])('fails loudly on %s', (_what, text, message) => {
    expect(() => loadContent(contentDir({ guides: { 'a-guide.md': text } }))).toThrow(message);
  });

  it('fails on a help article with an unknown topic', () => {
    const help = '---\nslug: q\ntopic: weather\nquestion: Q?\n---\n\nA.\n';
    expect(() => loadContent(contentDir({ help: { 'q.md': help } }))).toThrow('content/q.md');
  });

  it('fails when a guide links a product the catalogue does not have', async () => {
    const dir = contentDir({
      guides: { 'a-guide.md': goodGuide.replace('products: []', 'products: [no-such-product]') },
    });
    await expect(
      db.transaction((tx) => seedContent(tx, loadContent(dir), new Map())),
    ).rejects.toThrow('unknown product "no-such-product"');
  });
});
