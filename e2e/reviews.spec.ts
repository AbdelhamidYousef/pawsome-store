import { expect, test, type Browser, type Page } from '@playwright/test';

import { ADMIN, api, register, uniqueEmail } from './helpers';

// Reviews and the customer gallery, end to end: a buyer writes a review with a photo, an admin
// approves it, it appears with the "Verified buyer" tag, another shopper votes it helpful and
// sorts by photos, and a gallery photo opens a modal where a product goes into the cart.
//
// Money moves through the same simulated payment as admin.spec.ts (fake gateway +
// POST /test/webhooks/simulate, both only under NODE_ENV=test). Each test creates its own product,
// so specs can run in parallel. The public catalog and gallery are cached for 60 s, so storefront
// checks use a brand-new browser context.

const HOOK_HEADERS: Record<string, string> = process.env.TEST_HOOK_SECRET
  ? { 'x-test-hook-secret': process.env.TEST_HOOK_SECRET }
  : {};
const ADDRESS = {
  fullName: 'Sam Rivers',
  line1: '1 Bone Street',
  postalCode: '10115',
  city: 'Berlin',
  country: 'DE',
};
// A real 1x1 PNG: the server re-encodes whatever it accepts, so it must be a valid image.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const unique = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function adminSession(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  const login = await api(page, 'POST', '/auth/login', ADMIN);
  expect(login.status, JSON.stringify(login.body)).toBe(200);
  return { context, page };
}

async function createProduct(page: Page, name: string) {
  const tree = await api<{ data: { id: string; children: { id: string }[] }[] }>(
    page,
    'GET',
    '/categories',
  );
  const parent = tree.body.data.find((c) => c.children.length > 0);
  const categoryId = parent?.children[0]?.id ?? tree.body.data[0]!.id;
  const sku = unique('E2E-').toUpperCase();
  const res = await api<{
    data: { id: string; slug: string; variants: { id: string }[] };
  }>(page, 'POST', '/admin/products', {
    name,
    description: 'Created by the reviews e2e spec.',
    categoryId,
    status: 'active',
    attributes: { optionKeys: [] },
    variants: [
      {
        sku: `${sku}-1`,
        name: 'Only',
        options: {},
        priceCents: 1500,
        weightGrams: 100,
        stock: 20,
        isDefault: true,
      },
    ],
    images: [],
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data;
}

async function paidOrderFor(page: Page, email: string, variantId: string) {
  await page.goto('/');
  const add = await api(page, 'POST', '/cart/items', { variantId, quantity: 1 });
  expect(add.status, JSON.stringify(add.body)).toBeLessThan(300);
  const shipping = await api<{ data: { code: string }[] }>(
    page,
    'GET',
    `/checkout/shipping-methods?country=${ADDRESS.country}`,
  );
  const order = await api<{ data: { orderNumber: string } }>(page, 'POST', '/checkout', {
    email,
    shippingAddress: ADDRESS,
    shippingMethodCode: shipping.body.data[0]!.code,
  });
  expect(order.status, JSON.stringify(order.body)).toBe(200);
  const paid = await api(
    page,
    'POST',
    '/test/webhooks/simulate',
    { orderNumber: order.body.data.orderNumber },
    HOOK_HEADERS,
  );
  expect(paid.status, JSON.stringify(paid.body)).toBe(200);
}

test('a buyer reviews with a photo, an admin approves it, others vote and sort', async ({
  browser,
}) => {
  const admin = await adminSession(browser);
  const product = await createProduct(admin.page, `E2E Review Tug ${unique('')}`);

  // The buyer: registers (signed in), buys the product, writes a review with a photo.
  const buyerCtx = await browser.newContext();
  const buyer = await buyerCtx.newPage();
  const email = uniqueEmail();
  await register(buyer, email);
  await expect(buyer).toHaveURL(/\/account$/);
  await paidOrderFor(buyer, email, product.variants[0]!.id);

  await buyer.goto(`/products/${product.slug}`);
  const section = buyer.getByTestId('reviews-section');
  await expect(section.getByText(/No reviews yet/)).toBeVisible();
  await section.getByRole('button', { name: 'Write a review' }).click();
  const form = buyer.getByTestId('review-form');
  await form.getByText('5', { exact: true }).click();
  const title = `Sturdy and loved ${unique('')}`;
  await form.getByLabel('Title').fill(title);
  await form
    .getByLabel('Your review')
    .fill('My dog has chewed on this for a week and it still looks brand new, wonderful.');
  await form.getByLabel('Pet weight (kg)').fill('12.5');
  await form
    .getByLabel(/Photos/)
    .setInputFiles({ name: 'dog.png', mimeType: 'image/png', buffer: PNG });
  await expect(form.getByAltText('Preview of dog.png')).toBeVisible();
  await form.getByRole('button', { name: 'Submit review' }).click();
  await expect(buyer.getByTestId('review-pending')).toContainText('waiting for approval');

  // Pending is invisible to the public.
  const stranger = await (await browser.newContext()).newPage();
  await stranger.goto(`/products/${product.slug}`);
  await expect(stranger.getByText(/No reviews yet/)).toBeVisible();

  // The admin approves it from the queue.
  await admin.page.goto('/admin/reviews');
  const row = admin.page.getByTestId('admin-review-row').filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row.getByText('Verified buyer')).toBeVisible();
  await row.getByRole('button', { name: /^Approve review/ }).click();
  await expect(admin.page.getByTestId('admin-review-row').filter({ hasText: title })).toHaveCount(
    0,
  );

  // Now it is public: verified tag, pet detail, photo, and the rating on the title block.
  await buyer.reload();
  const card = buyer.getByTestId('review-card').filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByTestId('review-verified')).toBeVisible();
  await expect(card).toContainText('weighs 12.5 kg');
  await expect(card.getByTestId('review-photo')).toHaveCount(1);
  await expect(buyer.getByRole('link', { name: /5\.0 \(1 review\)/ })).toBeVisible();
  // Your own review cannot be voted on; a second shopper can, once, and can take it back.
  await buyer.goto(`/products/${product.slug}`);
  await buyer.getByTestId('review-helpful').first().click();
  await expect(buyer.getByRole('alert').filter({ hasText: /own review/ })).toBeVisible();

  const voterCtx = await browser.newContext();
  const voter = await voterCtx.newPage();
  await register(voter, uniqueEmail());
  await expect(voter).toHaveURL(/\/account$/);
  await voter.goto(`/products/${product.slug}`);
  const helpful = voter.getByTestId('review-helpful').first();
  await expect(helpful).toContainText('Helpful (0)');
  await helpful.click();
  await expect(helpful).toContainText('Marked helpful (1)');

  // Sorting is URL state.
  await voter.getByLabel('Sort reviews').selectOption('photos');
  await expect(voter).toHaveURL(/rsort=photos/);
  await expect(voter.getByTestId('review-card').filter({ hasText: title })).toBeVisible();

  await admin.context.close();
  await buyerCtx.close();
  await voterCtx.close();
});

