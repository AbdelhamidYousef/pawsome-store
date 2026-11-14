import { and, eq, inArray, sql } from 'drizzle-orm';

import type { Tx } from '../client.ts';
import {
  bundleItems,
  productImages,
  productSpecs,
  productVariants,
  products,
} from '../schema/index.ts';

// Three kits built from products that are already seeded (components are their default variant).
// The kit price is 12% under the parts, in integer cents, so "Save" is always a real saving.
export interface BundleSeed {
  slug: string;
  name: string;
  description: string;
  sku: string;
  parts: { productSlug: string; qty: number }[];
}

export const bundleSeeds: BundleSeed[] = [
  {
    slug: 'fetch-play-kit',
    name: 'Fetch & Tug Play Kit',
    description:
      'Everything for a good game of fetch and tug in one box: a braided rope, a bouncy rubber ball and a squeaky fox to cuddle afterwards.',
    sku: 'KIT-FETCH',
    parts: [
      { productSlug: 'braided-tug-rope', qty: 1 },
      { productSlug: 'bouncy-rubber-ball', qty: 1 },
      { productSlug: 'squeaky-fox-plush', qty: 1 },
    ],
  },
  {
    slug: 'dinner-time-kit',
    name: 'Dinner Time Kit',
    description:
      'A steel bowl for meals, a slow-feeder maze for slower gulps, and two bags of treats for training and rewards.',
    sku: 'KIT-DINNER',
    parts: [
      { productSlug: 'steel-feeding-bowl', qty: 1 },
      { productSlug: 'maze-slow-feeder', qty: 1 },
      { productSlug: 'soft-training-bites', qty: 2 },
    ],
  },
  {
    slug: 'walkies-starter-kit',
    name: 'Walkies Starter Kit',
    description: 'A collar and a reflective leash that match for a first walk, or a fresh start.',
    sku: 'KIT-WALKIES',
    parts: [
      { productSlug: 'everyday-webbing-collar', qty: 1 },
      { productSlug: 'reflective-walking-leash', qty: 1 },
    ],
  },
];

export async function seedBundles(tx: Tx): Promise<void> {
  for (const seed of bundleSeeds) {
    const slugs = seed.parts.map((p) => p.productSlug);
    const parts = await tx
      .select({
        productId: products.id,
        slug: products.slug,
        categoryId: products.categoryId,
        brandId: products.brandId,
        productName: products.name,
        attributes: products.attributes,
        variantId: productVariants.id,
        priceCents: productVariants.priceCents,
        weightGrams: productVariants.weightGrams,
        currency: productVariants.currency,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          inArray(products.slug, slugs),
          eq(productVariants.isDefault, true),
          eq(productVariants.isTrial, false),
        ),
      );
    const bySlug = new Map(parts.map((p) => [p.slug, p]));
    const lines = seed.parts.map((p) => {
      const part = bySlug.get(p.productSlug);
      if (!part) throw new Error(`bundle ${seed.slug}: product ${p.productSlug} is not seeded`);
      return { part, qty: p.qty };
    });
    const first = lines[0]?.part;
    if (!first) continue;
    const individual = lines.reduce((sum, l) => sum + l.part.priceCents * l.qty, 0);
    const priceCents = Math.floor((individual * 88) / 100);
    const weight = lines.reduce((sum, l) => sum + l.part.weightGrams * l.qty, 0);

    const [product] = await tx
      .insert(products)
      .values({
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        categoryId: first.categoryId,
        brandId: first.brandId,
        status: 'active',
        kind: 'bundle',
        attributes: first.attributes.pet ? { pet: first.attributes.pet } : {},
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          name: seed.name,
          description: seed.description,
          brandId: first.brandId,
          status: 'active',
          kind: 'bundle',
        },
      })
      .returning({ id: products.id });
    if (!product) throw new Error(`bundle ${seed.slug} was not inserted`);
    const [variant] = await tx
      .insert(productVariants)
      .values({
        productId: product.id,
        sku: seed.sku,
        name: 'Kit',
        options: {},
        priceCents,
        currency: first.currency,
        weightGrams: weight,
        isDefault: true,
        status: 'active',
      })
      .onConflictDoUpdate({
        target: productVariants.sku,
        set: { priceCents, weightGrams: weight, status: 'active' },
      })
      .returning({ id: productVariants.id });
    if (!variant) throw new Error(`bundle ${seed.slug} variant was not inserted`);

    await tx.delete(bundleItems).where(eq(bundleItems.bundleVariantId, variant.id));
    await tx.insert(bundleItems).values(
      lines.map((l) => ({
        bundleVariantId: variant.id,
        componentVariantId: l.part.variantId,
        qty: l.qty,
      })),
    );
    // One spec row ("Contents"), so the Specs tab is not empty.
    await tx.delete(productSpecs).where(eq(productSpecs.productId, product.id));
    await tx.insert(productSpecs).values({
      productId: product.id,
      label: 'Contents',
      value: lines
        .map((l) => (l.qty > 1 ? `${l.qty} x ${l.part.productName}` : l.part.productName))
        .join(', '),
      sortOrder: 0,
    });
    // One price-history row per price (the Omnibus rule reads it).
    await tx.execute(sql`
      INSERT INTO price_history (variant_id, price_cents, kind, valid_from)
      SELECT ${variant.id}, ${priceCents}, 'base', now() - interval '60 days'
      WHERE NOT EXISTS (
        SELECT 1 FROM price_history h
        WHERE h.variant_id = ${variant.id} AND h.kind = 'base' AND h.price_cents = ${priceCents})
    `);
    // Reuse the first component's photo: no new artwork for the kits (CREDITS needs no new line).
    await tx.delete(productImages).where(eq(productImages.productId, product.id));
    const [photo] = await tx
      .select({ url: productImages.url, width: productImages.width, height: productImages.height })
      .from(productImages)
      .where(eq(productImages.productId, first.productId))
      .limit(1);
    if (photo) {
      await tx.insert(productImages).values({
        productId: product.id,
        url: photo.url,
        width: photo.width,
        height: photo.height,
        alt: `${seed.name}, shown with its first item`,
        sortOrder: 0,
      });
    }
  }
}
