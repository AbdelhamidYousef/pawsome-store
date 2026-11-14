import {
  CONSTITUENT_KEYS,
  type AdminProductContent,
  type AdminProductContentInputSchema,
  type AdminSizeGuide,
  type AdminSizeGuideInputSchema,
  type ConstituentKey,
} from '@store/shared';
import type { z } from 'zod';

import { db } from '../../../db/client.ts';
import { uniqueViolation } from '../../../lib/db-errors.ts';
import { notFound, validation } from '../../../lib/errors.ts';

import * as repo from './repo.ts';

type ContentInput = z.output<typeof AdminProductContentInputSchema>;
type GuideInput = z.output<typeof AdminSizeGuideInputSchema>;

const fieldErrors = (errors: Record<string, string>) =>
  validation({
    formErrors: [],
    fieldErrors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [v]])),
  });

export async function getContent(productId: string): Promise<AdminProductContent> {
  const product = await repo.findProduct(db, productId);
  if (!product) throw notFound('Product not found');
  const [specs, faqs, feedingTable, variants, relations] = await Promise.all([
    repo.listSpecs(db, productId),
    repo.listFaqs(db, productId),
    repo.listFeeding(db, productId),
    repo.listVariantIds(db, productId),
    repo.listRelations(db, productId),
  ]);
  const rows = await repo.listConstituents(
    db,
    variants.map((v) => v.id),
  );
  return {
    specs,
    faqs,
    feedingTable,
    // One entry per variant (empty values when none stored), so the editor can render every row.
    constituents: variants.map((v) => ({
      variantId: v.id,
      values: rows
        .filter((r) => r.variantId === v.id)
        .map((r) => ({ key: r.key as ConstituentKey, valueBp: r.valueBp }))
        // Label order, never the table's physical order.
        .sort((a, b) => CONSTITUENT_KEYS.indexOf(a.key) - CONSTITUENT_KEYS.indexOf(b.key)),
    })),
    deliveryNote: product.deliveryNote,
    sizeGuideId: product.sizeGuideId,
    relations,
  };
}

// Replaces every section the request carries, in ONE transaction, so a form never leaves the
// page half old and half new. The product row is locked first: two admins saving the same page
// queue instead of interleaving their delete-and-insert statements.
export async function putContent(
  productId: string,
  input: ContentInput,
): Promise<AdminProductContent> {
  await db.transaction(async (tx) => {
    const product = await repo.findProduct(tx, productId);
    if (!product) throw notFound('Product not found');
    await repo.lockProduct(tx, productId);

    if (input.constituents) {
      const own = new Set((await repo.listVariantIds(tx, productId)).map((v) => v.id));
      const errors: Record<string, string> = {};
      input.constituents.forEach((c, i) => {
        if (!own.has(c.variantId)) {
          errors[`constituents.${i}.variantId`] = 'This variant does not belong to the product';
        }
      });
      if (Object.keys(errors).length > 0) throw fieldErrors(errors);
    }
    if (input.sizeGuideId && !(await repo.findSizeGuide(tx, input.sizeGuideId))) {
      throw fieldErrors({ sizeGuideId: 'This size guide does not exist' });
    }

    if (input.relations) {
      const ids = input.relations.map((r) => r.relatedId);
      const known = await repo.existingProductIds(tx, ids);
      const errors: Record<string, string> = {};
      input.relations.forEach((r, i) => {
        if (r.relatedId === productId)
          errors[`relations.${i}.relatedId`] = 'A product cannot recommend itself';
        else if (!known.has(r.relatedId))
          errors[`relations.${i}.relatedId`] = 'This product does not exist';
      });
      if (Object.keys(errors).length > 0) throw fieldErrors(errors);
    }

    if (input.specs) await repo.replaceSpecs(tx, productId, input.specs);
    if (input.faqs) await repo.replaceFaqs(tx, productId, input.faqs);
    if (input.feedingTable) await repo.replaceFeeding(tx, productId, input.feedingTable);
    if (input.relations) await repo.replaceRelations(tx, productId, input.relations);
    for (const c of input.constituents ?? []) {
      await repo.replaceConstituents(tx, c.variantId, c.values);
    }
    await repo.setProductFields(tx, productId, {
      ...(input.deliveryNote !== undefined && { deliveryNote: input.deliveryNote }),
      ...(input.sizeGuideId !== undefined && { sizeGuideId: input.sizeGuideId }),
    });
  });
  return getContent(productId);
}

// ---------- size guides ----------

const toDto = (row: repo.SizeGuideRow): AdminSizeGuide => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  table: row.rows,
  howtoMd: row.howtoMd,
  tip: row.tip,
  productCount: row.productCount,
});

export async function listSizeGuides(): Promise<AdminSizeGuide[]> {
  return (await repo.listSizeGuides()).map(toDto);
}

const slugTaken = () => fieldErrors({ slug: 'Another size guide already uses this slug' });

export async function createSizeGuide(input: GuideInput): Promise<AdminSizeGuide> {
  try {
    const id = await repo.insertSizeGuide({
      slug: input.slug,
      title: input.title,
      rows: input.table,
      howtoMd: input.howtoMd,
      tip: input.tip,
    });
    return toDto((await repo.getSizeGuide(id))!);
  } catch (err) {
    // The unique violation, not a pre-check: two admins can race on the same slug.
    if (uniqueViolation(err) !== undefined) throw slugTaken();
    throw err;
  }
}

export async function updateSizeGuide(id: string, input: GuideInput): Promise<AdminSizeGuide> {
  if (!(await repo.findSizeGuide(db, id))) throw notFound('Size guide not found');
  try {
    await repo.updateSizeGuide(id, {
      slug: input.slug,
      title: input.title,
      rows: input.table,
      howtoMd: input.howtoMd,
      tip: input.tip,
    });
  } catch (err) {
    if (uniqueViolation(err) !== undefined) throw slugTaken();
    throw err;
  }
  return toDto((await repo.getSizeGuide(id))!);
}

// Products that used the guide simply lose it (ON DELETE SET NULL); refusing would make an admin
// unlink every product by hand first. The response says how many were detached.
export async function deleteSizeGuide(id: string): Promise<{ detachedProducts: number }> {
  const guide = await repo.getSizeGuide(id);
  if (!guide) throw notFound('Size guide not found');
  await repo.deleteSizeGuide(id);
  return { detachedProducts: guide.productCount };
}