test('a gallery photo opens a modal and its product goes into the cart', async ({ browser }) => {
  const admin = await adminSession(browser);
  const product = await createProduct(admin.page, `E2E Gallery Tug ${unique('')}`);
  const caption = `E2E gallery ${unique('')}`;
  const created = await api<{ data: { id: string } }>(admin.page, 'POST', '/admin/gallery', {
    path: '/products/dog-toys/braided-tug-rope-1.webp',
    caption,
    petName: 'Testy',
    sortOrder: 0,
    published: true,
    productIds: [product.id],
  });
  expect(created.status, JSON.stringify(created.body)).toBe(201);

  try {
    const shopperCtx = await browser.newContext();
    const shopper = await shopperCtx.newPage();
    await shopper.goto('/');
    await expect(shopper.getByRole('heading', { name: 'Pawsome at home' })).toBeVisible();
    await shopper.getByRole('button', { name: `Open photo: ${caption}` }).click();
    const modal = shopper.getByTestId('gallery-modal');
    await expect(modal).toContainText(caption);
    await expect(modal.getByRole('link', { name: /E2E Gallery Tug/ })).toBeVisible();
    await modal.getByRole('button', { name: /^Add E2E Gallery Tug .* to cart$/ }).click();
    await expect(shopper.getByTestId('cart-count')).toHaveText('1');
    await shopperCtx.close();

    // On the product's own page the gallery shows only photos that feature it.
    const pdpCtx = await browser.newContext();
    const pdp = await pdpCtx.newPage();
    await pdp.goto(`/products/${product.slug}`);
    await expect(pdp.getByRole('heading', { name: 'Seen at home' })).toBeVisible();
    await expect(pdp.getByTestId('gallery-item')).toHaveCount(1);
    await pdpCtx.close();
  } finally {
    await api(admin.page, 'DELETE', `/admin/gallery/${created.body.data.id}`);
    await admin.context.close();
  }
});
