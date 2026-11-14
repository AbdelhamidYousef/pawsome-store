import { CONSTITUENT_KEYS, type ConstituentKey, type SizeGuideTable } from '@store/shared';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { stockQuantity, stockReserved } from '../../db/available.ts';
import { db } from '../../db/client.ts';
import {
  brands,
  categories,
  collectionProducts,
  collections,
  feedingRows,
  inventory,
  orderItems,
  orders,
  productFaqs,
  productImages,
  productSpecs,
  productTags,
  productVariants,
  products,
  sizeGuides,
  tags,
  variantConstituents,
} from '../../db/schema/index.ts';
import type { ProductAttributes } from '../../db/schema/products.ts';
import { currentLang, currentStore } from '../i18n/context.ts';
import { compareAtIn, hasPriceIn, priceIn } from '../i18n/prices.ts';

export type CategoryRow = typeof categories.$inferSelect & { productCount: number };

// Active products per category, as a subquery joined once: counts for the whole tree cost one
// query instead of one per category.
function withCounts() {
  const counts = db
    .select({ categoryId: products.categoryId, n: count().as('n') })
    .from(products)
    .where(eq(products.status, 'active'))
    .groupBy(products.categoryId)
    .as('product_counts');
  return db
    .select({
      category: categories,
      // coalesce: a category with no products has no row in the subquery.
      productCount: sql<number>`coalesce(${counts.n}, 0)::int`,
    })
    .from(categories)
    .leftJoin(counts, eq(counts.categoryId, categories.id));
}

function flatten(rows: { category: typeof categories.$inferSelect; productCount: number }[]) {
  return rows.map((r): CategoryRow => ({ ...r.category, productCount: r.productCount }));
}

export async function listCategories(): Promise<CategoryRow[]> {
  return flatten(await withCounts().orderBy(categories.sortOrder, categories.name));
}

// The category and its direct children in one round trip (the tree is one level deep).
export async function getCategoryBySlug(slug: string): Promise<CategoryRow[]> {
  const parent = db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug));
  return flatten(
    await withCounts()
      .where(or(eq(categories.slug, slug), eq(categories.parentId, sql`(${parent})`)))
      .orderBy(categories.sortOrder, categories.name),
  );
}

// ---------- product list ----------

export type SortKey =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'unit_price_asc'
  // Internal: the editor's order inside the collection being browsed (the default there).
  | 'collection'
  | 'newest'
  | 'name';

export interface ProductFilters {
  /** Free-text search term, already trimmed (1-100 characters). */
  q?: string;
  /** Category slug; its child categories are included. */
  category?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  /** Brand slugs (OR). */
  brand?: string[];
  /** Health-need tag slugs (OR). */
  tag?: string[];
  /** Product ids that carry any of the requested badges, resolved by the service. */
  badgeProductIds?: string[];
  /** Collection slug; matches nothing unless that collection is live right now. */
  collection?: string;
  /** key -> accepted values: OR within a key, AND across keys. */
  attr: Record<string, string[]>;
  /** Only these products (used by guides to show the products they recommend). */
  ids?: string[];
}

// Postgres full-text needs a few letters to mean anything (and the english config drops stop
// words), so one or two characters fall back to a plain substring match on the name.
const SHORT_QUERY_MAX = 2;

// `IN ()` is a syntax error, so an empty id list matches this id, which no row has.
const NO_ID = '00000000-0000-0000-0000-000000000000';

const tsQuery = (q: string) => sql`websearch_to_tsquery('english', ${q})`;

// `%` and `_` are wildcards in LIKE; a shopper typing "50%" means the characters.
const likeEscape = (q: string) => q.replace(/[\\%_]/g, '\\$&');

export interface ProductListParams {
  filters: ProductFilters;
  sort: SortKey;
  limit: number;
  offset: number;
}

