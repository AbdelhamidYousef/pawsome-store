import { fileURLToPath } from 'node:url';

import { and, eq, inArray, ne, sql } from 'drizzle-orm';

import { closeDb, db } from '../client.ts';
import {
  brands as brandsTable,
  bulkTiers,
  categories as categoriesTable,
  collectionProducts,
  collections as collectionsTable,
  discountCodes,
  feedingRows,
  giftRules,
  inventory,
  productFaqs,
  productImages,
  productSpecs,
  productTags,
  productVariants,
  products as productsTable,
  shippingMethods as shippingTable,
  sizeGuides as sizeGuidesTable,
  tags as tagsTable,
  users,
  variantConstituents,
} from '../schema/index.ts';

import { HOUSE_BRAND, brands } from './brands.ts';
import { bundleSeeds, seedBundles } from './bundles.ts';
import { categories } from './categories.ts';
import { seedCharity } from './charity.ts';
import { collections, windowDates } from './collections.ts';
import { seedContentTranslations } from './content-translations.ts';
import { loadContent, seedContent } from './content.ts';
import { FORCED_STOCK, expandVariants, stockLevels } from './expand.ts';
import { seedHomeContent } from './home.ts';
import { imageRowsFor } from './images.ts';
import { materialFacet } from './materials.ts';
import { seedMenuPromos } from './menu-promos.ts';
import { assertFeedingTablesTile, pdpFor, sizeGuides } from './pdp.ts';
import { seedGbpPrices } from './prices.ts';
import { products } from './products.ts';
import {
  bulkTierSeeds,
  discountCodeSeeds,
  giftRuleSeed,
  memberPriceCents,
  pickMemberVariants,
} from './promotions.ts';
import { boughtTogetherPlan, seedBoughtTogether } from './relations.ts';
import { seedReviews } from './reviews.ts';
import { seedRewards } from './rewards.ts';
import { RETURNS_DEMO_EMAIL, seedSales } from './sales.ts';
import { validateSeed } from './schema.ts';
import { shippingMethods } from './shipping.ts';
import { tags } from './tags.ts';
import { seedTranslations } from './translations.ts';
import { DEMO_PASSWORD, demoUsers, hashDemoPassword, hashUnusablePassword } from './users.ts';

