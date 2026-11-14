import {
  averageTenths,
  CONSTITUENT_KEYS,
  FACET_KEYS,
  badgeFromSlug,
  badgeSlug,
  buildQuickChips,
  unitPriceCents,
  type Badge,
  type Category,
  type CategoryNode,
  type Facets,
  type ProductDetail,
  type ProductCard,
  type ProductListQuery,
  type ProductListResponse,
  bundleSavingCents,
} from '@store/shared';

import { db } from '../../db/client.ts';
import { notFound } from '../../lib/errors.ts';
import { translateFaqs, translateSizeGuide, translateSpecs } from '../i18n/content-translations.ts';
import { loadTranslations, overlay, pick, resolveSlug, slugsByLang } from '../i18n/translations.ts';
import {
  memberPricesForProducts,
  saleOffersForProducts,
  syncFlashSales,
} from '../promotions/service.ts';
import { noticesForVariants } from '../safety/service.ts';

import { getBadgeIndex, type BadgeIndex } from './badge-index.ts';
import * as bundlesRepo from './bundles-repo.ts';
import * as repo from './repo.ts';

function toCategory(row: repo.CategoryRow, productCount = row.productCount): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
    accentColor: row.attributes.accentColor ?? null,
    icon: row.attributes.icon ?? null,
    productCount,
  };
}

// A parent's own count is nearly always 0 (products live in leaf categories), so what a shopper
// wants to see next to "Dogs" is the total of its children plus anything attached directly.
function toNode(row: repo.CategoryRow, children: repo.CategoryRow[]): CategoryNode {
  const total = children.reduce((sum, c) => sum + c.productCount, row.productCount);
  return { ...toCategory(row, total), children: children.map((c) => toCategory(c)) };
}

// Names, descriptions and slugs in the store view's language (English fields where a translation
// is missing).
async function translateNodes(nodes: CategoryNode[]): Promise<CategoryNode[]> {
  const flat = nodes.flatMap((n) => [n, ...n.children]);
  const found = await loadTranslations(
    'category',
    flat.map((c) => c.slug),
  );
  if (found.size === 0) return nodes;
  const one = <T extends Category>(c: T): T => {
    const t = found.get(c.slug);
    return t
      ? {
          ...c,
          slug: pick(t, 'slug', c.slug),
          name: pick(t, 'name', c.name),
          description: pick(t, 'description', c.description),
        }
      : c;
  };
  return nodes.map((n) => ({ ...one(n), children: n.children.map(one) }));
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const rows = await repo.listCategories();
  return translateNodes(
    rows
      .filter((r) => r.parentId === null)
      .map((root) =>
        toNode(
          root,
          rows.filter((r) => r.parentId === root.id),
        ),
      ),
  );
}

export async function getCategory(slugFromUrl: string): Promise<CategoryNode> {
  const slug = await resolveSlug('category', slugFromUrl);
  const rows = await repo.getCategoryBySlug(slug);
  const self = rows.find((r) => r.slug === slug);
  if (!self) throw notFound('Category not found');
  const [[node], slugs] = await Promise.all([
    translateNodes([
      toNode(
        self,
        rows.filter((r) => r.parentId === self.id),
      ),
    ]),
    slugsByLang('category', slug),
  ]);
  return { ...(node as CategoryNode), slugs };
}

// ---------- product list ----------

// The member price leaves the API only for a signed-in viewer; a guest gets the boolean alone.
// Callers that never look up a user (guides) pass isMember=false, so their cards are anonymous.
function memberFields(cents: number | undefined, isMember: boolean) {
  return {
    hasMemberPrice: cents !== undefined,
    member: isMember && cents !== undefined ? { priceCents: cents } : null,
  };
}

// Who is asking: only the id matters here (a member price is for any signed-in account).
export interface Viewer {
  isMember: boolean;
}
const GUEST: Viewer = { isMember: false };