// Per-product facts about its *active, non-trial* variants (a 50 g sample at 0.99 must not turn
// every card's "from" price into 0.99), computed once and joined: cheapest and dearest
// price for the "from" line, and whether any variant has stock left. Products with no active
// variant have no row here, so an inner join also hides products nobody could buy.
export function variantSummary() {
  const price = priceIn();
  return db
    .select({
      productId: productVariants.productId,
      minCents: sql<number>`min(${price})`.as('min_cents'),
      maxCents: sql<number>`max(${price})`.as('max_cents'),
      currency: sql<string>`${currentStore().currency}::char(3)`.as('currency'),
      // Unit price of the default variant, integer cents per kg/L, in SQL so it can be sorted on.
      // Same rule as unitPriceCents() in packages/shared: round half up, bigint so price * 1000
      // cannot overflow a 32-bit integer. Null when the default variant has no net amount.
      unitCents: sql<
        number | null
      >`max(case when ${productVariants.isDefault} and ${productVariants.netAmount} is not null then ((2 * ${price}::bigint * 1000 + ${productVariants.netAmount}) / (2 * ${productVariants.netAmount}))::int end)`.as(
        'unit_cents',
      ),
      unitPer: sql<
        string | null
      >`max(case when ${productVariants.isDefault} and ${productVariants.netUnit} is not null then ${productVariants.netUnit}::text end)`.as(
        'unit_per',
      ),
      inStock:
        sql<boolean>`coalesce(bool_or(${stockQuantity(productVariants.id)} - ${stockReserved(productVariants.id)} > 0), false)`.as(
          'in_stock',
        ),
    })
    .from(productVariants)
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(
      and(
        eq(productVariants.status, 'active'),
        eq(productVariants.isTrial, false),
        // No price in this store's currency: not sold here, and a product with no such variant has
        // no row, so the inner join hides it.
        hasPriceIn(),
      ),
    )
    .groupBy(productVariants.productId)
    .as('variant_summary');
}

export interface ProductCardRow {
  id: string;
  slug: string;
  name: string;
  attributes: ProductAttributes;
  categorySlug: string;
  minCents: number;
  maxCents: number;
  currency: string;
  inStock: boolean;
  unitCents: number | null;
  unitPer: string | null;
  brandSlug: string | null;
  brandName: string | null;
  ratingCount: number;
  ratingSum: number;
}

export interface ProductImageRow {
  id: string;
  productId: string;
  variantId: string | null;
  url: string;
  alt: string;
  width: number;
  height: number;
}

// Every ordering ends in `products.id`: without a unique last key, rows that tie on the sort
// column may swap places between pages and a shopper would see duplicates or gaps.
function orderBy(
  sort: SortKey,
  v: ReturnType<typeof variantSummary>,
  q?: string,
  collection?: string,
): SQL[] {
  switch (sort) {
    case 'collection':
      return [
        sql`(select cp.position from ${collectionProducts} cp join ${collections} c on c.id = cp.collection_id where cp.product_id = ${products.id} and c.slug = ${collection ?? ''}) asc nulls last`,
        asc(products.id),
      ];
    case 'price_asc':
      return [asc(v.minCents), asc(products.id)];
    case 'price_desc':
      return [desc(v.minCents), asc(products.id)];
    case 'unit_price_asc':
      // Products without a unit price (toys, beds) go last instead of first.
      return [sql`${v.unitCents} asc nulls last`, asc(v.minCents), asc(products.id)];
    case 'name':
      return [asc(sql`lower(${products.name})`), asc(products.id)];
    case 'relevance': {
      // Without a term there is nothing to rank by; newest is the sensible stand-in.
      if (!q) return [desc(products.createdAt), asc(products.id)];
      const rank =
        q.length <= SHORT_QUERY_MAX
          ? // Substring fallback has no score, so names that *start* with the input go first.
            sql`(${products.name} ilike ${likeEscape(q) + '%'})::int`
          : sql`ts_rank(${products.searchVector}, ${tsQuery(q)})`;
      return [desc(rank), desc(products.createdAt), asc(products.id)];
    }
    case 'newest':
      return [desc(products.createdAt), asc(products.id)];
  }
}

export function liveCollection(): SQL {
  return sql`(${collections.isActive} and (${collections.startsAt} is null or ${collections.startsAt} <= now()) and (${collections.endsAt} is null or ${collections.endsAt} > now()))`;
}

