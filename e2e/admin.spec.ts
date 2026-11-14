import { expect, test, type Browser, type Page } from '@playwright/test';

import { ADMIN, api, register, uniqueEmail } from './helpers';

// The back office, end to end: the guard, stock, product creation, the order lifecycle (with the
// customer's own view and the shipped email in Mailpit) and the phone layout.
//
// Money moves through the same simulated payment as checkout.spec.ts (fake gateway +
// POST /test/webhooks/simulate, both only under NODE_ENV=test). Each test makes its own product
// or order, so the specs run in parallel without sharing stock.
//
// The public catalog answers with `Cache-Control: max-age=60`, so storefront checks use a brand
// new browser context (empty HTTP cache) and poll with reloads instead of sleeping.

const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';
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

function unique(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

interface AdminProductBody {
  data: {
    id: string;
    slug: string;
    name: string;
    variants: { id: string; sku: string }[];
  };
}

// A signed-in admin in a context of its own.
async function adminSession(browser: Browser, viewport?: { width: number; height: number }) {
  const context = await browser.newContext(viewport ? { viewport } : {});
  const page = await context.newPage();
  await page.goto('/');
  const login = await api(page, 'POST', '/auth/login', ADMIN);
  expect(login.status, JSON.stringify(login.body)).toBe(200);
  return { context, page };
}

async function createProduct(
  page: Page,
  options: { name?: string; variants?: number; stock?: number; status?: 'active' | 'draft' } = {},
): Promise<AdminProductBody['data'] & { sku: string }> {
  const tree = await api<{ data: { id: string; children: { id: string }[] }[] }>(
    page,
    'GET',
    '/categories',
  );
  const parent = tree.body.data.find((c) => c.children.length > 0);
  const categoryId = parent?.children[0]?.id ?? tree.body.data[0]!.id;

  const sku = unique('E2E-').toUpperCase();
  const count = options.variants ?? 1;
  const res = await api<AdminProductBody>(page, 'POST', '/admin/products', {
    name: options.name ?? `E2E ${sku}`,
    description: 'Created by the admin e2e spec.',
    categoryId,
    status: options.status ?? 'active',
    attributes: { optionKeys: count > 1 ? ['size'] : [] },
    variants: Array.from({ length: count }, (_, i) => ({
      sku: `${sku}-${i + 1}`,
      name: `Variant ${i + 1}`,
      options: count > 1 ? { size: `Size ${i + 1}` } : {},
      priceCents: 1000 + i,
      weightGrams: 100,
      stock: options.stock ?? 5,
      ...(i === 0 && { isDefault: true }),
    })),
    images: [],
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return { ...res.body.data, sku };
}

// Fills the cart through the API and starts checkout: the order exists, its units are reserved,
// nothing is paid yet.
async function placeOrder(page: Page, email: string, variantId: string, quantity = 1) {
  await page.goto('/');
  const add = await api(page, 'POST', '/cart/items', { variantId, quantity });
  expect(add.status, JSON.stringify(add.body)).toBeLessThan(300);
  const shipping = await api<{ data: { code: string }[] }>(
    page,
    'GET',
    `/checkout/shipping-methods?country=${ADDRESS.country}`,
  );
  const code = shipping.body.data[0]!.code;
  const res = await api<{ data: { orderNumber: string } }>(page, 'POST', '/checkout', {
    email,
    shippingAddress: ADDRESS,
    shippingMethodCode: code,
  });
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return res.body.data.orderNumber;
}

async function pay(page: Page, orderNumber: string): Promise<void> {
  const res = await api(page, 'POST', '/test/webhooks/simulate', { orderNumber }, HOOK_HEADERS);
  expect(res.status, JSON.stringify(res.body)).toBe(200);
}

async function paidOrder(browser: Browser, email = uniqueEmail(), variantId?: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  let id = variantId;
  if (!id) {
    const admin = await adminSession(browser);
    id = (await createProduct(admin.page)).variants[0]!.id;
    await admin.context.close();
  }
  const orderNumber = await placeOrder(page, email, id);
  await pay(page, orderNumber);
  return { context, page, orderNumber, email };
}

const noHorizontalScroll = async (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: document.documentElement.clientWidth,
      })),
    )
    .toEqual({ scroll: 390, width: 390 });

