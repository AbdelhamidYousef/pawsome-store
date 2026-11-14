import { expect, test, type Page } from '@playwright/test';

import { restock } from './helpers';

// Store views, slice 1: the URL prefix. (The switcher and, later, strings and currency extend
// this file.)

test('an old unprefixed product URL lands on the default store and keeps its query', async ({
  page,
}) => {
  await page.goto('/products/braided-tug-rope?x=1#reviews');
  await expect(page).toHaveURL(/\/eu-en\/products\/braided-tug-rope\?x=1#reviews$/);
  await expect(page.getByTestId('header')).toBeVisible();
});

test('the bare root lands on the default store', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/eu-en$/);
});

test('links inside a store view stay inside it and set the page language', async ({ page }) => {
  await page.goto('/de-de/c/dogs');
  await expect(page.getByTestId('header')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await page.getByTestId('logo').click();
  await expect(page).toHaveURL(/\/de-de$/);
});

test('an unknown store code is a not-found page, not a redirect', async ({ page }) => {
  await page.goto('/xx-yy/c/dogs');
  await expect(page.getByTestId('page-not-found')).toBeVisible();
  await expect(page).toHaveURL(/\/xx-yy\/c\/dogs$/);
});

test('the admin stays un-prefixed', async ({ page }) => {
  await page.goto('/eu-en/admin');
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$|\/admin$/);
});

test('the switcher keeps the page and query, and the pick is remembered for old URLs', async ({
  page,
}) => {
  await page.goto('/eu-en/c/dogs?sort=price_asc');
  await expect(page.getByTestId('header')).toBeVisible();
  await page.getByTestId('store-switcher').selectOption('uk-en');
  await expect(page).toHaveURL(/\/uk-en\/c\/dogs\?sort=price_asc$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
  await expect(page.getByTestId('store-switcher')).toHaveValue('uk-en');

  // Footer switcher too, and the cookie sends a bare old URL to the last pick.
  await page.getByTestId('store-switcher-footer').selectOption('fr-fr');
  await expect(page).toHaveURL(/\/fr-fr\/c\/dogs\?sort=price_asc$/);
  await page.goto('/brands');
  await expect(page).toHaveURL(/\/fr-fr\/brands$/);
});

test('every store view is announced to search engines with hreflang', async ({ page }) => {
  // On the English store: the German and French alternates carry their own category slugs.
  await page.goto('/eu-en/c/dogs');
  await expect(page.getByTestId('header')).toBeVisible();
  const links = page.locator('link[rel="alternate"][hreflang]');
  await expect(links).toHaveCount(5);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', '/eu-en/c/dogs');
  await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute(
    'href',
    /\/eu-en\/c\/dogs$/,
  );
  await expect(page.locator('link[hreflang="de-DE"]')).toHaveAttribute(
    'href',
    /\/de-de\/c\/hunde$/,
  );
  await expect(page.locator('link[hreflang="fr-FR"]')).toHaveAttribute(
    'href',
    /\/fr-fr\/c\/chiens$/,
  );
  await expect(page.locator('link[hreflang="en-GB"]')).toHaveAttribute('href', /\/uk-en\/c\/dogs$/);
});

// ---------------------------------------------------------------------------------------------
// Store views, slice 4: language, currency, checkout and mail follow the store view.
//
// The test drives the real UI in /de-de (German words, euros) and /uk-en (pounds), then pays through
// the fake gateway (POST /test/webhooks/simulate, same as checkout.spec) and reads the confirmation
// mails in Mailpit: the UK order mail is English, the German one is German.
// ---------------------------------------------------------------------------------------------

const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const PRODUCT = 'bouncy-rubber-ball';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser, baseURL }) => {
  await restock(browser, baseURL, [PRODUCT]);
});

// Browser-side fetch (the page's own cookies and Origin), with the store view header the web client
// would send from the URL prefix.
async function api<T>(
  page: Page,
  store: string,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ store, method, path, body, hookSecret }) => {
      const res = await fetch(`/api/v1${path}`, {
        method,
        credentials: 'include',
        headers: {
          'X-Store-View': store,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(path.startsWith('/test/') ? { 'X-Test-Hook-Secret': hookSecret } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: res.status, body: (await res.json().catch(() => null)) as never };
    },
    { store, method, path, body, hookSecret: process.env.TEST_HOOK_SECRET ?? '' },
  );
}

async function mailSubject(to: string): Promise<string> {
  let subject = '';
  await expect
    .poll(
      async () => {
        const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
        const found = (await res.json()) as { messages: { Subject: string }[] };
        subject = found.messages[0]?.Subject ?? '';
        return subject !== '';
      },
      { timeout: 60_000, message: `a mail to ${to} in Mailpit` },
    )
    .toBe(true);
  return subject;
}

async function buyIn(
  page: Page,
  store: 'de-de' | 'uk-en',
  email: string,
  country: string,
): Promise<string> {
  await page.goto(`/${store}/products/${PRODUCT}`);
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('toast')).toBeVisible();
  const res = await api<{ data: { orderNumber: string } }>(page, store, 'POST', '/checkout', {
    email,
    shippingAddress: {
      fullName: 'Sam Rivers',
      line1: '1 Bone Street',
      postalCode: country === 'GB' ? 'SW1A 1AA' : '10115',
      city: country === 'GB' ? 'London' : 'Berlin',
      country,
    },
    shippingMethodCode: 'standard',
  });
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  const number = res.body.data.orderNumber;
  const paid = await api(page, store, 'POST', '/test/webhooks/simulate', { orderNumber: number });
  expect(paid.status, JSON.stringify(paid.body)).toBe(200);
  return number;
}