function toCard(
  row: repo.ProductCardRow,
  image: repo.ProductImageRow | undefined,
  badges: Badge[],
  swatches: ProductCard['swatches'],
  sale: ProductCard['sale'],
  memberCents: number | undefined,
  isMember: boolean,
): ProductCard {
  // Only the facet keys leave the API on a card: the jsonb may hold internal keys (optionKeys).
  const attributes: ProductCard['attributes'] = {};
  for (const key of FACET_KEYS) {
    const value = row.attributes[key];
    if (value !== undefined) attributes[key] = value;
  }
  // The brand name lives in its own table now; the card keeps showing it as an attribute.
  if (row.brandName) attributes.brand = row.brandName;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categorySlug: row.categorySlug,
    image: image
      ? {
          id: image.id,
          url: image.url,
          alt: image.alt,
          width: image.width,
          height: image.height,
          variantId: image.variantId,
        }
      : null,
    price: { minCents: row.minCents, maxCents: row.maxCents, currency: row.currency },
    inStock: row.inStock,
    attributes,
    brand: row.brandSlug && row.brandName ? { slug: row.brandSlug, name: row.brandName } : null,
    badges,
    unitPrice:
      row.unitCents !== null && row.unitPer !== null
        ? { cents: row.unitCents, per: row.unitPer === 'g' ? 'kg' : 'L' }
        : null,
    swatches,
    sale,
    ...memberFields(memberCents, isMember),
    rating: {
      count: row.ratingCount,
      averageTenths: averageTenths(row.ratingCount, row.ratingSum),
    },
  };
}

// The badge filter needs ids, and badges are derived in code (one source of truth), so the filter
// is resolved against the cached index first and handed to SQL as a list of product ids.
function badgeProductIds(query: ProductListQuery, index: BadgeIndex): string[] | undefined {
  if (!query.badge) return undefined;
  const wanted = new Set(query.badge.map(badgeFromSlug));
  return [...index].filter(([, badges]) => badges.some((b) => wanted.has(b))).map(([id]) => id);
}

function toFilters(query: ProductListQuery, index: BadgeIndex): repo.ProductFilters {
  const badgeIds = badgeProductIds(query, index);
  return {
    ...(query.q !== undefined && { q: query.q }),
    ...(query.category !== undefined && { category: query.category }),
    ...(query.minPrice !== undefined && { minPriceCents: query.minPrice }),
    ...(query.maxPrice !== undefined && { maxPriceCents: query.maxPrice }),
    ...(query.inStock !== undefined && { inStock: query.inStock }),
    ...(query.brand !== undefined && { brand: query.brand }),
    ...(query.tag !== undefined && { tag: query.tag }),
    ...(query.collection !== undefined && { collection: query.collection }),
    ...(badgeIds !== undefined && { badgeProductIds: badgeIds }),
    attr: query.attr,
  };
}

async function translateBrandFacet<T extends { value: string; label: string }>(
  items: T[],
): Promise<T[]> {
  const found = await loadTranslations(
    'brand',
    items.map((i) => i.value),
  );
  return found.size === 0
    ? items
    : items.map((i) => ({ ...i, label: pick(found.get(i.value), 'name', i.label) }));
}

async function getFacets(query: ProductListQuery, index: BadgeIndex): Promise<Facets> {
  const rows = await repo.getFacets(toFilters(query, index), FACET_KEYS);
  // Every facet key is present (possibly empty) so the filter UI never has to guess.
  const attributes: Facets['attributes'] = Object.fromEntries(FACET_KEYS.map((key) => [key, []]));
  for (const { key, value, count } of rows.attributes) attributes[key]?.push({ value, count });

  // Badge counts: how many products in the scope carry each badge, from the same index.
  const badgeCounts = new Map<Badge, number>();
  for (const id of rows.scopeProductIds)
    for (const badge of index.get(id) ?? [])
      badgeCounts.set(badge, (badgeCounts.get(badge) ?? 0) + 1);

  return {
    attributes,
    brand: await translateBrandFacet(
      rows.brand.map((b) => ({ value: b.slug, label: b.name, count: b.count })),
    ),
    tag: rows.tag.map((t) => ({ value: t.slug, label: t.name, count: t.count })),
    badge: [...badgeCounts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([badge, count]) => ({ value: badgeSlug(badge), label: badge, count })),
    price: rows.price,
  };
}

