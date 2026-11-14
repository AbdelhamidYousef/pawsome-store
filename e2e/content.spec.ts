import { expect, test, type Page } from '@playwright/test';

import { api, uniqueEmail } from './helpers';

// Phase 20 (content and trust), end to end: homepage hero, guides, help centre, order tracking,
// withdrawal and the cookie notice. Guides and help articles come from the seeded database.
//
// The seed creates no orders, so the two tests that need one (tracking, withdrawal) place and pay
// for their own through the same API the checkout UI uses, with the test-only payment simulator
// (the same trick checkout.spec.ts uses). Each test makes its own order with its own unique email,
// so nothing depends on run order. They buy a product no other spec buys, so the stock arithmetic
// in checkout.spec.ts cannot be disturbed when files run in parallel.

const PRODUCT = 'reflective-walking-leash';
const ADDRESS = {
  fullName: 'Sam Rivers',
  line1: '1 Bone Street',
  postalCode: '10115',
  city: 'Berlin',
  country: 'DE',
};
const NOT_FOUND = 'We could not find an order with that number and email.';

// Buys one item and returns the paid order's number and the email it was placed with. Skips the
// test, loudly, when the API on this port has no simulator (not started by playwright.config.ts).
async function paidOrder(page: Page): Promise<{ orderNumber: string; email: string }> {
  const email = uniqueEmail();
  await page.goto(`/products/${PRODUCT}`);
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('toast').filter({ hasText: /^Added 1 x/ })).toBeVisible();

  const placed = await api<{ data: { orderNumber: string } }>(page, 'POST', '/checkout', {
    email,
    shippingAddress: ADDRESS,
    shippingMethodCode: 'standard',
  });
  expect(placed.status, JSON.stringify(placed.body)).toBe(200);
  const orderNumber = placed.body.data.orderNumber;

  const paid = await api<{ error?: { message?: string } }>(
    page,
    'POST',
    '/test/webhooks/simulate',
    { orderNumber },
    { 'X-Test-Hook-Secret': process.env.TEST_HOOK_SECRET ?? '' },
  );
  test.skip(
    paid.status === 404 && paid.body?.error?.message !== 'Order not found',
    '!!! No /test/webhooks/simulate: the API was not started with NODE_ENV=test (or a Stripe key is set).',
  );
  expect(paid.status, JSON.stringify(paid.body)).toBe(200);
  return { orderNumber, email };
}

test.describe('homepage', () => {
  test('hero carousel pauses on hover, and the sections render', async ({ page }) => {
    await page.goto('/');
    const hero = page.getByTestId('hero-carousel');
    await expect(hero).toBeVisible();
    await expect(page.getByTestId('hero-slide').filter({ visible: true })).toHaveCount(1);

    // No pause button: pointer on the hero (or focus inside it) stops the rotation.
    await expect(page.getByTestId('hero-toggle')).toHaveCount(0);
    await expect(hero).toHaveAttribute('data-playing', 'true');
    await hero.hover();
    await expect(hero).toHaveAttribute('data-playing', 'false');

    // Paused means it stays put; next/previous still work by hand.
    const title = () => hero.getByRole('heading', { level: 2 }).filter({ visible: true });
    const first = await title().innerText();
    await page.getByTestId('hero-next').click();
    await expect(title()).not.toHaveText(first);
    await page.getByTestId('hero-prev').click();
    await expect(title()).toHaveText(first);

    await expect(page.getByTestId('guides-teaser')).toBeVisible();
  });
});

