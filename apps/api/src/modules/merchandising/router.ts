import {
  BrandListResponseSchema,
  BrandResponseSchema,
  CollectionListResponseSchema,
  CollectionResponseSchema,
  SlugParamsSchema,
  TagListResponseSchema,
  type Brand,
  type Collection,
} from '@store/shared';
import { Router as ExpressRouter, type Router } from 'express';

import { respond, valid, validate } from '../../lib/validate.ts';
import { publicCache } from '../../middleware/cache.ts';
import { overlay, pick, resolveSlug, slugsByLang } from '../i18n/translations.ts';

import * as service from './service.ts';

// Public reads show the store view's words (English per field where untranslated). The admin has
// its own routes and always reads English.
const translateBrands = (items: Brand[]) =>
  overlay('brand', items, (b, t) => ({
    ...b,
    slug: pick(t, 'slug', b.slug),
    name: pick(t, 'name', b.name),
    tagline: pick(t, 'tagline', b.tagline),
    story: pick(t, 'story', b.story),
  }));
const translateCollections = (items: Collection[]) =>
  overlay('collection', items, (c, t) => ({
    ...c,
    slug: pick(t, 'slug', c.slug),
    name: pick(t, 'name', c.name),
    description: pick(t, 'description', c.description),
  }));

// Public, cookie-free and cacheable like the rest of the catalog, so it is mounted before the
// session middleware and scoped by path (see catalog/router.ts for why).
export const merchandisingRouter: Router = ExpressRouter();
merchandisingRouter.use(['/brands', '/collections', '/tags'], publicCache);

merchandisingRouter.get('/brands', async (_req, res) => {
  respond(res, BrandListResponseSchema, {
    data: await translateBrands(await service.listBrands()),
  });
});

const bySlug = { params: SlugParamsSchema };
merchandisingRouter.get('/brands/:slug', validate(bySlug), async (req, res) => {
  const { params } = valid(req, bySlug);
  const brand = await service.getBrand(await resolveSlug('brand', params.slug));
  const [[translated], slugs] = await Promise.all([
    translateBrands([brand]),
    slugsByLang('brand', brand.slug),
  ]);
  respond(res, BrandResponseSchema, { data: { ...(translated as Brand), slugs } });
});

merchandisingRouter.get('/collections', async (_req, res) => {
  respond(res, CollectionListResponseSchema, {
    data: await translateCollections(await service.listLiveCollections()),
  });
});

merchandisingRouter.get('/collections/:slug', validate(bySlug), async (req, res) => {
  const { params } = valid(req, bySlug);
  const collection = await service.getLiveCollection(await resolveSlug('collection', params.slug));
  const [[translated], slugs] = await Promise.all([
    translateCollections([collection]),
    slugsByLang('collection', collection.slug),
  ]);
  respond(res, CollectionResponseSchema, { data: { ...(translated as Collection), slugs } });
});

merchandisingRouter.get('/tags', async (_req, res) => {
  respond(res, TagListResponseSchema, { data: await service.listTags() });
});
