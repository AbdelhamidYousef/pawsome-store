import type {
  AdminGalleryPhoto,
  GalleryInputSchema,
  GalleryPhoto,
  GalleryProduct,
  GalleryUpdateSchema,
} from '@store/shared';
import type { z } from 'zod';

import { db } from '../../db/client.ts';
import { notFound, validation } from '../../lib/errors.ts';
import { translateCaptions } from '../i18n/content-translations.ts';

import * as repo from './repo.ts';

// ---------- public ----------

export async function listPublic(productId?: string): Promise<GalleryPhoto[]> {
  const photos = await repo.listPhotos({
    onlyPublished: true,
    ...(productId && { productId }),
  });
  const links = await repo.linksFor(photos.map((p) => p.id));
  const shop = await repo.shoppableProducts([...new Set(links.map((l) => l.productId))]);

  const productDto = (productId2: string): GalleryProduct | null => {
    const p = shop.products.find((x) => x.id === productId2);
    if (!p) return null;
    const variants = shop.variants.filter((v) => v.productId === productId2);
    // Prefer the default variant if it can be bought, then any buyable one, then the default.
    const variant =
      variants.find((v) => v.isDefault && v.available) ??
      variants.find((v) => v.available) ??
      variants.find((v) => v.isDefault) ??
      variants[0];
    if (!variant) return null;
    const image =
      shop.images.find((i) => i.productId === productId2 && i.variantId === null) ??
      shop.images.find((i) => i.productId === productId2);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      imageUrl: image?.url ?? null,
      priceCents: variant.priceCents,
      currency: variant.currency,
      variantId: variant.available ? variant.id : null,
      inStock: variant.available,
    };
  };

  const captioned = await translateCaptions(photos);
  return captioned.map((p) => ({
    id: p.id,
    path: p.path,
    caption: p.caption,
    petName: p.petName,
    products: links
      .filter((l) => l.photoId === p.id)
      .map((l) => productDto(l.productId))
      .filter((x): x is GalleryProduct => x !== null),
  }));
}

// ---------- admin ----------

async function withLinks(rows: repo.PhotoRow[]): Promise<AdminGalleryPhoto[]> {
  const links = await repo.linksFor(rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id,
    path: r.path,
    caption: r.caption,
    petName: r.petName,
    sortOrder: r.sortOrder,
    published: r.published,
    productIds: links.filter((l) => l.photoId === r.id).map((l) => l.productId),
  }));
}

export async function listAdmin(): Promise<AdminGalleryPhoto[]> {
  return withLinks(await repo.listPhotos({ onlyPublished: false }));
}

async function assertProducts(ids: string[]) {
  const found = await repo.existingProductIds(ids);
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0)
    throw validation({ productIds: missing }, 'Unknown product in the link list');
}

export async function createPhoto(input: z.output<typeof GalleryInputSchema>) {
  const productIds = [...new Set(input.productIds)];
  await assertProducts(productIds);
  const row = await db.transaction(async (tx) => {
    const created = await repo.insertPhoto(tx, {
      path: input.path,
      caption: input.caption,
      petName: input.petName,
      sortOrder: input.sortOrder,
      published: input.published,
    });
    await repo.replaceLinks(tx, created.id, productIds);
    return created;
  });
  return (await withLinks([row]))[0]!;
}

export async function updatePhoto(id: string, input: z.output<typeof GalleryUpdateSchema>) {
  const { productIds, ...fields } = input;
  const unique = productIds ? [...new Set(productIds)] : undefined;
  if (unique) await assertProducts(unique);
  const out = await db.transaction(async (tx) => {
    const before = await repo.findPhotoIn(tx, id);
    const updated = await repo.updatePhoto(tx, id, fields);
    if (!updated) return undefined;
    if (unique) await repo.replaceLinks(tx, id, unique);
    return { updated, oldPath: before?.path };
  });
  if (!out) throw notFound('Gallery photo not found');
  // `replacedPath` is the file the entry no longer shows, so the caller can remove it.
  const replacedPath = out.oldPath && out.oldPath !== out.updated.path ? out.oldPath : undefined;
  return { photo: (await withLinks([out.updated]))[0]!, replacedPath };
}

export async function removePhoto(id: string): Promise<string> {
  const row = await repo.deletePhoto(id);
  if (!row) throw notFound('Gallery photo not found');
  return row.path;
}