// Cards with their first image, swatches and badges: one place, so the list and other modules
// (guides) show the same card.
async function buildCards(
  rows: repo.ProductCardRow[],
  index: Awaited<ReturnType<typeof getBadgeIndex>>,
  viewer: Viewer,
): Promise<ProductCard[]> {
  const ids = rows.map((r) => r.id);
  await syncFlashSales(db);
  const [images, swatchRows, offers, members] = await Promise.all([
    repo.listPrimaryImages(ids),
    repo.listSwatches(ids),
    saleOffersForProducts(ids),
    memberPricesForProducts(ids),
  ]);
  const imageByProduct = new Map(images.map((i) => [i.productId, i]));
  const swatchesByProduct = new Map<string, ProductCard['swatches']>();
  for (const s of swatchRows) {
    const list = swatchesByProduct.get(s.productId) ?? [];
    list.push({
      color: s.color,
      hex: s.hex,
      image:
        s.imageId && s.imageUrl
          ? {
              id: s.imageId,
              url: s.imageUrl,
              alt: s.imageAlt ?? '',
              width: s.imageWidth ?? 1200,
              height: s.imageHeight ?? 1200,
              variantId: s.imageVariantId,
            }
          : null,
    });
    swatchesByProduct.set(s.productId, list);
  }

  const cards = rows.map((row) =>
    toCard(
      row,
      imageByProduct.get(row.id),
      index.get(row.id) ?? [],
      swatchesByProduct.get(row.id) ?? [],
      offers.byProduct.get(row.id) ?? null,
      members.byProduct.get(row.id),
      viewer.isMember,
    ),
  );
  return translateCards(cards);
}

async function translateCards(cards: ProductCard[]): Promise<ProductCard[]> {
  const translated = await overlay('product', cards, (c, t) => ({
    ...c,
    slug: pick(t, 'slug', c.slug),
    name: pick(t, 'name', c.name),
  }));
  const brandSlugs = [...new Set(translated.flatMap((c) => (c.brand ? [c.brand.slug] : [])))];
  const brandT = await loadTranslations('brand', brandSlugs);
  if (brandT.size === 0) return translated;
  return translated.map((c) => {
    const bt = c.brand ? brandT.get(c.brand.slug) : undefined;
    if (!c.brand || !bt) return c;
    const name = pick(bt, 'name', c.brand.name);
    return { ...c, brand: { ...c.brand, name }, attributes: { ...c.attributes, brand: name } };
  });
}

// A category, brand or collection slug in the query may be a translated one.
async function withBaseSlugs(query: ProductListQuery): Promise<ProductListQuery> {
  const [category, brand, collection] = await Promise.all([
    query.category ? resolveSlug('category', query.category) : undefined,
    query.brand ? Promise.all(query.brand.map((b) => resolveSlug('brand', b))) : undefined,
    query.collection ? resolveSlug('collection', query.collection) : undefined,
  ]);
  return {
    ...query,
    ...(category !== undefined && { category }),
    ...(brand !== undefined && { brand }),
    ...(collection !== undefined && { collection }),
  };
}

export async function listProducts(
  rawQuery: ProductListQuery,
  viewer: Viewer = GUEST,
): Promise<ProductListResponse> {
  const query = await withBaseSlugs(rawQuery);
  // `relevance` only means something with a search term; without one it would be an arbitrary
  // order, so it quietly becomes the default.
  // Inside a collection the editor's order is the default, otherwise newest first.
  const sort = query.sort ?? (query.q ? 'relevance' : query.collection ? 'collection' : 'newest');
  const index = await getBadgeIndex();
  const [{ rows, total }, facets] = await Promise.all([
    repo.listProducts({
      filters: toFilters(query, index),
      sort,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    }),
    getFacets(query, index),
  ]);
  return {
    data: await buildCards(rows, index, viewer),
    // Same scope as the facets (they ignore the filter just clicked), so a chip never disappears
    // when it is switched on, and never leads to an empty list.
    chips: buildQuickChips(facets),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
    facets,
  };
}

// The same cards the list shows (price range, stock, first image) for a given set of products, so
// other modules (guides) never rebuild them. Inactive or unbuyable products are left out, exactly
// as in the list.
export async function listCardsByIds(
  ids: string[],
  viewer: Viewer = GUEST,
  opts: { inStockOnly?: boolean } = {},
): Promise<ProductCard[]> {
  if (ids.length === 0) return [];
  const { rows } = await repo.listProducts({
    filters: { attr: {}, ids, ...(opts.inStockOnly && { inStock: true }) },
    sort: 'name',
    limit: ids.length,
    offset: 0,
  });
  return buildCards(rows, await getBadgeIndex(), viewer);
}

