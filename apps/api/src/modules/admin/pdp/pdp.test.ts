import { Writable } from 'node:stream';

import { eq } from 'drizzle-orm';
import { pino } from 'pino';
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../../../db/client.ts';
import { products } from '../../../db/schema/index.ts';
import { makeTestApp } from '../../../test/app.ts';
import { createProduct } from '../../../test/factories.ts';
import { bodyOf, errorOf } from '../../../test/http.ts';
import { signedIn } from '../../../test/orders.ts';
import type { Shopper } from '../../../test/shopper.ts';
import { makeShopper } from '../../../test/shopper.ts';

const lines: Record<string, unknown>[] = [];
const logger = pino(
  { level: 'info' },
  new Writable({
    write(chunk: Buffer, _enc, cb) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      cb();
    },
  }),
);
const app = makeTestApp({ logger });
let admin: Shopper;

beforeEach(async () => {
  lines.length = 0;
  admin = (await signedIn(app, 'admin', 'boss@pawsome.test')).shopper;
});

const data = <T>(res: Parameters<typeof bodyOf>[0]) => bodyOf<{ data: T }>(res).data;
const audits = () => lines.filter((l) => l.audit === true);

const band = (min: number, max: number, dailyG = 40, lifeStage = 'any') => ({
  petWeightGMin: min,
  petWeightGMax: max,
  dailyG,
  lifeStage,
});

type Content = {
  specs: { label: string; value: string }[];
  faqs: { id: string; question: string }[];
  feedingTable: { petWeightGMin: number }[];
  constituents: { variantId: string; values: { key: string; valueBp: number }[] }[];
  deliveryNote: string | null;
  sizeGuideId: string | null;
};