// The part of the filters that defines "what the shopper is browsing": active products in the
// category that match the search. Facets are computed over exactly this scope.
function scopeConditions(f: ProductFilters): SQL[] {
  const conds: SQL[] = [eq(products.status, 'active')];

  if (f.ids) conds.push(inArray(products.id, f.ids.length > 0 ? f.ids : [NO_ID]));

  if (f.category) {
    // The category itself or any direct child (the tree is one level deep). An unknown slug
    // matches nothing, which correctly yields an empty list.
    const parent = db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, f.category));
    conds.push(
      inArray(
        products.categoryId,
        db
          .select({ id: categories.id })
          .from(categories)
          .where(or(eq(categories.slug, f.category), eq(categories.parentId, sql`(${parent})`))),
      ),
    );
  }

  if (f.collection) {
    // Live = switched on and inside its window (open-ended windows allowed). The same rule the
    // public collection endpoint uses, so a filter never reveals a hidden collection's products.
    conds.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(collectionProducts)
          .innerJoin(collections, eq(collections.id, collectionProducts.collectionId))
          .where(
            and(
              eq(collectionProducts.productId, products.id),
              eq(collections.slug, f.collection),
              liveCollection(),
            ),
          ),
      ),
    );
  }

  if (f.q) {
    const english =
      f.q.length <= SHORT_QUERY_MAX
        ? ilike(products.name, `%${likeEscape(f.q)}%`)
        : // A query made only of stop words ("the") compiles to an empty tsquery that matches
          // nothing; treat that case as a name substring search instead of an empty page.
          sql`(case when numnode(${tsQuery(f.q)}) = 0
                then ${products.name} ilike ${'%' + likeEscape(f.q) + '%'}
                else ${products.searchVector} @@ ${tsQuery(f.q)} end)`;
    // In a translated store view the search also matches the translated name and description
    // (substring: Postgres has no German or French stemming configured here), next to English.
    const lang = currentLang();
    conds.push(
      lang === 'en'
        ? english
        : or(
            english,
            sql`exists (select 1 from product_translations pt where pt.product_id = ${products.id}
              and pt.locale = ${lang}
              and (pt.name ilike ${'%' + likeEscape(f.q) + '%'}
                or pt.description ilike ${'%' + likeEscape(f.q) + '%'}))`,
          )!,
    );
  }
  return conds;
}

// Scope plus the narrowing filters, composed with and(). The count query uses the same function
// as the list so `meta.total` can never disagree with the rows.
function filterConditions(f: ProductFilters, v: ReturnType<typeof variantSummary>): SQL[] {
  const conds = scopeConditions(f);

  if (f.minPriceCents !== undefined || f.maxPriceCents !== undefined) {
    // "Has a variant in the price range", not "min/max of the product overlap the range": a
    // shopper filtering 10-20 EUR expects something they can actually buy in that band.
    const inRange = [
      eq(productVariants.productId, products.id),
      eq(productVariants.status, 'active'),
      eq(productVariants.isTrial, false),
      ...(f.minPriceCents !== undefined ? [gte(priceIn(), f.minPriceCents)] : []),
      ...(f.maxPriceCents !== undefined ? [lte(priceIn(), f.maxPriceCents)] : []),
    ];
    conds.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(productVariants)
          .where(and(...inRange)),
      ),
    );
  }

  if (f.inStock) conds.push(eq(v.inStock, true));

  if (f.brand) {
    conds.push(
      inArray(
        products.brandId,
        db.select({ id: brands.id }).from(brands).where(inArray(brands.slug, f.brand)),
      ),
    );
  }
  if (f.tag) {
    conds.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(productTags)
          .innerJoin(tags, eq(tags.id, productTags.tagId))
          .where(and(eq(productTags.productId, products.id), inArray(tags.slug, f.tag))),
      ),
    );
  }
  if (f.badgeProductIds) {
    conds.push(f.badgeProductIds.length > 0 ? inArray(products.id, f.badgeProductIds) : sql`false`);
  }

  for (const [key, values] of Object.entries(f.attr)) {
    // `@>` (containment) is what the GIN index on `attributes` accelerates, unlike
    // `attributes->>key = ...`. Values are bound as jsonb parameters, never string-built.
    conds.push(
      or(
        ...values.map(
          (value) => sql`${products.attributes} @> ${JSON.stringify({ [key]: value })}::jsonb`,
        ),
      ) ?? sql`false`,
    );
  }
  return conds;
}

