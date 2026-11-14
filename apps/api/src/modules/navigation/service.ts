import {
  PET_CATEGORY_SLUGS,
  PET_VALUES,
  type AdminMenuPromo,
  type AdminMenuPromoInputSchema,
  type AdminMenuPromoUpdateSchema,
  type NavPet,
  type Navigation,
} from '@store/shared';
import type { z } from 'zod';

import { notFound } from '../../lib/errors.ts';
import * as catalogService from '../catalog/service.ts';
import { localizeCopy } from '../i18n/copy.ts';

import * as repo from './repo.ts';

const MAX_BRANDS = 8;

const toAdminPromo = (row: repo.MenuPromoRow): AdminMenuPromo => ({
  id: row.id,
  pet: row.pet,
  title: row.title,
  subtitle: row.subtitle,
  imageUrl: row.imageUrl,
  imageAlt: row.imageAlt,
  link: row.link,
  sortOrder: row.sortOrder,
  active: row.active,
});

// One call builds the whole menu: the category tree, the brands per pet and the promos. Nothing in
// it depends on who is looking, so it is cached publicly (see the router). A pet whose top-level
// category does not exist (a trimmed-down catalogue) simply has no panel.
export async function getNavigation(): Promise<Navigation> {
  const [tree, brandRows, promos] = await Promise.all([
    catalogService.getCategoryTree(),
    repo.brandsByPet(),
    repo.listActivePromos(),
  ]);
  const pets: NavPet[] = [];
  for (const pet of PET_VALUES) {
    const root = tree.find((c) => c.slug === PET_CATEGORY_SLUGS[pet]);
    if (!root) continue;
    // A pet's own promo first, else the first "any pet" promo, in the editor's order.
    const promo = promos.find((p) => p.pet === pet) ?? promos.find((p) => p.pet === null) ?? null;
    pets.push({
      pet,
      name: root.name,
      categorySlug: root.slug,
      categories: root.children.map((c) => ({
        slug: c.slug,
        name: c.name,
        productCount: c.productCount,
      })),
      brands: brandRows
        .filter((b) => b.pet === pet)
        .slice(0, MAX_BRANDS)
        .map((b) => ({ slug: b.slug, name: b.name })),
      promo: promo
        ? {
            title: localizeCopy(promo.title),
            subtitle: localizeCopy(promo.subtitle),
            imageUrl: promo.imageUrl,
            imageAlt: localizeCopy(promo.imageAlt),
            link: promo.link,
          }
        : null,
    });
  }
  return { pets };
}

// ---------- admin ----------

export async function adminListPromos(): Promise<AdminMenuPromo[]> {
  return (await repo.listPromos()).map(toAdminPromo);
}

export async function createPromo(
  input: z.output<typeof AdminMenuPromoInputSchema>,
): Promise<AdminMenuPromo> {
  // New promos go to the end of the list unless the editor says where.
  const sortOrder = input.sortOrder ?? (await repo.nextSortOrder());
  return toAdminPromo(await repo.insertPromo({ ...input, sortOrder }));
}

export async function updatePromo(
  id: string,
  input: z.output<typeof AdminMenuPromoUpdateSchema>,
): Promise<AdminMenuPromo> {
  const row = await repo.updatePromo(id, input);
  if (!row) throw notFound('Menu promo not found');
  return toAdminPromo(row);
}

export async function deletePromo(id: string): Promise<void> {
  if (!(await repo.deletePromo(id))) throw notFound('Menu promo not found');
}