test.describe('guides', () => {
  test('opens a guide from the list and follows a linked product', async ({ page }) => {
    await page.goto('/guides');
    await expect(page.getByTestId('page-guides')).toBeVisible();
    const card = page.getByTestId('guide-card').filter({ hasText: 'Walking gear basics' });
    await card.click();

    await expect(page).toHaveURL(/\/guides\/walking-gear-basics$/);
    await expect(page.getByTestId('page-guide')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Walking gear basics');
    await expect(page.getByTestId('guide-body')).not.toBeEmpty();

    const linked = page.getByTestId('guide-products').getByRole('link').first();
    await expect(linked).toBeVisible();
    await linked.click();
    await expect(page).toHaveURL(/\/products\/[\w-]+/);
    await expect(page.getByTestId('add-to-cart')).toBeVisible();
  });
});

test.describe('help centre', () => {
  test('search finds an answer, a nonsense query offers a way out', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByTestId('help-item').first()).toBeVisible();

    await page.getByTestId('help-search').fill('refund');
    await expect(page).toHaveURL(/q=refund/);
    const items = page.getByTestId('help-item');
    await expect(items.filter({ hasText: /refund/i }).first()).toBeVisible();

    await page.getByTestId('help-search').fill('zzzxqvnotaword');
    await expect(page.getByTestId('help-no-results')).toBeVisible();
    await expect(page.getByTestId('help-contact')).toHaveAttribute('href', '/eu-en/contact');
  });
});

test.describe('order tracking', () => {
  test('shows the order for the right email; a wrong email gets the generic message', async ({
    page,
  }) => {
    const { orderNumber, email } = await paidOrder(page);

    await page.goto('/track-order');
    await page.getByTestId('track-order-number').fill(orderNumber);
    await page.getByTestId('track-email').fill(`wrong-${email}`);
    await page.getByTestId('track-submit').click();
    await expect(page.getByRole('alert').filter({ hasText: NOT_FOUND })).toBeVisible();
    await expect(page.getByTestId('track-result')).toHaveCount(0);

    // A number that does not exist gets the very same words.
    await page.getByTestId('track-order-number').fill('PW-2000-999999');
    await page.getByTestId('track-email').fill(email);
    await page.getByTestId('track-submit').click();
    await expect(page.getByRole('alert').filter({ hasText: NOT_FOUND })).toBeVisible();

    await page.getByTestId('track-order-number').fill(orderNumber);
    await page.getByTestId('track-submit').click();
    const result = page.getByTestId('track-result');
    await expect(result).toBeVisible();
    await expect(result).toContainText(orderNumber);
    await expect(page.getByTestId('track-timeline-step').first()).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: NOT_FOUND })).toHaveCount(0);
  });
});

test.describe('withdrawal', () => {
  test('a buyer withdraws and gets a reference', async ({ page }) => {
    const { orderNumber, email } = await paidOrder(page);

    await page.goto(`/withdraw?number=${orderNumber}`);
    await expect(page.getByTestId('withdraw-form')).toBeVisible();
    await page.getByLabel('Email used for the order').fill(email);
    await page.getByLabel(/Reason/).fill('Changed my mind');
    await page.getByRole('button', { name: 'Withdraw from contract' }).click();

    const done = page.getByTestId('withdraw-success');
    await expect(done).toBeVisible();
    await expect(done).toContainText(orderNumber);
    await expect(done).toContainText(/WD-[0-9A-F]{8}/);
  });

  test('a wrong email is refused with the generic message', async ({ page }) => {
    await page.goto('/withdraw');
    await page.getByLabel('Order number').fill('PW-2000-999999');
    await page.getByLabel('Email used for the order').fill(uniqueEmail());
    await page.getByRole('button', { name: 'Withdraw from contract' }).click();
    await expect(page.getByRole('alert').filter({ hasText: NOT_FOUND })).toBeVisible();
    await expect(page.getByTestId('withdraw-success')).toHaveCount(0);
  });
});

test.describe('cookie notice', () => {
  test('shows once, never blocks, and stays gone after OK', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByTestId('cookie-banner');
    await expect(banner).toBeVisible();
    // A notice, not a gate: the page behind it still works.
    await page.getByTestId('hero-next').click();

    await page.getByTestId('cookie-ok').click();
    await expect(banner).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('hero-carousel')).toBeVisible();
    await expect(banner).toHaveCount(0);
    await page.goto('/help');
    await expect(banner).toHaveCount(0);
  });
});