export async function listProducts(
  params: ProductListParams,
): Promise<{ rows: ProductCardRow[]; total: number }> {
  const v = variantSummary();
  const where = and(...filterConditions(params.filters, v));

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      attributes: products.attributes,
      categorySlug: categories.slug,
      minCents: v.minCents,
      maxCents: v.maxCents,
      currency: v.currency,
      inStock: v.inStock,
      unitCents: v.unitCents,
      unitPer: v.unitPer,
      brandSlug: brands.slug,
      brandName: brands.name,
      ratingCount: products.ratingCount,
      ratingSum: products.ratingSum,
    })
    .from(products)
    .innerJoin(v, eq(v.productId, products.id))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(brands, eq(brands.id, products.brandId))
    .where(where)
    .orderBy(...orderBy(params.sort, v, params.filters.q, params.filters.collection))
    .limit(params.limit)
    .offset(params.offset);

  const [totalRow] = await db
    .select({ total: count() })
    .from(products)
    .innerJoin(v, eq(v.productId, products.id))
    .where(where);

  return { rows, total: totalRow?.total ?? 0 };
}

// One image per product for the cards: product-level images before variant-specific ones, then
// the editor's sort order. DISTINCT ON keeps the first row of each product's ordering.
export async function listPrimaryImages(productIds: string[]): Promise<ProductImageRow[]> {
  if (productIds.length === 0) return [];
  return db
    .selectDistinctOn([productImages.productId], {
      id: productImages.id,
      productId: productImages.productId,
      variantId: productImages.variantId,
      url: productImages.url,
      alt: productImages.alt,
      width: productImages.width,
      height: productImages.height,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(
      productImages.productId,
      sql`${productImages.variantId} is not null`,
      productImages.sortOrder,
      productImages.id,
    );
}

// ---------- facets ----------

export interface FacetRows {
  attributes: { key: string; value: string; count: number }[];
  brand: { slug: string; name: string; count: number }[];
  tag: { slug: string; name: string; count: number }[];
  /** Every product id in the scope, so the service can count derived badges over it. */
  scopeProductIds: string[];
  price: { min: number; max: number } | null;
}

// Counts per attribute value over the *scope* (category + search), deliberately ignoring the
// attribute, price and stock filters: if counts honoured the filter the shopper just clicked,
// every other value would show 0 and the filter UI could only ever narrow, never switch.
export async function getFacets(
  filters: ProductFilters,
  keys: readonly string[],
): Promise<FacetRows> {
  const v = variantSummary();
  const where = and(...scopeConditions(filters));

  const [attributes, [price], brandRows, tagRows, scopeRows] = await Promise.all([
    db
      .select({ key: sql<string>`kv.key`, value: sql<string>`kv.value`, count: count() })
      .from(products)
      .innerJoin(v, eq(v.productId, products.id))
      // jsonb_each_text turns each attribute into a (key, value) row, so one GROUP BY counts
      // every facet at once instead of one query per key.
      .innerJoin(sql`jsonb_each_text(${products.attributes}) as kv(key, value)`, sql`true`)
      .where(and(where, inArray(sql`kv.key`, [...keys])))
      .groupBy(sql`kv.key`, sql`kv.value`)
      .orderBy(sql`kv.key`, desc(count()), sql`kv.value`),
    db
      .select({
        min: sql<number | null>`min(${v.minCents})`,
        max: sql<number | null>`max(${v.maxCents})`,
      })
      .from(products)
      .innerJoin(v, eq(v.productId, products.id))
      .where(where),
    db
      .select({ slug: brands.slug, name: brands.name, count: count() })
      .from(products)
      .innerJoin(v, eq(v.productId, products.id))
      .innerJoin(brands, eq(brands.id, products.brandId))
      .where(where)
      .groupBy(brands.slug, brands.name)
      .orderBy(desc(count()), asc(brands.name)),
    db
      .select({ slug: tags.slug, name: tags.name, count: count() })
      .from(products)
      .innerJoin(v, eq(v.productId, products.id))
      .innerJoin(productTags, eq(productTags.productId, products.id))
      .innerJoin(tags, eq(tags.id, productTags.tagId))
      .where(where)
      .groupBy(tags.slug, tags.name)
      .orderBy(desc(count()), asc(tags.name)),
    db
      .select({ id: products.id })
      .from(products)
      .innerJoin(v, eq(v.productId, products.id))
      .where(where),
  ]);

  return {
    attributes,
    brand: brandRows,
    tag: tagRows,
    scopeProductIds: scopeRows.map((r) => r.id),
    price:
      price && price.min !== null && price.max !== null ? { min: price.min, max: price.max } : null,
  };
}

// ---------- product detail ----------

export interface VariantRow {
  id: string;
  sku: string;
  name: string;
  options: Record<string, string>;
  priceCents: number;
  compareAtPriceCents: number | null;
  currency: string;
  isDefault: boolean;
  // Raw stock numbers stay inside the API; the service turns them into booleans.
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  netAmount: number | null;
  netUnit: 'g' | 'ml' | null;
  isTrial: boolean;
  swatchHex: string | null;
}

export interface ProductDetailRows {
  product: {
    id: string;
    slug: string;
    name: string;
    description: string;
    attributes: ProductAttributes;
    isEco: boolean;
    isBestsellerOverride: boolean;
    badgeNewUntil: Date | null;
    createdAt: Date;
    ratingCount: number;
    ratingSum: number;
    requiresVetApproval: boolean;
  };
  brand: { slug: string; name: string } | null;
  tags: { slug: string; name: string }[];
  category: { slug: string; name: string };
  parent: { slug: string; name: string } | null;
  variants: VariantRow[];
  images: ProductImageRow[];
  kind: 'simple' | 'bundle';
  deliveryNote: string | null;
  specs: { label: string; value: string }[];
  faqs: { id: string; question: string; answer: string }[];
  feeding: {
    petWeightGMin: number;
    petWeightGMax: number;
    dailyG: number;
    lifeStage: 'puppy' | 'adult' | 'senior' | 'any';
  }[];
  sizeGuide: SizeGuideRow | null;
  /** variant id -> constituents, so the Specs tab can follow the selected variant. */
  constituents: Map<string, { key: ConstituentKey; valueBp: number }[]>;
}

export interface SizeGuideRow {
  slug: string;
  title: string;
  table: SizeGuideTable;
  howtoMd: string;
  tip: string | null;
}

// Only `active` products exist for the public: a draft or archived slug is indistinguishable from
// a missing one (admin preview arrives with phase 6).
export async function getProductBySlug(slug: string): Promise<ProductDetailRows | undefined> {
  const [head] = await db
    .select({
      product: {
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        attributes: products.attributes,
        isEco: products.isEco,
        isBestsellerOverride: products.isBestsellerOverride,
        badgeNewUntil: products.badgeNewUntil,
        createdAt: products.createdAt,
        ratingCount: products.ratingCount,
        ratingSum: products.ratingSum,
        // Flagged itself, or a kit with a flagged component (the cart decides the same way).
        requiresVetApproval: sql<boolean>`(${products.requiresVetApproval} or exists (select 1 from product_variants bv join bundle_items bi on bi.bundle_variant_id = bv.id join product_variants cv on cv.id = bi.component_variant_id join products cp on cp.id = cv.product_id where bv.product_id = ${products.id} and cp.requires_vet_approval))`,
      },
      kind: products.kind,
      deliveryNote: products.deliveryNote,
      sizeGuideId: products.sizeGuideId,
      brand: { slug: brands.slug, name: brands.name },
      category: { id: categories.id, slug: categories.slug, name: categories.name },
      parentId: categories.parentId,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(brands, eq(brands.id, products.brandId))
    .where(and(eq(products.slug, slug), eq(products.status, 'active')));
  if (!head) return undefined;

  const [parentRows, variants, images, tagRows, content] = await Promise.all([
    head.parentId
      ? db
          .select({ slug: categories.slug, name: categories.name })
          .from(categories)
          .where(eq(categories.id, head.parentId))
      : Promise.resolve([]),
    db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        name: productVariants.name,
        options: productVariants.options,
        priceCents: priceIn(),
        // A strike-through price is a EUR fact (sale history is EUR-only): none in other stores.
        compareAtPriceCents: compareAtIn(),
        currency: sql<string>`${currentStore().currency}::char(3)`,
        isDefault: productVariants.isDefault,
        netAmount: productVariants.netAmount,
        netUnit: productVariants.netUnit,
        isTrial: productVariants.isTrial,
        swatchHex: productVariants.swatchHex,
        // A variant row without an inventory row is treated as zero stock.
        quantity: sql<number>`coalesce(${stockQuantity(productVariants.id)}, 0)`,
        reserved: sql<number>`coalesce(${stockReserved(productVariants.id)}, 0)`,
        lowStockThreshold: sql<number>`coalesce(${inventory.lowStockThreshold}, 0)`,
      })
      .from(productVariants)
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(
        and(
          eq(productVariants.productId, head.product.id),
          eq(productVariants.status, 'active'),
          hasPriceIn(),
        ),
      )
      // Cheapest first so the picker's order is stable; default variant is flagged, not sorted.
      .orderBy(asc(priceIn()), asc(productVariants.name), asc(productVariants.id)),
    db
      .select({
        id: productImages.id,
        productId: productImages.productId,
        variantId: productImages.variantId,
        url: productImages.url,
        alt: productImages.alt,
        width: productImages.width,
        height: productImages.height,
      })
      .from(productImages)
      .where(eq(productImages.productId, head.product.id))
      .orderBy(asc(productImages.sortOrder), asc(productImages.id)),
    db
      .select({ slug: tags.slug, name: tags.name })
      .from(productTags)
      .innerJoin(tags, eq(tags.id, productTags.tagId))
      .where(eq(productTags.productId, head.product.id))
      .orderBy(asc(tags.name)),
    getContent(head.product.id, head.sizeGuideId),
  ]);

  return {
    product: head.product,
    // The left join gives a row of nulls, not no row, for a product without a brand.
    brand: head.brand && head.brand.slug ? head.brand : null,
    tags: tagRows,
    category: { slug: head.category.slug, name: head.category.name },
    parent: parentRows[0] ?? null,
    variants,
    images,
    kind: head.kind,
    deliveryNote: head.deliveryNote,
    ...content,
  };
}

// The structured content of a product page (phase 16): specs, FAQs, feeding table, size guide and
// the per-variant constituents. Five small indexed reads, run together.
async function getContent(productId: string, sizeGuideId: string | null) {
  const [specs, faqs, feeding, guide, constituentRows] = await Promise.all([
    db
      .select({ label: productSpecs.label, value: productSpecs.value })
      .from(productSpecs)
      .where(eq(productSpecs.productId, productId))
      .orderBy(asc(productSpecs.sortOrder), asc(productSpecs.label)),
    db
      .select({ id: productFaqs.id, question: productFaqs.question, answer: productFaqs.answer })
      .from(productFaqs)
      .where(eq(productFaqs.productId, productId))
      .orderBy(asc(productFaqs.sortOrder), asc(productFaqs.id)),
    db
      .select({
        petWeightGMin: feedingRows.petWeightGMin,
        petWeightGMax: feedingRows.petWeightGMax,
        dailyG: feedingRows.dailyG,
        lifeStage: feedingRows.lifeStage,
      })
      .from(feedingRows)
      .where(eq(feedingRows.productId, productId))
      .orderBy(asc(feedingRows.lifeStage), asc(feedingRows.petWeightGMin)),
    sizeGuideId
      ? db
          .select({
            slug: sizeGuides.slug,
            title: sizeGuides.title,
            table: sizeGuides.rows,
            howtoMd: sizeGuides.howtoMd,
            tip: sizeGuides.tip,
          })
          .from(sizeGuides)
          .where(eq(sizeGuides.id, sizeGuideId))
      : Promise.resolve([]),
    db
      .select({
        variantId: variantConstituents.variantId,
        key: variantConstituents.key,
        valueBp: variantConstituents.valueBp,
      })
      .from(variantConstituents)
      .innerJoin(productVariants, eq(productVariants.id, variantConstituents.variantId))
      .where(eq(productVariants.productId, productId)),
  ]);
  const constituents = new Map<string, { key: ConstituentKey; valueBp: number }[]>();
  for (const r of constituentRows) {
    const list = constituents.get(r.variantId) ?? [];
    list.push({ key: r.key as ConstituentKey, valueBp: r.valueBp });
    constituents.set(r.variantId, list);
  }
  // Label order (protein, fat, fibre, ash, moisture, kcal), never the table's physical order.
  for (const list of constituents.values()) {
    list.sort((a, b) => CONSTITUENT_KEYS.indexOf(a.key) - CONSTITUENT_KEYS.indexOf(b.key));
  }
  return { specs, faqs, feeding, sizeGuide: guide[0] ?? null, constituents };
}

// ---------- swatches ----------

export interface SwatchRow {
  productId: string;
  color: string;
  hex: string;
  imageUrl: string | null;
  imageAlt: string | null;
  imageId: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  imageVariantId: string | null;
}

// One dot per colour per product (a colour exists once per size, so DISTINCT ON), with that
// colour's own picture when one is attached to any of its variants.
export async function listSwatches(productIds: string[]): Promise<SwatchRow[]> {
  if (productIds.length === 0) return [];
  return db
    .selectDistinctOn([productVariants.productId, sql`${productVariants.options}->>'color'`], {
      productId: productVariants.productId,
      color: sql<string>`${productVariants.options}->>'color'`,
      hex: sql<string>`${productVariants.swatchHex}`,
      imageId: sql<string | null>`img.id`,
      imageUrl: sql<string | null>`img.url`,
      imageAlt: sql<string | null>`img.alt`,
      imageWidth: sql<number | null>`img.width`,
      imageHeight: sql<number | null>`img.height`,
      imageVariantId: sql<string | null>`img.variant_id`,
    })
    .from(productVariants)
    .leftJoinLateral(
      sql`(select i.id, i.url, i.alt, i.width, i.height, i.variant_id from ${productImages} i where i.variant_id = ${productVariants.id} order by i.sort_order, i.id limit 1) as img`,
      sql`true`,
    )
    .where(
      and(
        inArray(productVariants.productId, productIds),
        eq(productVariants.status, 'active'),
        sql`${productVariants.swatchHex} is not null`,
      ),
    )
    .orderBy(
      productVariants.productId,
      sql`${productVariants.options}->>'color'`,
      // Prefer the colour's variant that has a picture, then the cheapest, for stable output.
      sql`img.id is null`,
      priceIn(),
      productVariants.id,
    );
}

// ---------- badge facts ----------

export interface BadgeFactRow {
  id: string;
  createdAt: Date;
  badgeNewUntil: Date | null;
  isEco: boolean;
  isBestsellerOverride: boolean;
  variants: {
    priceCents: number;
    compareAtPriceCents: number | null;
    isDefault: boolean;
    availableUnits: number;
    lowStockThreshold: number;
  }[];
}

// Everything deriveBadges() needs for every active product, in two queries (products, then their
// active variants with stock), stitched together here.
export async function listBadgeFacts(): Promise<BadgeFactRow[]> {
  const [productRows, variantRows] = await Promise.all([
    db
      .select({
        id: products.id,
        createdAt: products.createdAt,
        badgeNewUntil: products.badgeNewUntil,
        isEco: products.isEco,
        isBestsellerOverride: products.isBestsellerOverride,
      })
      .from(products)
      .where(eq(products.status, 'active')),
    db
      .select({
        productId: productVariants.productId,
        priceCents: priceIn(),
        compareAtPriceCents: compareAtIn(),
        isDefault: productVariants.isDefault,
        availableUnits: sql<number>`coalesce(${stockQuantity(productVariants.id)} - ${stockReserved(productVariants.id)}, 0)`,
        lowStockThreshold: sql<number>`coalesce(${inventory.lowStockThreshold}, 0)`,
      })
      .from(productVariants)
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(and(eq(productVariants.status, 'active'), hasPriceIn())),
  ]);
  const byProduct = new Map<string, BadgeFactRow['variants']>();
  for (const { productId, ...variant } of variantRows) {
    const list = byProduct.get(productId) ?? [];
    list.push(variant);
    byProduct.set(productId, list);
  }
  return productRows.map((p) => ({ ...p, variants: byProduct.get(p.id) ?? [] }));
}

/**
 * Units sold per product since `since`, from orders in the given (paid-or-later) statuses. The
 * status list comes from the shared isPaidOrLater rule, so the SQL cannot disagree with it.
 */
export async function unitsSoldSince(
  since: Date,
  statuses: readonly (typeof orders.$inferSelect.status)[],
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      productId: productVariants.productId,
      units: sql<number>`sum(${orderItems.quantity})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
    .where(
      and(
        inArray(orders.status, [...statuses]),
        sql`coalesce(${orders.placedAt}, ${orders.createdAt}) >= ${since.toISOString()}::timestamptz`,
      ),
    )
    .groupBy(productVariants.productId);
  return new Map(rows.map((r) => [r.productId, r.units]));
}