// The same cards in the order the caller asked for (recently viewed, recommendations); ids that
// are not on sale (archived, draft, unbuyable) are simply absent from the answer.
export async function listCardsInOrder(
  ids: string[],
  viewer: Viewer = GUEST,
  opts: { inStockOnly?: boolean } = {},
): Promise<ProductCard[]> {
  const cards = await listCardsByIds(ids, viewer, opts);
  const position = new Map(ids.map((id, i) => [id, i]));
  return cards.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
}

// The homepage bestsellers: products carrying the Bestseller badge (sales-derived or the editorial
// override, both inside the badge index). Fewer than `limit` of them (a new shop with no orders
// and no overrides) is topped up with the newest products so the section never looks half empty.
export async function listBestsellerCards(limit: number): Promise<ProductCard[]> {
  const index = await getBadgeIndex();
  const ids = [...index].filter(([, badges]) => badges.includes('Bestseller')).map(([id]) => id);
  const { rows } = await repo.listProducts({
    filters: { attr: {}, ids },
    sort: 'newest',
    limit,
    offset: 0,
  });
  // Built as a guest's: /home is public and cached, so it must never carry a member price.
  let cards = await buildCards(rows, index, GUEST);
  if (cards.length < limit) {
    const taken = new Set(cards.map((c) => c.id));
    const fill = await repo.listProducts({
      filters: { attr: {} },
      sort: 'newest',
      limit: limit + taken.size,
      offset: 0,
    });
    const extra = (await buildCards(fill.rows, index, GUEST)).filter((c) => !taken.has(c.id));
    cards = [...cards, ...extra].slice(0, limit);
  }
  return cards;
}

// ---------- product detail ----------

const CONSTITUENT_ORDER: readonly string[] = CONSTITUENT_KEYS;
const sortConstituents = <T extends { key: string }>(list: T[]): T[] =>
  [...list].sort((a, b) => CONSTITUENT_ORDER.indexOf(a.key) - CONSTITUENT_ORDER.indexOf(b.key));