test('German store: German words and euros; UK store: pounds, checkout, English mail', async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.STRIPE_SECRET_KEY),
    'A Stripe key is set: the simulated payment needs the fake gateway.',
  );
  const mailUp = await fetch(`${MAILPIT}/api/v1/messages`).then(
    (r) => r.ok,
    () => false,
  );
  test.skip(!mailUp, '!!! Mailpit is unreachable: the order mails cannot be checked.');

  // --- /de-de: German strings and euros ---
  await page.goto(`/de-de/products/${PRODUCT}`);
  await expect(page.getByTestId('add-to-cart')).toHaveText('In den Warenkorb');
  await expect(page.getByTestId('price-current').first()).toContainText('€');
  const deMail = `de-${Date.now()}@pawsome.test`;
  const deNumber = await buyIn(page, 'de-de', deMail, 'DE');
  await page.goto(`/de-de/checkout/confirmation/${deNumber}`);
  await expect(page.getByTestId('confirmation-status')).toHaveAttribute('data-state', 'paid', {
    timeout: 15_000,
  });
  await expect(page.getByTestId('order-summary').getByTestId('order-total')).toContainText('€');
  expect(await mailSubject(deMail)).toBe(`Ihre Pawsome-Bestellung ${deNumber} ist bestätigt`);

  // --- switch to /uk-en: pounds on the same product ---
  await page.getByTestId('store-switcher').selectOption('uk-en');
  await expect(page).toHaveURL(/\/uk-en\//);
  await page.goto(`/uk-en/products/${PRODUCT}`);
  await expect(page.getByTestId('add-to-cart')).toHaveText('Add to cart');
  await expect(page.getByTestId('price-current').first()).toContainText('£');
  await expect(page.getByTestId('price-current').first()).not.toContainText('€');

  // --- add to cart and look at it in pounds ---
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('toast')).toBeVisible();
  await page.goto('/uk-en/cart');
  await expect(page.getByTestId('cart-line').first()).toContainText('£');

  // --- checkout through the fake gateway: the confirmation shows pounds, the mail is English ---
  const ukMail = `uk-${Date.now()}@pawsome.test`;
  const ukRes = await api<{ data: { orderNumber: string } }>(page, 'uk-en', 'POST', '/checkout', {
    email: ukMail,
    shippingAddress: {
      fullName: 'Sam Rivers',
      line1: '1 Bone Street',
      postalCode: 'SW1A 1AA',
      city: 'London',
      country: 'GB',
    },
    shippingMethodCode: 'standard',
  });
  expect(ukRes.status, JSON.stringify(ukRes.body)).toBe(200);
  const ukNumber = ukRes.body.data.orderNumber;
  const paid = await api(page, 'uk-en', 'POST', '/test/webhooks/simulate', {
    orderNumber: ukNumber,
  });
  expect(paid.status).toBe(200);
  await page.goto(`/uk-en/checkout/confirmation/${ukNumber}`);
  await expect(page.getByTestId('confirmation-status')).toHaveAttribute('data-state', 'paid', {
    timeout: 15_000,
  });
  const total = page.getByTestId('order-summary').getByTestId('order-total');
  await expect(total).toContainText('£');
  await expect(total).not.toContainText('€');
  expect(await mailSubject(ukMail)).toBe(`Your Pawsome order ${ukNumber} is confirmed`);

  // A EUR address is refused in the UK store: the store ships to its own countries only.
  await page.goto(`/uk-en/products/${PRODUCT}`);
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('toast')).toBeVisible();
  const wrong = await api(page, 'uk-en', 'POST', '/checkout', {
    email: ukMail,
    shippingAddress: {
      fullName: 'Sam Rivers',
      line1: '1 Bone Street',
      postalCode: '10115',
      city: 'Berlin',
      country: 'DE',
    },
    shippingMethodCode: 'standard',
  });
  expect(wrong.status).toBe(400);
});
