import { expect, test } from '@playwright/test';

import { api, restock } from './helpers';

// The demo helper panel, driven the way a visitor uses it: only the panel's buttons and Enter on
// the button it hands focus to. Checkout ends on the fake-gateway path (no Stripe key): the order
// is placed with exactly what the panel filled in, paid by the test-only simulator, and the
// confirmation must say paid. With a Stripe key the card step is covered by checkout.spec.ts.

// Its own product: checkout.spec.ts buys bouncy-rubber-ball in parallel and checks the stock maths.
const PRODUCT = 'pumpkin-squeak-ball';

test.beforeAll(async ({ browser, baseURL }) => {
  await restock(browser, baseURL, [PRODUCT]);
});

test('registers a fresh shopper with one click', async ({ page }) => {
  await page.goto('/register');
  const panel = page.getByRole('region', { name: 'Demo helper' });
  await panel.getByRole('button', { name: 'Fill with a new demo shopper' }).click();
  await expect(page.getByTestId('demo-password')).not.toBeEmpty();
  await expect(page.getByTestId('register-submit')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/account$/);
});

test('signs in as a demo shopper', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Use Sam' }).click();
  await expect(page.getByTestId('login-submit')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByTestId('account-menu-button')).toBeVisible();
});

test('completes a checkout using only the panel', async ({ page }) => {
  test.skip(
    Boolean(process.env.STRIPE_SECRET_KEY),
    'Real Stripe configured: the simulator cannot pay its intents (checkout.spec.ts covers 4242).',
  );
  await page.goto(`/products/${PRODUCT}`);
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('toast').filter({ hasText: /^Added 1 x/ })).toBeVisible();

  await page.goto('/checkout');
  await page.getByTestId('demo-fill-contact').click();
  await page.getByTestId('demo-fill-address').click();
  await expect(page.getByTestId('checkout-continue-shipping')).toBeFocused();

  // What the panel typed is what the order will carry.
  const form = page.locator('[data-demo-form="checkout-details"]');
  const value = (name: string) => form.locator(`[name="${name}"]`).inputValue();
  const email = await value('email');
  const shippingAddress = {
    fullName: await value('shippingAddress.fullName'),
    line1: await value('shippingAddress.line1'),
    postalCode: await value('shippingAddress.postalCode'),
    city: await value('shippingAddress.city'),
    country: await value('shippingAddress.country'),
    phone: await value('shippingAddress.phone'),
  };
  expect(email).toMatch(/^demo\+\w+@pawsome\.test$/);
  await page.keyboard.press('Enter');

  await page.getByTestId('demo-pick-shipping').click();
  const method = await page
    .getByTestId('shipping-option')
    .locator('input:checked')
    .getAttribute('value');
  await expect(page.getByTestId('checkout-continue-payment')).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('checkout-step').nth(2)).toHaveAttribute('data-state', 'active');
  await expect(page.getByTestId('demo-test-card')).toHaveText('4242 4242 4242 4242');

  // Fake gateway: place the order the UI would place, pay it with the simulator.
  const placed = await api<{ data: { orderNumber: string } }>(page, 'POST', '/checkout', {
    email,
    shippingAddress,
    shippingMethodCode: method,
  });
  expect(placed.status, JSON.stringify(placed.body)).toBe(200);
  const orderNumber = placed.body.data.orderNumber;
  const paid = await api(
    page,
    'POST',
    '/test/webhooks/simulate',
    { orderNumber },
    { 'X-Test-Hook-Secret': process.env.TEST_HOOK_SECRET ?? '' },
  );
  expect(paid.status, JSON.stringify(paid.body)).toBe(200);

  await page.goto(`/checkout/confirmation/${orderNumber}`);
  await expect(page.getByTestId('confirmation-status')).toHaveAttribute('data-state', 'paid', {
    timeout: 15_000,
  });
});