describe('admin product content', () => {
  it('is for admins only', async () => {
    const { product } = await createProduct();
    const guest = makeShopper(app);
    expect((await guest.call('get', `/admin/products/${product.id}/content`)).status).toBe(401);
    const customer = (await signedIn(app, 'customer', 'sam@pawsome.test')).shopper;
    expect((await customer.call('put', `/admin/products/${product.id}/content`, {})).status).toBe(
      403,
    );
    expect((await customer.call('get', '/admin/size-guides')).status).toBe(403);
  });

  it('answers an empty page with one constituents entry per variant', async () => {
    const { product, variants } = await createProduct({ variants: [{}, {}] });
    const res = await admin.call('get', `/admin/products/${product.id}/content`);
    expect(res.status).toBe(200);
    const content = data<Content>(res);
    expect(content).toMatchObject({ specs: [], faqs: [], feedingTable: [], deliveryNote: null });
    expect(content.constituents.map((c) => c.variantId).sort()).toEqual(
      variants.map((v) => v.id).sort(),
    );
  });

  it('saves every section in one request and reads it back in order', async () => {
    const { product, variants } = await createProduct();
    const res = await admin.call('put', `/admin/products/${product.id}/content`, {
      specs: [
        { label: 'Origin', value: 'Nowhere' },
        { label: 'Grain', value: 'Free' },
      ],
      faqs: [
        { question: 'One?', answer: 'Yes.' },
        { question: 'Two?', answer: 'No.' },
      ],
      feedingTable: [band(5000, 10000, 60), band(0, 5000, 30)],
      constituents: [
        {
          variantId: variants[0]!.id,
          // Sent out of label order: the read puts protein before kcal whatever the storage order.
          values: [
            { key: 'kcal', valueBp: 365 },
            { key: 'protein', valueBp: 2650 },
          ],
        },
      ],
      deliveryNote: 'Ships alone.',
    });
    expect(res.status).toBe(200);
    const content = data<Content>(res);
    expect(content.specs.map((s) => s.label)).toEqual(['Origin', 'Grain']);
    expect(content.faqs.map((f) => f.question)).toEqual(['One?', 'Two?']);
    expect(content.feedingTable.map((r) => r.petWeightGMin)).toEqual([0, 5000]);
    expect(content.constituents[0]?.values).toEqual([
      { key: 'protein', valueBp: 2650 },
      { key: 'kcal', valueBp: 365 },
    ]);
    expect(content.deliveryNote).toBe('Ships alone.');
    expect(audits().at(-1)).toMatchObject({ action: 'product.content.update', target: product.id });
  });

  it('leaves sections the request does not carry alone, and replaces the ones it does', async () => {
    const { product } = await createProduct();
    const path = `/admin/products/${product.id}/content`;
    await admin.call('put', path, {
      specs: [{ label: 'A', value: '1' }],
      faqs: [{ question: 'Q?', answer: 'A.' }],
    });
    const res = await admin.call('put', path, { specs: [{ label: 'B', value: '2' }] });
    const content = data<Content>(res);
    expect(content.specs).toEqual([{ label: 'B', value: '2' }]);
    expect(content.faqs).toHaveLength(1);
    // An empty list is a real answer: it clears the section.
    const cleared = data<Content>(await admin.call('put', path, { faqs: [] }));
    expect(cleared.faqs).toEqual([]);
    expect(cleared.specs).toHaveLength(1);
  });

  it('refuses a feeding table with an overlap or a gap and stores nothing', async () => {
    const { product } = await createProduct();
    const path = `/admin/products/${product.id}/content`;
    const res = await admin.call('put', path, {
      specs: [{ label: 'Should not be saved', value: 'x' }],
      feedingTable: [band(0, 5000), band(4000, 9000)],
    });
    expect(res.status).toBe(400);
    expect(JSON.stringify(errorOf(res).details)).toContain('Overlaps the band');
    const gap = await admin.call('put', path, { feedingTable: [band(0, 5000), band(6000, 9000)] });
    expect(gap.status).toBe(400);
    expect(data<Content>(await admin.call('get', path)).specs).toEqual([]);
  });

  it('refuses duplicate spec labels and a percentage above 100 %', async () => {
    const { product, variants } = await createProduct();
    const path = `/admin/products/${product.id}/content`;
    const dup = await admin.call('put', path, {
      specs: [
        { label: 'Origin', value: 'a' },
        { label: 'origin', value: 'b' },
      ],
    });
    expect(dup.status).toBe(400);
    const big = await admin.call('put', path, {
      constituents: [{ variantId: variants[0]!.id, values: [{ key: 'fat', valueBp: 10001 }] }],
    });
    expect(big.status).toBe(400);
    const twice = await admin.call('put', path, {
      constituents: [
        {
          variantId: variants[0]!.id,
          values: [
            { key: 'fat', valueBp: 100 },
            { key: 'fat', valueBp: 200 },
          ],
        },
      ],
    });
    expect(twice.status).toBe(400);
  });

  it("refuses constituents for another product's variant and a missing size guide", async () => {
    const { product } = await createProduct();
    const other = await createProduct();
    const path = `/admin/products/${product.id}/content`;
    const foreign = await admin.call('put', path, {
      constituents: [{ variantId: other.variants[0]!.id, values: [{ key: 'fat', valueBp: 100 }] }],
    });
    expect(foreign.status).toBe(400);
    expect(JSON.stringify(errorOf(foreign).details)).toContain('constituents');
    const missing = await admin.call('put', path, {
      sizeGuideId: '00000000-0000-4000-8000-000000000000',
    });
    expect(missing.status).toBe(400);
  });

  it('404s for an unknown product', async () => {
    const res = await admin.call(
      'get',
      '/admin/products/00000000-0000-4000-8000-000000000000/content',
    );
    expect(res.status).toBe(404);
  });

  it('rolls back every section when one of them fails', async () => {
    const { product } = await createProduct();
    const path = `/admin/products/${product.id}/content`;
    await admin.call('put', path, { specs: [{ label: 'Keep', value: 'me' }] });
    const res = await admin.call('put', path, {
      specs: [{ label: 'Lost', value: 'x' }],
      sizeGuideId: '00000000-0000-4000-8000-000000000000',
    });
    expect(res.status).toBe(400);
    expect(data<Content>(await admin.call('get', path)).specs).toEqual([
      { label: 'Keep', value: 'me' },
    ]);
  });
});