// `excluded` is the row that failed to insert; `ON CONFLICT DO UPDATE` copies its values over the
// existing row. This is what makes the seed safe to run again: definitions are refreshed in place
// instead of duplicated.
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runSeed(now = new Date()) {
  // A typo in any seed file fails here, naming the product, before the database is touched.
  validateSeed(products);
  assertFeedingTablesTile(products);
  const passwordHash = await hashDemoPassword();
  const lockedHash = await hashUnusablePassword();
  // Read and validated before the transaction opens: a bad Markdown file stops the seed up front.
  const content = loadContent();

  await db.transaction(async (tx) => {
    // ---- categories: parents first, so children can reference their ids ----
    const parentRows = await tx
      .insert(categoriesTable)
      .values(
        categories.map((c, i) => ({
          slug: c.slug,
          name: c.name,
          description: c.description,
          sortOrder: i,
          attributes: c.attributes ?? {},
        })),
      )
      .onConflictDoUpdate({
        target: categoriesTable.slug,
        set: {
          name: excluded('name'),
          description: excluded('description'),
          sortOrder: excluded('sort_order'),
          attributes: excluded('attributes'),
        },
      })
      .returning({ id: categoriesTable.id, slug: categoriesTable.slug });
    const parentId = new Map(parentRows.map((r) => [r.slug, r.id]));

    const childValues = categories.flatMap((c) =>
      c.children.map((child, i) => ({
        slug: child.slug,
        name: child.name,
        description: child.description,
        parentId: parentId.get(c.slug) ?? null,
        sortOrder: i,
      })),
    );
    const childRows = await tx
      .insert(categoriesTable)
      .values(childValues)
      .onConflictDoUpdate({
        target: categoriesTable.slug,
        set: {
          name: excluded('name'),
          description: excluded('description'),
          parentId: excluded('parent_id'),
          sortOrder: excluded('sort_order'),
        },
      })
      .returning({ id: categoriesTable.id, slug: categoriesTable.slug });
    const categoryId = new Map(childRows.map((r) => [r.slug, r.id]));

    // ---- brands and tags (products reference them) ----
    const brandRows = await tx
      .insert(brandsTable)
      .values(brands)
      .onConflictDoUpdate({
        target: brandsTable.slug,
        set: {
          name: excluded('name'),
          tagline: excluded('tagline'),
          story: excluded('story'),
          accentColor: excluded('accent_color'),
          logoUrl: excluded('logo_url'),
        },
      })
      .returning({ id: brandsTable.id, slug: brandsTable.slug });
    const brandId = new Map(brandRows.map((r) => [r.slug, r.id]));

    const tagRows = await tx
      .insert(tagsTable)
      .values(tags)
      .onConflictDoUpdate({ target: tagsTable.slug, set: { name: excluded('name') } })
      .returning({ id: tagsTable.id, slug: tagsTable.slug });
    const tagId = new Map(tagRows.map((r) => [r.slug, r.id]));

    // ---- products ----
    const productRows = await tx
      .insert(productsTable)
      .values(
        products.map((p, i) => {
          const id = categoryId.get(p.categorySlug);
          if (!id) throw new Error(`unknown category ${p.categorySlug} on ${p.slug}`);
          return {
            brandId: brandId.get(p.brand ?? HOUSE_BRAND) ?? null,
            isEco: p.eco ?? false,
            requiresVetApproval: p.vetApproval ?? false,
            isBestsellerOverride: p.bestseller ?? false,
            // Spread over the past year so the derived "New" badge shows on a handful of
            // products, not all of them. Not in the conflict set: a re-seed keeps the dates.
            createdAt: new Date(
              now.getTime() - (p.isNew ? 3 + (i % 20) : 45 + ((i * 7) % 300)) * DAY_MS,
            ),
            slug: p.slug,
            name: p.name,
            description: p.description,
            categoryId: id,
            status: 'active' as const,
            attributes: {
              pet: p.pet,
              material: materialFacet(p),
              ageStage: p.ageStage,
              optionKeys: p.axes.map((a) => a.key),
            },
          };
        }),
      )
      .onConflictDoUpdate({
        target: productsTable.slug,
        set: {
          name: excluded('name'),
          description: excluded('description'),
          categoryId: excluded('category_id'),
          status: excluded('status'),
          attributes: excluded('attributes'),
          brandId: excluded('brand_id'),
          isEco: excluded('is_eco'),
          requiresVetApproval: excluded('requires_vet_approval'),
          isBestsellerOverride: excluded('is_bestseller_override'),
        },
      })
      .returning({ id: productsTable.id, slug: productsTable.slug });
    const productId = new Map(productRows.map((r) => [r.slug, r.id]));

    // ---- variants ----
    const variantValues = products.flatMap((p) => {
      const id = productId.get(p.slug);
      if (!id) throw new Error(`product ${p.slug} was not inserted`);
      return expandVariants(p).map((v) => ({ ...v, productId: id, status: 'active' as const }));
    });
    const variantRows = await tx
      .insert(productVariants)
      .values(variantValues)
      .onConflictDoUpdate({
        target: productVariants.sku,
        set: {
          productId: excluded('product_id'),
          name: excluded('name'),
          options: excluded('options'),
          priceCents: excluded('price_cents'),
          compareAtPriceCents: excluded('compare_at_price_cents'),
          weightGrams: excluded('weight_grams'),
          netAmount: excluded('net_amount'),
          netUnit: excluded('net_unit'),
          isTrial: excluded('is_trial'),
          swatchHex: excluded('swatch_hex'),
          isDefault: excluded('is_default'),
          status: excluded('status'),
        },
      })
      .returning({ id: productVariants.id, sku: productVariants.sku });
    const variantId = new Map(variantRows.map((r) => [r.sku, r.id]));

    // ---- price history (Omnibus): every variant without history gets one base row, backdated 60
    // days so a sale seeded or created today has a reference window to look at. Idempotent. ----
    await tx.execute(sql`
      INSERT INTO price_history (variant_id, price_cents, kind, valid_from)
      SELECT v.id, v.price_cents, 'base', now() - interval '60 days'
      FROM product_variants v
      WHERE NOT EXISTS (SELECT 1 FROM price_history h WHERE h.variant_id = v.id)
    `);

    // ---- member prices (step 18.7): a few variants ~10% below base, with a `member` history row
    // (Omnibus ignores those). Re-running sets the same values and adds no second row. ----
    for (const v of pickMemberVariants(variantValues)) {
      const id = variantId.get(v.sku);
      if (!id) throw new Error(`variant ${v.sku} was not inserted`);
      const member = memberPriceCents(v.priceCents);
      await tx
        .update(productVariants)
        .set({ memberPriceCents: member })
        .where(eq(productVariants.id, id));
      await tx.execute(sql`
        INSERT INTO price_history (variant_id, price_cents, kind, valid_from)
        SELECT ${id}, ${member}, 'member', now() - interval '60 days'
        WHERE NOT EXISTS (
          SELECT 1 FROM price_history h
          WHERE h.variant_id = ${id} AND h.kind = 'member' AND h.price_cents = ${member})
      `);
    }

    // ---- inventory: insert only. A re-seed must not reset stock that has since been sold. ----
    const stock = stockLevels(variantValues.length);
    await tx
      .insert(inventory)
      .values(
        variantValues.map((v, i) => {
          const id = variantId.get(v.sku);
          if (!id) throw new Error(`variant ${v.sku} was not inserted`);
          // A sample is the way in to a product, so it is never the sold-out one (the random
          // stock levels would otherwise leave some samples at 0 or 3).
          return {
            variantId: id,
            quantity: FORCED_STOCK[v.sku] ?? (v.isTrial ? 50 : (stock[i] ?? 0)),
          };
        }),
      )
      .onConflictDoNothing();

    // ---- product tags and collections: join rows, replaced wholesale for the seeded products ----
    await tx.delete(productTags).where(inArray(productTags.productId, [...productId.values()]));
    const tagValues = products.flatMap((p) =>
      (p.tags ?? []).map((slug) => ({
        productId: productId.get(p.slug) ?? '',
        tagId: tagId.get(slug) ?? '',
      })),
    );
    if (tagValues.length > 0) await tx.insert(productTags).values(tagValues);

    // Window dates are recomputed on every seed so the demo always has the current season live.
    const collectionRows = await tx
      .insert(collectionsTable)
      .values(
        collections.map((c, i) => ({
          slug: c.slug,
          name: c.name,
          description: c.description,
          accentColor: c.accentColor,
          sortOrder: i,
          ...(c.window ? windowDates(c.window, now) : { startsAt: null, endsAt: null }),
        })),
      )
      .onConflictDoUpdate({
        target: collectionsTable.slug,
        set: {
          name: excluded('name'),
          description: excluded('description'),
          accentColor: excluded('accent_color'),
          sortOrder: excluded('sort_order'),
          startsAt: excluded('starts_at'),
          endsAt: excluded('ends_at'),
        },
      })
      .returning({ id: collectionsTable.id, slug: collectionsTable.slug });
    const collectionId = new Map(collectionRows.map((r) => [r.slug, r.id]));
    await tx
      .delete(collectionProducts)
      .where(inArray(collectionProducts.collectionId, [...collectionId.values()]));
    const members = collections.flatMap((c) =>
      products
        .filter((p) => {
          if (c.membership === 'eco') return p.eco === true;
          if (c.membership === 'under-10')
            return expandVariants(p).some((v) => !v.isTrial && v.priceCents < 1000);
          return p.collections?.includes(c.slug) ?? false;
        })
        .map((p, position) => ({
          collectionId: collectionId.get(c.slug) ?? '',
          productId: productId.get(p.slug) ?? '',
          position,
        })),
    );
    if (members.length > 0) await tx.insert(collectionProducts).values(members);

    // ---- images: rows have no natural unique key, so replace the seeded products' rows ----
    await tx.delete(productImages).where(inArray(productImages.productId, [...productId.values()]));
    await tx.insert(productImages).values(
      products.flatMap((p) => {
        const id = productId.get(p.slug);
        if (!id) throw new Error(`product ${p.slug} was not inserted`);
        return imageRowsFor(p).map((img) => ({
          productId: id,
          url: img.url,
          alt: img.alt,
          width: img.width,
          height: img.height,
          sortOrder: img.sortOrder,
        }));
      }),
    );

    // ---- product page content (phase 16): specs, FAQs, feeding tables, constituents, size
    // guides. Replaced wholesale for the seeded products, so a re-seed gives the same rows. ----
    const guideRows = await tx
      .insert(sizeGuidesTable)
      .values(
        sizeGuides.map((g) => ({
          slug: g.slug,
          title: g.title,
          rows: g.table,
          howtoMd: g.howtoMd,
          tip: g.tip,
        })),
      )
      .onConflictDoUpdate({
        target: sizeGuidesTable.slug,
        set: {
          title: excluded('title'),
          rows: excluded('rows'),
          howtoMd: excluded('howto_md'),
          tip: excluded('tip'),
        },
      })
      .returning({ id: sizeGuidesTable.id, slug: sizeGuidesTable.slug });
    const guideId = new Map(guideRows.map((r) => [r.slug, r.id]));
    const seededIds = [...productId.values()];
    await tx.delete(productSpecs).where(inArray(productSpecs.productId, seededIds));
    await tx.delete(productFaqs).where(inArray(productFaqs.productId, seededIds));
    await tx.delete(feedingRows).where(inArray(feedingRows.productId, seededIds));
    await tx.delete(variantConstituents).where(
      inArray(
        variantConstituents.variantId,
        variantRows.map((v) => v.id),
      ),
    );
    for (const p of products) {
      const id = productId.get(p.slug);
      if (!id) throw new Error(`product ${p.slug} was not inserted`);
      const pdp = pdpFor(p);
      await tx
        .insert(productSpecs)
        .values(pdp.specs.map((s, sortOrder) => ({ productId: id, ...s, sortOrder })));
      await tx
        .insert(productFaqs)
        .values(pdp.faqs.map((f, sortOrder) => ({ productId: id, ...f, sortOrder })));
      if (pdp.feeding.length > 0) {
        await tx.insert(feedingRows).values(pdp.feeding.map((r) => ({ productId: id, ...r })));
      }
      if (pdp.constituents) {
        const values = Object.entries(pdp.constituents);
        const ids = expandVariants(p).map((v) => variantId.get(v.sku) ?? '');
        await tx
          .insert(variantConstituents)
          .values(
            ids.flatMap((variant) =>
              values.map(([key, valueBp]) => ({ variantId: variant, key, valueBp })),
            ),
          );
      }
      await tx
        .update(productsTable)
        .set({
          sizeGuideId: pdp.sizeGuideSlug ? (guideId.get(pdp.sizeGuideSlug) ?? null) : null,
          deliveryNote: pdp.deliveryNote,
        })
        .where(eq(productsTable.id, id));
    }

    // ---- kits (phase 16): built from the seeded products above ----
    await seedBundles(tx);

    // ---- "frequently bought together" picks (same pet, complementary category, no kits) ----
    const kitRows = await tx
      .select({ id: productsTable.id, slug: productsTable.slug })
      .from(productsTable)
      .where(
        inArray(
          productsTable.slug,
          bundleSeeds.map((b) => b.slug),
        ),
      );
    await seedBoughtTogether(
      tx,
      boughtTogetherPlan(products, bundleSeeds),
      new Map([...productId, ...kitRows.map((k) => [k.slug, k.id] as const)]),
    );

    // ---- guides, help articles, testimonials (after products: guides link to them) ----
    await seedContent(tx, content, productId);
    await seedTranslations(tx);
    await seedHomeContent(tx);
    await seedMenuPromos(tx);
    await seedRewards(tx);
    await seedCharity(tx);

    // ---- shipping ----
    await tx
      .insert(shippingTable)
      .values(shippingMethods)
      .onConflictDoUpdate({
        target: shippingTable.code,
        set: {
          name: excluded('name'),
          baseCents: excluded('base_cents'),
          perKgCents: excluded('per_kg_cents'),
          freeOverCents: excluded('free_over_cents'),
          byCurrency: excluded('by_currency'),
          etaDaysMin: excluded('eta_days_min'),
          etaDaysMax: excluded('eta_days_max'),
          isActive: excluded('is_active'),
        },
      });

    // ---- promotions (phase 18): codes and tiers upsert on their natural key ----
    await tx
      .insert(discountCodes)
      .values(discountCodeSeeds)
      .onConflictDoUpdate({
        target: discountCodes.code,
        set: {
          kind: excluded('kind'),
          value: excluded('value'),
          minSpendCents: excluded('min_spend_cents'),
          valueByCurrency: excluded('value_by_currency'),
          minSpendByCurrency: excluded('min_spend_by_currency'),
          excludeSaleItems: excluded('exclude_sale_items'),
          firstOrderOnly: excluded('first_order_only'),
          perCustomerMax: excluded('per_customer_max'),
          active: sql`true`,
          archivedAt: sql`null`,
        },
      });
    await tx
      .insert(bulkTiers)
      .values(bulkTierSeeds)
      .onConflictDoUpdate({
        target: bulkTiers.minCents,
        set: {
          percent: excluded('percent'),
          minByCurrency: excluded('min_by_currency'),
          active: sql`true`,
        },
      });
    // Gift rules have no natural key and at most one may be active: switch the others off first.
    const giftVariantId = variantId.get(giftRuleSeed.variantSku);
    if (!giftVariantId) throw new Error(`gift variant ${giftRuleSeed.variantSku} is not seeded`);
    await tx
      .update(giftRules)
      .set({ active: false })
      .where(and(eq(giftRules.active, true), ne(giftRules.variantId, giftVariantId)));
    const [gift] = await tx
      .select({ id: giftRules.id })
      .from(giftRules)
      .where(eq(giftRules.variantId, giftVariantId))
      .limit(1);
    if (gift) {
      await tx
        .update(giftRules)
        .set({
          thresholdCents: giftRuleSeed.thresholdCents,
          thresholdByCurrency: giftRuleSeed.thresholdByCurrency,
          active: true,
        })
        .where(eq(giftRules.id, gift.id));
    } else {
      await tx.insert(giftRules).values({
        thresholdCents: giftRuleSeed.thresholdCents,
        thresholdByCurrency: giftRuleSeed.thresholdByCurrency,
        variantId: giftVariantId,
      });
    }

    // ---- users: the password hash is reset too, so the printed credentials are always true ----
    await tx
      .insert(users)
      .values(demoUsers.map((u) => ({ ...u, passwordHash })))
      .onConflictDoUpdate({
        target: users.email,
        set: {
          passwordHash: excluded('password_hash'),
          firstName: excluded('first_name'),
          lastName: excluded('last_name'),
          role: excluded('role'),
        },
      });

    // ---- reviews and the customer gallery (phase 17): after the products and the users ----
    await seedReviews(tx, { products, productId, lockedHash, now });

    // ---- ~90 days of sales history and sample returns (phase 22): after products and users ----
    await seedSales(tx, { passwordHash, now });

    // ---- GBP prices for the UK store view (phase 21): last, so kits and gifts have rows too ----
    await seedGbpPrices(tx);

    // ---- content translations (phase 21.7): after every row they hang off exists ----
    await seedContentTranslations(tx);
  });
}

// Only when run as a script (`pnpm db:seed`); the reset script and tests import runSeed instead.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runSeed();
  await closeDb();
  console.log('seed complete');
  console.log(`\nDemo logins (password for all: ${DEMO_PASSWORD})`);
  for (const u of demoUsers) console.log(`  ${u.role.padEnd(8)} ${u.email}`);
  console.log(`  customer ${RETURNS_DEMO_EMAIL} (has sample returns on three delivered orders)`);
}
