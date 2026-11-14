import type { GalleryPhoto, HelpHit, ProductDetail } from '@store/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { db } from '../../db/client.ts';
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
} from '../../db/schema/index.ts';
import { makeTestApp } from '../../test/app.ts';
import { createProduct } from '../../test/factories.ts';
import { bodyOf } from '../../test/http.ts';

const app = makeTestApp();
const get = (path: string, store?: string) => {
  const req = request(app).get(path);
  return store ? req.set('X-Store-View', store) : req;
};
const data = <T>(res: request.Response) => bodyOf<{ data: T }>(res).data;

async function pdpFixture() {
  const { product } = await createProduct({ slug: 'cosy-bed', variants: [{ gbpCents: 1999 }] });
  const [guide] = await db
    .insert(sizeGuides)
    .values({
      slug: 'beds',
      title: 'Bed sizes',
      rows: {
        columns: ['Bed size (cm)', 'Up to (kg)'],
        rows: [{ size: 'S', label: 'Small', values: ['50 x 40', 'up to 6'] }],
      },
      howtoMd: '1. Measure your pet.',
      tip: 'Size up.',
    })
    .returning();
  await db.update(products).set({
    sizeGuideId: guide!.id,
    deliveryNote: 'Beds ship in their own box.',
  });
  const [spec] = await db
    .insert(productSpecs)
    .values({ productId: product.id, label: 'Material', value: 'glazed ceramic', sortOrder: 0 })
    .returning();
  const [spec2] = await db
    .insert(productSpecs)
    .values({ productId: product.id, label: 'Made in', value: 'European Union', sortOrder: 1 })
    .returning();
  const [faq] = await db
    .insert(productFaqs)
    .values({ productId: product.id, question: 'Can I wash it?', answer: 'Yes.', sortOrder: 0 })
    .returning();
  return { product, guide: guide!, spec: spec!, spec2: spec2!, faq: faq! };
}

describe('product page content translations', () => {
  it('translates specs, FAQs, size guide and delivery note, field by field', async () => {
    const { product, guide, spec, faq } = await pdpFixture();
    await db.insert(productSpecTranslations).values([
      { specId: spec.id, locale: 'de', label: 'Material', value: 'glasierte Keramik' },
      { specId: spec.id, locale: 'fr', label: 'Matériau', value: 'céramique émaillée' },
    ]);
    // Only the question is translated: the answer must stay English.
    await db
      .insert(productFaqTranslations)
      .values({ faqId: faq.id, locale: 'de', question: 'Kann ich es waschen?', answer: '  ' });
    await db.insert(sizeGuideTranslations).values({
      sizeGuideId: guide.id,
      locale: 'de',
      title: 'Bettengrößen',
      rows: {
        columns: ['Bettgröße (cm)', 'Bis (kg)'],
        rows: [{ size: 'ignored', label: 'Klein', values: ['50 x 40', 'bis 6'] }],
      },
      howtoMd: '1. Messen Sie Ihr Tier.',
      tip: null,
    });
    await db.insert(productTranslations).values({
      productId: product.id,
      locale: 'de',
      deliveryNote: 'Betten kommen im eigenen Karton.',
    });

    const de = data<ProductDetail>(await get('/api/v1/products/cosy-bed', 'de-de'));
    expect(de.specs).toEqual([
      { label: 'Material', value: 'glasierte Keramik' },
      { label: 'Made in', value: 'European Union' }, // no row: English
    ]);
    expect(de.faqs[0]).toMatchObject({ question: 'Kann ich es waschen?', answer: 'Yes.' });
    expect(de.sizeGuide).toMatchObject({
      title: 'Bettengrößen',
      columns: ['Bettgröße (cm)', 'Bis (kg)'],
      howtoMd: '1. Messen Sie Ihr Tier.',
      tip: 'Size up.', // null translation: English tip
    });
    // The row keeps the English `size`, the option value a variant matches on.
    expect(de.sizeGuide?.rows).toEqual([
      { size: 'S', label: 'Klein', values: ['50 x 40', 'bis 6'] },
    ]);
    expect(de.deliveryNote).toBe('Betten kommen im eigenen Karton.');

    const fr = data<ProductDetail>(await get('/api/v1/products/cosy-bed', 'fr-fr'));
    expect(fr.specs[0]).toEqual({ label: 'Matériau', value: 'céramique émaillée' });
    expect(fr.faqs[0]?.question).toBe('Can I wash it?');
    expect(fr.sizeGuide?.title).toBe('Bed sizes');
    expect(fr.deliveryNote).toBe('Beds ship in their own box.');
  });

  it('answers in English without the header and on the English stores', async () => {
    const { spec } = await pdpFixture();
    await db
      .insert(productSpecTranslations)
      .values({ specId: spec.id, locale: 'de', label: 'Material', value: 'glasierte Keramik' });
    for (const store of [undefined, 'eu-en', 'uk-en']) {
      const res = data<ProductDetail>(await get('/api/v1/products/cosy-bed', store));
      expect(res.specs[0]?.value).toBe('glazed ceramic');
    }
  });

  it('falls back to English for the whole size chart when its shape differs', async () => {
    const { guide } = await pdpFixture();
    await db.insert(sizeGuideTranslations).values({
      sizeGuideId: guide.id,
      locale: 'de',
      title: 'Bettengrößen',
      rows: {
        columns: ['Nur eine Spalte'],
        rows: [{ size: 'S', label: 'Klein', values: ['1', '2'] }],
      },
    });
    const de = data<ProductDetail>(await get('/api/v1/products/cosy-bed', 'de-de'));
    expect(de.sizeGuide?.title).toBe('Bettengrößen');
    expect(de.sizeGuide?.columns).toEqual(['Bed size (cm)', 'Up to (kg)']);
    expect(de.sizeGuide?.rows[0]?.label).toBe('Small');
  });
});