describe('admin size guides', () => {
  const guide = (over: Record<string, unknown> = {}) => ({
    slug: 'harness',
    title: 'Harness sizes',
    table: {
      columns: ['Chest (cm)', 'Weight (kg)'],
      rows: [
        { size: 'S', label: 'Small', values: ['40 to 55', 'up to 8'] },
        { size: 'M', label: 'Medium', values: ['55 to 70', '8 to 20'] },
      ],
    },
    howtoMd: '1. Measure.',
    tip: 'In between sizes? Size up.',
    ...over,
  });
  type Guide = { id: string; slug: string; productCount: number; tip: string | null };

  it('creates, lists, updates and deletes, with audit lines', async () => {
    const created = await admin.call('post', '/admin/size-guides', guide());
    expect(created.status).toBe(201);
    const id = data<Guide>(created).id;
    expect(audits().at(-1)).toMatchObject({ action: 'size_guide.create', target: id });

    const list = data<Guide[]>(await admin.call('get', '/admin/size-guides'));
    expect(list.map((g) => g.slug)).toEqual(['harness']);

    const updated = await admin.call(
      'patch',
      `/admin/size-guides/${id}`,
      guide({ title: 'New', tip: '' }),
    );
    expect(data<Guide & { title: string }>(updated)).toMatchObject({ title: 'New', tip: null });

    const del = await admin.call('delete', `/admin/size-guides/${id}`);
    expect(data<{ detachedProducts: number }>(del).detachedProducts).toBe(0);
    expect(data<Guide[]>(await admin.call('get', '/admin/size-guides'))).toEqual([]);
    expect((await admin.call('delete', `/admin/size-guides/${id}`)).status).toBe(404);
  });

  it('answers a clean 400 for a slug that is taken, on create and on update', async () => {
    await admin.call('post', '/admin/size-guides', guide());
    const second = data<Guide>(
      await admin.call('post', '/admin/size-guides', guide({ slug: 'beds' })),
    );
    const dup = await admin.call('post', '/admin/size-guides', guide());
    expect(dup.status).toBe(400);
    expect(JSON.stringify(errorOf(dup).details)).toContain('slug');
    const clash = await admin.call('patch', `/admin/size-guides/${second.id}`, guide());
    expect(clash.status).toBe(400);
  });

  it('refuses rows that do not match the columns or repeat a size', async () => {
    const short = await admin.call(
      'post',
      '/admin/size-guides',
      guide({
        table: { columns: ['A', 'B'], rows: [{ size: 'S', label: 'Small', values: ['1'] }] },
      }),
    );
    expect(short.status).toBe(400);
    const repeat = await admin.call(
      'post',
      '/admin/size-guides',
      guide({
        table: {
          columns: ['A'],
          rows: [
            { size: 'S', label: 'Small', values: ['1'] },
            { size: 'S', label: 'Small again', values: ['2'] },
          ],
        },
      }),
    );
    expect(repeat.status).toBe(400);
    expect(
      (await admin.call('post', '/admin/size-guides', guide({ slug: 'Bad Slug' }))).status,
    ).toBe(400);
  });

  it('detaches products when a guide is deleted and counts them in the list', async () => {
    const id = data<Guide>(await admin.call('post', '/admin/size-guides', guide())).id;
    const { product } = await createProduct();
    await admin.call('put', `/admin/products/${product.id}/content`, { sizeGuideId: id });
    const list = data<Guide[]>(await admin.call('get', '/admin/size-guides'));
    expect(list[0]?.productCount).toBe(1);
    const del = await admin.call('delete', `/admin/size-guides/${id}`);
    expect(data<{ detachedProducts: number }>(del).detachedProducts).toBe(1);
    const [row] = await db.select().from(products).where(eq(products.id, product.id));
    expect(row?.sizeGuideId).toBeNull();
  });
});

describe('admin product relations', () => {
  type Rel = { relatedId: string; relatedName: string; kind: string };
  const relations = (res: Parameters<typeof bodyOf>[0]) =>
    data<Content & { relations: Rel[] }>(res).relations;

  it('saves recommendations in list order, with names, and replaces them on the next save', async () => {
    const main = await createProduct();
    const a = await createProduct({ name: 'Alpha' });
    const b = await createProduct({ name: 'Bravo' });
    const path = `/admin/products/${main.product.id}/content`;
    const res = await admin.call('put', path, {
      relations: [
        { relatedId: b.product.id, kind: 'bought_together' },
        { relatedId: a.product.id, kind: 'bought_together' },
        { relatedId: a.product.id, kind: 'related' },
      ],
    });
    expect(res.status).toBe(200);
    expect(relations(res).map((r) => [r.relatedName, r.kind])).toEqual([
      ['Bravo', 'bought_together'],
      ['Alpha', 'bought_together'],
      ['Alpha', 'related'],
    ]);
    const cleared = await admin.call('put', path, { relations: [] });
    expect(relations(cleared)).toEqual([]);
  });

  it('refuses itself, an unknown product, a repeat and too many in a list', async () => {
    const main = await createProduct();
    const others = [];
    for (let i = 0; i < 4; i++) others.push(await createProduct());
    const path = `/admin/products/${main.product.id}/content`;
    expect(
      (
        await admin.call('put', path, {
          relations: [{ relatedId: main.product.id, kind: 'related' }],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await admin.call('put', path, {
          relations: [{ relatedId: '00000000-0000-4000-8000-000000000000', kind: 'related' }],
        })
      ).status,
    ).toBe(400);
    const dup = { relatedId: others[0]!.product.id, kind: 'related' };
    expect((await admin.call('put', path, { relations: [dup, dup] })).status).toBe(400);
    const four = others.map((o) => ({ relatedId: o.product.id, kind: 'bought_together' }));
    expect((await admin.call('put', path, { relations: four })).status).toBe(400);
  });

  it('leaves relations alone when the request does not carry them', async () => {
    const main = await createProduct();
    const a = await createProduct();
    const path = `/admin/products/${main.product.id}/content`;
    await admin.call('put', path, { relations: [{ relatedId: a.product.id, kind: 'related' }] });
    const res = await admin.call('put', path, { specs: [{ label: 'X', value: 'y' }] });
    expect(relations(res)).toHaveLength(1);
  });
});
