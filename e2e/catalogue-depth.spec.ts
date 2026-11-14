import { expect, test } from '@playwright/test';

// Needs the seeded dev database (brands, health-need tags, collections, trial sizes).
// Burrow & Biscuit + "Dental care" on the dog page leaves the dental sticks and the peanut
// biscuits; "Puppy Starter Kit" always contains Soft Training Bites, which has a trial size.
const dollars = (text: string | null) => Number(/[\d.]+/.exec(text ?? '')?.[0]);

test('filter by brand and health need, lowest unit price first, open a collection, one trial size', async ({
  page,
}) => {
  // 1. Brand and health-need filters, both kept in the URL.
  await page.goto('/c/dogs');
  const filters = page.getByTestId('filters');
  await filters.getByRole('checkbox', { name: /^Burrow & Biscuit/ }).check();
  await expect(page).toHaveURL(/brand=burrow-and-biscuit/);
  await filters.getByRole('checkbox', { name: /^Dental care/ }).check();
  await expect(page).toHaveURL(/tag=dental/);
  await expect(
    page.getByRole('button', { name: /Remove filter Brand: Burrow & Biscuit/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Remove filter Health need: Dental care/ }),
  ).toBeVisible();
  const cards = page.getByTestId('product-card');
  await expect(cards).toHaveCount(2);

  // 2. Lowest unit price first: the unit prices on the cards ascend.
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('unit_price_asc');
  await expect(page).toHaveURL(/sort=unit_price_asc/);
  const unitPrices = page.getByTestId('unit-price');
  await expect(unitPrices).toHaveCount(2);
  await expect
    .poll(async () => {
      const [a, b] = await unitPrices.allInnerTexts();
      return dollars(a ?? null) <= dollars(b ?? null);
    })
    .toBe(true);
  await expect(page.getByText(/rounded to the nearest cent/)).toBeVisible();

  // 3. A collection page lists its products and opens a product.
  await page.goto('/collections/puppy-starter-kit');
  await expect(page.getByRole('heading', { level: 1, name: 'Puppy Starter Kit' })).toBeVisible();
  await expect(cards.first()).toBeVisible();
  await cards.filter({ hasText: 'Soft Training Bites' }).click();
  await expect(page).toHaveURL(/\/products\/soft-training-bites/);

  // 4. The trial size: pick it, add it once, and the second add is refused.
  const picker = page.getByTestId('variant-picker');
  await picker.locator('label', { hasText: /^Trial/ }).click();
  await expect(page.getByTestId('trial-pill')).toBeVisible();
  await expect(page.getByTestId('trial-note')).toContainText('one per customer');
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('toast').filter({ hasText: /^Added 1 x/ })).toBeVisible();
  await page.getByTestId('add-to-cart').click();
  await expect(
    page.getByTestId('toast').filter({ hasText: /limited to one per customer/ }),
  ).toBeVisible();
  // Still exactly one unit in the cart.
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});

test('an unknown collection or brand shows the not-found page', async ({ page }) => {
  await page.goto('/collections/does-not-exist');
  await expect(page.getByRole('heading', { name: /find that collection/ })).toBeVisible();
  await page.goto('/brands/does-not-exist');
  await expect(page.getByRole('heading', { name: /find that brand/ })).toBeVisible();
});

test('the brands page lists the house brands and opens one', async ({ page }) => {
  await page.goto('/brands');
  await expect(page.getByTestId('brand-card')).toHaveCount(12);
  await page.getByTestId('brand-card').filter({ hasText: 'Scaleby' }).click();
  await expect(page).toHaveURL(/\/brands\/scaleby$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Scaleby' })).toBeVisible();
  await expect(page.getByTestId('product-card').first()).toBeVisible();
});

test('reptiles are in the shop and themed', async ({ page }) => {
  await page.goto('/');
  await page
    .getByTestId('pet-tiles')
    .getByRole('link', { name: /^Reptiles/ })
    .click();
  await expect(page).toHaveURL(/\/c\/reptiles$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Reptiles' })).toBeVisible();
  await expect(page.locator('[data-pet="reptile"]').first()).toBeVisible();
});