describe('help translations', () => {
  async function articles() {
    const [a] = await db
      .insert(helpArticles)
      .values([
        {
          slug: 'a',
          topic: 'shipping',
          question: 'How long?',
          answerMd: 'Three days.',
          sortOrder: 1,
        },
        { slug: 'b', topic: 'shipping', question: 'How much?', answerMd: 'Free.', sortOrder: 2 },
      ])
      .returning();
    await db.insert(helpArticleTranslations).values([
      { articleId: a!.id, locale: 'de', question: 'Wie lange?', answerMd: 'Drei Tage.' },
      { articleId: a!.id, locale: 'fr', question: 'Combien de temps ?', answerMd: 'Trois jours.' },
    ]);
  }

  it('lists translated, with English for an article that has no row', async () => {
    await articles();
    const de = data<HelpHit[]>(await get('/api/v1/help', 'de-de'));
    expect(de.map((h) => [h.slug, h.question, h.answerMd])).toEqual([
      ['a', 'Wie lange?', 'Drei Tage.'],
      ['b', 'How much?', 'Free.'],
    ]);
    const fr = data<HelpHit[]>(await get('/api/v1/help', 'fr-fr'));
    expect(fr[0]?.question).toBe('Combien de temps ?');
    const en = data<HelpHit[]>(await get('/api/v1/help'));
    expect(en[0]?.question).toBe('How long?');
  });

  it('searches the English text but answers in the language, without the English snippet', async () => {
    await articles();
    const de = data<HelpHit[]>(await get('/api/v1/help?q=three', 'de-de'));
    expect(de).toHaveLength(1);
    expect(de[0]).toMatchObject({ slug: 'a', question: 'Wie lange?', snippet: null });
    const en = data<HelpHit[]>(await get('/api/v1/help?q=three'));
    expect(en[0]?.snippet).toContain('Three');
  });
});

describe('gallery and charity translations', () => {
  it('translates a gallery caption and keeps English where there is no row', async () => {
    const [a] = await db
      .insert(galleryPhotos)
      .values([
        { path: '/p/a.webp', caption: 'Squeaky bone', sortOrder: 1, published: true },
        { path: '/p/b.webp', caption: 'Plain ball', sortOrder: 2, published: true },
      ])
      .returning();
    await db
      .insert(galleryPhotoTranslations)
      .values({ photoId: a!.id, locale: 'de', caption: 'Quietschknochen' });
    const de = data<GalleryPhoto[]>(await get('/api/v1/gallery', 'de-de'));
    expect(de.map((p) => p.caption)).toEqual(['Quietschknochen', 'Plain ball']);
    const fr = data<GalleryPhoto[]>(await get('/api/v1/gallery', 'fr-fr'));
    expect(fr.map((p) => p.caption)).toEqual(['Squeaky bone', 'Plain ball']);
  });

  it('translates the charity description and falls back to the English name', async () => {
    const [c] = await db
      .insert(charities)
      .values({ slug: 'shelter', name: 'Shelter', description: 'A fictional shelter.' })
      .returning();
    await db
      .insert(charityTranslations)
      .values({ charityId: c!.id, locale: 'fr', name: null, description: 'Un refuge fictif.' });
    const total = async (store?: string) =>
      data<{ charity: { name: string; description: string } }>(
        await get('/api/v1/charity/total', store),
      ).charity;
    expect(await total('fr-fr')).toMatchObject({
      name: 'Shelter',
      description: 'Un refuge fictif.',
    });
    expect(await total('de-de')).toMatchObject({
      name: 'Shelter',
      description: 'A fictional shelter.',
    });
    expect(await total()).toMatchObject({ name: 'Shelter', description: 'A fictional shelter.' });
  });
});
