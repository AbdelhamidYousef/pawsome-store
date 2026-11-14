import { expect, test } from '@playwright/test';

// Needs the API (started by playwright.config.ts) with the seeded dev database (see playwright.config.ts).
test('browse: home, category, filter by material, open a product, change variant', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('pet-tiles').getByRole('link', { name: /^Dogs/ }).click();
  await expect(page).toHaveURL(/\/c\/dogs$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Dogs' })).toBeVisible();
  const cards = page.getByTestId('product-card');
  await expect(cards.first()).toBeVisible();
  const allDogs = await cards.count();
  expect(allDogs).toBeGreaterThan(1);

  // Filter by material: the checkbox label is "<value> (<count>)". Long lists fold their smaller
  // entries behind "Show N more", so open the Material group first.
  await page
    .getByTestId('filters')
    .getByRole('group', { name: 'Material' })
    .getByRole('button', { name: /^Show \d+ more/ })
    .click();
  await page
    .getByTestId('filters')
    .getByRole('checkbox', { name: /^Natural rubber/ })
    .check();
  await expect(page).toHaveURL(/attr\.material=natural\+rubber|attr\.material=natural%20rubber/);
  await expect(
    page.getByRole('button', { name: /Remove filter Material: Natural rubber/ }),
  ).toBeVisible();
  await expect(cards).toHaveCount(1);
  await expect(page.getByTestId('result-count')).toHaveText('1 product');

  await cards.first().click();
  await expect(page).toHaveURL(/\/products\/bouncy-rubber-ball$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Bouncy Rubber Ball' })).toBeVisible();

  // Change the size: the choice is written to the URL and the price follows the variant.
  const picker = page.getByTestId('variant-picker');
  const priceBefore = await page.getByTestId('price-current').first().innerText();
  await expect(picker.getByRole('radio', { name: 'Small' })).toBeChecked();
  await picker.locator('label', { hasText: 'Large' }).click();
  await expect(page).toHaveURL(/\?variant=PW-[A-Z0-9-]+-L$/);
  await expect(picker.getByRole('radio', { name: 'Large' })).toBeChecked();
  await expect(page.getByTestId('price-current').first()).not.toHaveText(priceBefore);

  // A shared link opens the exact variant.
  const url = page.url();
  await page.goto(url);
  await expect(
    page.getByTestId('variant-picker').getByRole('radio', { name: 'Large' }),
  ).toBeChecked();
});

test('search finds a product and keeps the query in the box', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('header').getByRole('combobox', { name: 'Search products' }).fill('rope');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=rope$/);
  await expect(page.getByTestId('product-card').first()).toBeVisible();
  await expect(
    page.getByTestId('header').getByRole('combobox', { name: 'Search products' }),
  ).toHaveValue('rope');
});

test('a sold-out product cannot be added to the cart', async ({ page }) => {
  await page.goto('/products/soft-glow-led-bar');
  await expect(page.getByRole('heading', { level: 1, name: 'Soft Glow LED Bar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sold out' })).toBeDisabled();
});

test('an unknown product shows the not-found page', async ({ page }) => {
  await page.goto('/products/does-not-exist');
  await expect(page.getByTestId('page-not-found')).toBeVisible();
});

test('every filter group on a short desktop screen can be reached with its options', async ({
  page,
}) => {
  // 1280x800 is a common laptop. The sidebar used to be an inner scroll box that cut between a
  // heading and its checkboxes, so "Age stage" looked empty.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/c/dogs');
  const groups = page.locator('aside[aria-label="Filters"] fieldset');
  await expect(groups.first()).toBeVisible();
  const count = await groups.count();
  expect(count).toBeGreaterThan(2);
  // No ancestor of a filter group may be its own vertical scroll box: that is what clipped the
  // options away from their heading (scrollIntoView would quietly scroll the box, so checking
  // visibility alone cannot catch it).
  const clippingAncestors = await page.evaluate(() => {
    const found: string[] = [];
    document.querySelectorAll('aside[aria-label="Filters"] fieldset').forEach((group) => {
      for (let el = group.parentElement; el && el.tagName !== 'BODY'; el = el.parentElement) {
        const overflowY = getComputedStyle(el).overflowY;
        if (['auto', 'scroll', 'hidden'].includes(overflowY) && el.scrollHeight > el.clientHeight) {
          found.push(el.tagName + '.' + el.className);
        }
      }
    });
    return found;
  });
  expect(clippingAncestors).toEqual([]);
  // After scrolling the page, each heading and its first option are on screen together.
  for (let i = 0; i < count; i += 1) {
    const group = groups.nth(i);
    await group.locator('legend').scrollIntoViewIfNeeded();
    await expect(group.locator('legend')).toBeInViewport();
    await expect(group.locator('input').first()).toBeInViewport();
  }
  // No heading without options anywhere in the sidebar.
  for (let i = 0; i < count; i += 1) {
    expect(await groups.nth(i).locator('input').count()).toBeGreaterThan(0);
  }
});

test('quick add from a card: one variant goes straight in, options open a sheet', async ({
  page,
}) => {
  await page.goto('/c/dogs');
  const count = page.getByTestId('cart-count');

  // Walkies Starter Kit is a kit with one variant: one click, no sheet.
  await page.getByRole('button', { name: 'Add to cart: Walkies Starter Kit' }).click();
  await expect(count).toHaveText('1');
  await expect(page.getByTestId('quick-add')).toHaveCount(0);

  // Braided Tug Rope has colours and sizes: the sheet opens with them, Add closes it.
  const rope = page.getByRole('button', { name: 'Add to cart: Braided Tug Rope' });
  await rope.click();
  const sheet = page.getByTestId('quick-add');
  await expect(sheet.getByTestId('variant-picker')).toBeVisible();
  await sheet.getByTestId('quick-add-submit').click();
  await expect(count).toHaveText('2');
  await expect(sheet).toHaveCount(0);
  await expect(rope).toBeFocused();
});