test.describe('the guard', () => {
  test('a guest is sent to sign in and back to /admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId('page-admin')).toBeVisible();
    await expect(page.getByTestId('admin-stat')).toHaveCount(3);
  });

  test('a customer sees the no-access page and the API says 403', async ({ page }) => {
    await register(page, uniqueEmail());
    await expect(page).toHaveURL(/\/account$/);
    await page.goto('/admin/products');
    await expect(page.getByTestId('page-forbidden')).toBeVisible();
    await expect(page.getByTestId('page-admin')).toHaveCount(0);
    const res = await api(page, 'GET', '/admin/stats');
    expect(res.status).toBe(403);
  });
});

test.describe('stock', () => {
  test('setting a variant to 0 makes the storefront show it sold out', async ({ browser }) => {
    const admin = await adminSession(browser);
    const product = await createProduct(admin.page, { stock: 3 });
    const page = admin.page;

    // Before: buyable, in a fresh context so nothing is cached for the "after" check.
    const shopper = await browser.newContext();
    const shop = await shopper.newPage();
    await shop.goto(`/products/${product.slug}`);
    await expect(shop.getByRole('button', { name: 'Add to cart', exact: true })).toBeEnabled();
    await shopper.close();

    await page.goto(`/admin/products/${product.id}`);
    const row = page.getByTestId('admin-variant-row').filter({ hasText: product.sku });
    await row.getByRole('button', { name: `Adjust stock for ${product.sku}-1` }).click();
    const dialog = page.getByTestId('admin-stock-form');
    await dialog.getByLabel('Units on hand').fill('0');
    await dialog.getByLabel('Reason').selectOption('damage');
    await dialog.getByRole('button', { name: 'Save stock' }).click();
    await expect(page.getByTestId('toast').filter({ hasText: 'Stock set to 0' })).toBeVisible();

    // After: poll with reloads in a new context (no HTTP cache) until the public API agrees.
    const after = await browser.newContext();
    const view = await after.newPage();
    await view.goto(`/products/${product.slug}`);
    await expect(async () => {
      await view.reload();
      await expect(view.getByRole('button', { name: 'Sold out' })).toBeDisabled({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await after.close();
    await admin.context.close();
  });

  test('stock below what unpaid orders reserved is refused with the server message', async ({
    browser,
  }) => {
    const admin = await adminSession(browser);
    const product = await createProduct(admin.page, { stock: 5 });
    const variantId = product.variants[0]!.id;

    // A pending checkout of 3 units reserves them.
    const guest = await browser.newContext();
    await placeOrder(await guest.newPage(), uniqueEmail(), variantId, 3);

    const page = admin.page;
    await page.goto(`/admin/products/${product.id}`);
    await page.getByRole('button', { name: `Adjust stock for ${product.sku}-1` }).click();
    const dialog = page.getByTestId('admin-stock-form');
    await expect(dialog).toContainText('reserved by unpaid orders 3');
    await dialog.getByLabel('Units on hand').fill('2');
    await dialog.getByRole('button', { name: 'Save stock' }).click();
    await expect(dialog.getByRole('alert')).toContainText(/reserved/i);
    // Still open, nothing saved.
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Units on hand').fill('3');
    await dialog.getByRole('button', { name: 'Save stock' }).click();
    await expect(page.getByTestId('toast').filter({ hasText: 'Stock set to 3' })).toBeVisible();

    await guest.close();
    await admin.context.close();
  });
});

test.describe('products', () => {
  test('create a product with a variant, add a second and an image, activate it, find it', async ({
    browser,
  }) => {
    const admin = await adminSession(browser);
    const page = admin.page;
    const token = unique('zq');
    const name = `Wobbly ${token} Hammock`;
    const sku = unique('HAM-').toUpperCase();

    await page.goto('/admin/products/new');
    const form = page.getByTestId('admin-product-form');
    await form.getByLabel('Name', { exact: true }).fill(name);
    await form.getByLabel('Description').fill('A hammock for the sleepiest cat.');
    await form.getByLabel('Category').selectOption({ index: 1 });
    const variant = form.getByRole('group', { name: 'Variant 1' });
    await variant.getByLabel('SKU').fill(`${sku}-S`);
    await variant.getByLabel('Variant name').fill('Small');
    await variant.getByLabel('Options').fill('Size=Small');
    await variant.getByLabel('Price', { exact: true }).fill('19.90');
    await variant.getByLabel('Weight (grams)').fill('300');
    await variant.getByLabel('Opening stock').fill('4');
    await page.getByTestId('admin-product-save').click();

    // Lands on the edit page of the new product, still a draft.
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
    await expect(page.getByTestId('admin-variant-row')).toHaveCount(1);

    // Second variant through the dialog.
    await page.getByRole('button', { name: 'Add variant' }).click();
    const dialog = page.getByTestId('admin-variant-form');
    await dialog.getByLabel('SKU').fill(`${sku}-L`);
    await dialog.getByLabel('Variant name').fill('Large');
    await dialog.getByLabel('Options').fill('Size=Large');
    await dialog.getByLabel('Price', { exact: true }).fill('24.90');
    await dialog.getByLabel('Weight (grams)').fill('450');
    await dialog.getByLabel('Opening stock').fill('2');
    await dialog.getByRole('button', { name: 'Add variant' }).click();
    await expect(page.getByTestId('admin-variant-row')).toHaveCount(2);

    // Image URL and Active in the product form, one save.
    const productForm = page.getByTestId('admin-product-form');
    await productForm.getByRole('button', { name: 'Add image' }).click();
    const image = productForm.getByRole('group', { name: 'Image 1' });
    await image.getByLabel('Image URL').fill('/products/bouncy-rubber-ball.webp');
    await image.getByLabel('Alt text').fill('A hammock');
    await image.getByLabel('Width (px)').fill('800');
    await image.getByLabel('Height (px)').fill('800');
    await productForm.getByLabel('Status', { exact: true }).selectOption('active');
    await page.getByTestId('admin-product-save').click();
    await expect(page.getByRole('link', { name: 'View in the shop' })).toBeVisible();

    // Admin list search.
    await page.goto('/admin/products');
    await page.getByTestId('admin-search').fill(token);
    await page.keyboard.press('Enter');
    const rows = page.getByTestId('admin-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(name);
    await expect(rows.first()).toContainText('active');
    await expect(rows.first()).toContainText('2'); // variants

    // Storefront search, fresh context (no HTTP cache).
    const shopper = await browser.newContext();
    const shop = await shopper.newPage();
    await shop.goto(`/search?q=${token}`);
    await expect(shop.getByTestId('product-card').filter({ hasText: name })).toBeVisible();
    await shopper.close();
    await admin.context.close();
  });
});

test.describe('orders', () => {
  test('paid -> processing -> shipped: the customer sees it and Mailpit has the email', async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const email = uniqueEmail();
    const customer = await browser.newContext();
    const shopper = await customer.newPage();
    await register(shopper, email);
    await expect(shopper).toHaveURL(/\/account$/);

    const admin = await adminSession(browser);
    const product = await createProduct(admin.page);
    const orderNumber = await placeOrder(shopper, email, product.variants[0]!.id);
    await pay(shopper, orderNumber);

    const page = admin.page;
    await page.goto('/admin/orders');
    await page.getByTestId('admin-search').fill(orderNumber);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('admin-row')).toHaveCount(1);
    await page.getByTestId('admin-row').getByRole('link', { name: orderNumber }).click();

    await expect(page.getByTestId('admin-order-status')).toContainText('Paid');
    // No "Mark paid" button: only Stripe can pay an order.
    await expect(page.getByRole('button', { name: 'Mark paid' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Start processing' }).click();
    await expect(page.getByTestId('admin-order-status')).toContainText('Processing');
    // The note box is cleared when the move is confirmed; wait for that before typing the next one.
    await expect(
      page.getByTestId('toast').filter({ hasText: 'Order is now processing' }),
    ).toBeVisible();
    await page.getByLabel('Note (optional)').fill('Packed with a treat');
    await page.getByRole('button', { name: 'Mark shipped' }).click();
    await expect(page.getByTestId('admin-order-status')).toContainText('Shipped');
    await expect(page.getByTestId('admin-timeline')).toContainText('Packed with a treat');

    // The customer's own page.
    await shopper.goto(`/account/orders/${orderNumber}`);
    await expect(shopper.getByTestId('page-order-detail')).toHaveAttribute('data-state', 'ready');
    await expect(shopper.getByTestId('order-timeline-step').last()).toHaveAttribute(
      'data-status',
      'shipped',
    );
    await shopper.goto('/account/orders');
    await expect(
      shopper
        .getByTestId('order-row')
        .filter({ hasText: orderNumber })
        .getByTestId('order-status-badge'),
    ).toHaveText('Shipped');

    // The shipped email, if Mailpit is up (local only). The outbox sends it asynchronously.
    const mailpit = await fetch(`${MAILPIT}/api/v1/messages`).then(
      (r) => r.ok,
      () => false,
    );
    if (mailpit) {
      await expect
        .poll(
          async () => {
            const res = await fetch(
              `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
            );
            const body = (await res.json()) as { messages: { Subject: string }[] };
            return body.messages.map((m) => m.Subject);
          },
          { timeout: 30_000, message: `shipped email for ${email} in Mailpit` },
        )
        .toContainEqual(expect.stringContaining(`${orderNumber} is on its way`));
    } else {
      console.warn('!!! Mailpit unreachable: the shipped-email assertion was skipped.');
    }

    await customer.close();
    await admin.context.close();
  });

  test('cancelling a paid order asks first and ends cancelled', async ({ browser }) => {
    const paid = await paidOrder(browser);
    const admin = await adminSession(browser);
    const page = admin.page;
    await page.goto(`/admin/orders/${paid.orderNumber}`);
    await expect(page.getByTestId('admin-order-status')).toContainText('Paid');

    await page.getByRole('button', { name: 'Cancel order' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('refunded');
    await expect(dialog).toContainText('cannot be undone');

    // Backing out changes nothing.
    await dialog.getByRole('button', { name: 'Keep the order as it is' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('admin-order-status')).toContainText('Paid');

    await page.getByRole('button', { name: 'Cancel order' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Yes, cancel order' }).click();
    await expect(page.getByTestId('admin-order-status')).toContainText('Cancelled');
    await expect(page.getByTestId('admin-transition')).toContainText('No further actions');

    await paid.context.close();
    await admin.context.close();
  });
});

test.describe('phone layout (390 px)', () => {
  test('products, orders, order detail and the variant table never widen the page', async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const viewport = { width: 390, height: 844 };
    const admin = await adminSession(browser, viewport);
    const page = admin.page;
    const product = await createProduct(page, {
      name: `E2E ${'Extraordinarily '.repeat(8)}Long-Named Product`.slice(0, 160),
      variants: 40,
    });
    const paid = await paidOrder(browser, uniqueEmail(), product.variants[0]!.id);

    for (const path of ['/admin', '/admin/products', '/admin/orders']) {
      await page.goto(path);
      await expect(page.getByTestId('page-admin')).toBeVisible();
      await noHorizontalScroll(page);
    }

    await page.goto(`/admin/orders/${paid.orderNumber}`);
    await expect(page.getByTestId('admin-order-status')).toBeVisible();
    await noHorizontalScroll(page);

    await page.goto(`/admin/products/${product.id}`);
    await expect(page.getByTestId('admin-variant-row')).toHaveCount(40);
    await noHorizontalScroll(page);
    // The table scrolls inside its own box.
    const box = page.getByTestId('admin-table');
    expect(await box.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

    await paid.context.close();
    await admin.context.close();
  });
});

test.describe('edges', () => {
  test('a page past the end says so, and the edit page keeps the category and variant order', async ({
    browser,
  }) => {
    const admin = await adminSession(browser);
    const page = admin.page;
    const product = await createProduct(page, { variants: 12 });

    for (const path of ['/admin/products?page=999', '/admin/orders?page=999']) {
      await page.goto(path);
      await expect(page.getByTestId('admin-empty')).toContainText('There is no page 999');
      await page.getByRole('link', { name: 'Back to the first page' }).click();
      await expect(page).not.toHaveURL(/page=999/);
    }

    // Loaded directly (categories arrive after the form is drawn): the category is still chosen.
    await page.goto(`/admin/products/${product.id}`);
    await expect(page.getByLabel('Category')).not.toHaveValue('');
    await expect(page.getByTestId('admin-variant-row').first()).toContainText('Opens first');
    await admin.context.close();
  });
});