export async function getProduct(
  slugFromUrl: string,
  viewer: Viewer = GUEST,
): Promise<ProductDetail> {
  const rows = await repo.getProductBySlug(await resolveSlug('product', slugFromUrl));
  // A product with no active variant cannot be bought, so it is as good as missing (the list
  // hides it for the same reason).
  if (!rows || rows.variants.length === 0) throw notFound('Product not found');

  await syncFlashSales(db);
  const offers = await saleOffersForProducts([rows.product.id]);
  const members = await memberPricesForProducts([rows.product.id]);
  const variants = rows.variants.map((v) => {
    const availableUnits = v.quantity - v.reserved;
    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      options: v.options,
      priceCents: v.priceCents,
      compareAtPriceCents: v.compareAtPriceCents,
      currency: v.currency,
      isDefault: v.isDefault,
      // Booleans only: the exact stock level is not for the public.
      available: availableUnits > 0,
      lowStock: availableUnits > 0 && availableUnits <= v.lowStockThreshold,
      netAmount: v.netAmount,
      netUnit: v.netUnit,
      unitPrice: unitPriceCents(v.priceCents, v.netAmount, v.netUnit),
      isTrial: v.isTrial,
      swatchHex: v.swatchHex,
      sale: offers.byVariant.get(v.id) ?? null,
      ...memberFields(members.byVariant.get(v.id), viewer.isMember),
      // Fixed display order (protein first), not insertion order.
      constituents: sortConstituents(rows.constituents.get(v.id) ?? []),
    };
  });
  // A sample size must not set the "from" price of the product.
  const sellable = variants.filter((v) => !v.isTrial);
  const prices = (sellable.length > 0 ? sellable : variants).map((v) => v.priceCents);
  const { optionKeys = [], ...publicAttributes } = rows.product.attributes;
  const attributes: ProductDetail['attributes'] = {
    ...publicAttributes,
    ...(rows.brand && { brand: rows.brand.name }),
  };
  const badges = (await getBadgeIndex()).get(rows.product.id) ?? [];

  // Translated name, slug, description, category/brand names; each falls back to English alone.
  const [pt, ct, bt, slugs] = await Promise.all([
    loadTranslations('product', [rows.product.slug]),
    loadTranslations('category', [rows.category.slug, ...(rows.parent ? [rows.parent.slug] : [])]),
    rows.brand ? loadTranslations('brand', [rows.brand.slug]) : Promise.resolve(undefined),
    slugsByLang('product', rows.product.slug),
  ]);
  const tr = pt.get(rows.product.slug);
  // Specs, FAQs and the size guide are rows of their own with their own translation rows.
  const [specs, faqs, guide] = await Promise.all([
    translateSpecs(rows.specs),
    translateFaqs(rows.faqs),
    rows.sizeGuide ? translateSizeGuide(rows.sizeGuide.id, rows.sizeGuide) : Promise.resolve(null),
  ]);
  const nameOf = <T extends { slug: string; name: string }>(c: T): T => {
    const t = ct.get(c.slug);
    return t ? { ...c, slug: pick(t, 'slug', c.slug), name: pick(t, 'name', c.name) } : c;
  };
  const category = nameOf(rows.category);
  const parent = rows.parent ? nameOf(rows.parent) : null;
  const brand = rows.brand
    ? { ...rows.brand, name: pick(bt?.get(rows.brand.slug), 'name', rows.brand.name) }
    : null;
  if (brand) attributes.brand = brand.name;

  return {
    id: rows.product.id,
    slug: pick(tr, 'slug', rows.product.slug),
    slugs,
    name: pick(tr, 'name', rows.product.name),
    description: pick(tr, 'description', rows.product.description),
    category,
    breadcrumb: parent ? [parent, category] : [category],
    attributes,
    brand,
    tags: rows.tags,
    badges,
    optionKeys,
    price: {
      minCents: Math.min(...prices),
      maxCents: Math.max(...prices),
      currency: variants[0]?.currency ?? 'EUR',
    },
    inStock: variants.some((v) => v.available),
    variants,
    images: rows.images.map((i) => ({
      id: i.id,
      url: i.url,
      alt: i.alt,
      width: i.width,
      height: i.height,
      variantId: i.variantId,
    })),
    // Notices are looked up by variant: a recall is often one size, and the page then warns about
    // the product as a whole (the shopper may switch variants without a reload).
    safetyNotices: await noticesForVariants(rows.variants.map((v) => v.id)),
    specs: specs.map(({ label, value }) => ({ label, value })),
    faqs,
    feedingTable: rows.feeding,
    sizeGuide: guide && {
      slug: guide.slug,
      title: guide.title,
      columns: guide.table.columns,
      rows: guide.table.rows,
      howtoMd: guide.howtoMd,
      tip: guide.tip,
    },
    deliveryNote: pick(tr, 'deliveryNote', rows.deliveryNote),
    rating: {
      count: rows.product.ratingCount,
      averageTenths: averageTenths(rows.product.ratingCount, rows.product.ratingSum),
    },
    requiresVetApproval: rows.product.requiresVetApproval,
    ...(await bundleFields(rows.product.id, rows.variants)),
  };
}

// A kit's own page lists what is inside; a component's page lists the kits it is part of. Both are
// derived from bundle_items, so neither can disagree with what checkout actually reserves.
async function bundleFields(productId: string, variants: { id: string; priceCents: number }[]) {
  const variantIds = variants.map((v) => v.id);
  const kits = await bundlesRepo.listKitsContaining(productId);
  const lines = await bundlesRepo.listBundleLines([...variantIds, ...kits.map((k) => k.variantId)]);
  const partsOf = (bundleVariantId: string) =>
    lines
      .filter((l) => l.bundleVariantId === bundleVariantId)
      .map(({ bundleVariantId: _drop, componentVariantId, ...l }) => ({
        variantId: componentVariantId,
        ...l,
      }));
  const own = variants.find((v) => lines.some((l) => l.bundleVariantId === v.id));
  const ownParts = own ? partsOf(own.id) : [];
  return {
    bundle:
      own && ownParts.length > 0
        ? {
            variantId: own.id,
            components: ownParts,
            ...bundleSavingCents(own.priceCents, ownParts),
          }
        : null,
    kits: kits.map((k) => {
      const parts = partsOf(k.variantId);
      return {
        slug: k.slug,
        name: k.name,
        variantId: k.variantId,
        priceCents: k.priceCents,
        ...bundleSavingCents(k.priceCents, parts),
        available: k.available,
        contents: parts
          .map((p) => (p.qty > 1 ? `${p.qty} x ${p.productName}` : p.productName))
          .join(', '),
      };
    }),
  };
}
