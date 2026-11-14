import { formatMoney } from '@store/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WebCart } from '../../api/cart';
import { lookupFor, type TFunction } from '../../i18n';
import * as tracking from '../../lib/track';
import { makeCart, makeCartItem, makeCartPricing } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { API, server } from '../../test/server';

import { noticeSentence } from './promo-text';

afterEach(() => {
  vi.restoreAllMocks();
});

const progress = (percent: number, remainingCents: number, thresholdCents = 4000) => ({
  thresholdCents,
  remainingCents,
  percent,
  reached: remainingCents === 0,
});

function cartWith(pricing: Partial<WebCart['pricing']>): WebCart {
  return { ...makeCart([makeCartItem()]), pricing: makeCartPricing(pricing) };
}
const serveCart = (cart: WebCart) =>
  server.use(http.get(`${API}/cart`, () => HttpResponse.json({ data: cart })));

describe('progress bars', () => {
  it('shows the gift bar with aria values and the amount still missing', async () => {
    serveCart(
      cartWith({ progress: { freeShipping: null, gift: progress(95, 200), nextTier: null } }),
    );
    renderApp('/cart');
    const bar = await screen.findByRole('progressbar', { name: 'Progress to a free gift' });
    expect(bar).toHaveAttribute('aria-valuenow', '95');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByTestId('cart-gift-progress')).toHaveTextContent(
      'Spend €2.00 more for a free gift',
    );
  });

  it('says so once the gift is reached', async () => {
    serveCart(
      cartWith({ progress: { freeShipping: null, gift: progress(100, 0), nextTier: null } }),
    );
    renderApp('/cart');
    expect(await screen.findByText('You get a free gift!')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Progress to a free gift' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
  });

  it('uses the engine free-delivery bar when the cart carries one', async () => {
    serveCart(
      cartWith({
        progress: { freeShipping: progress(50, 2450, 4900), gift: null, nextTier: null },
      }),
    );
    renderApp('/cart');
    expect(await screen.findByTestId('cart-shipping-hint')).toHaveTextContent(
      'Add €24.50 more for free standard shipping.',
    );
    expect(screen.getByRole('progressbar', { name: 'Progress to free shipping' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
  });

  it('also shows the bars in the mini cart', async () => {
    serveCart(
      cartWith({ progress: { freeShipping: null, gift: progress(95, 200), nextTier: null } }),
    );
    renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Cart, 1 item' }));
    const mini = await screen.findByTestId('mini-cart');
    expect(await within(mini).findByTestId('cart-gift-progress')).toHaveTextContent('€2.00');
  });
});

describe('summary', () => {
  const priced = cartWith({
    code: 'PAWS10',
    adjustments: [
      { type: 'code', refId: 'c1', label: 'Code PAWS10', cents: 110, scope: 'lines' },
      { type: 'bulk_tier', refId: 't1', label: '5% bulk discount', cents: 55, scope: 'lines' },
    ],
    discountCents: 165,
    shippingEstimateCents: 490,
    totalEstimateCents: 1424,
    gift: {
      variantId: 'g1',
      productName: 'Peanut Crunch Biscuits',
      variantName: '200 g',
      imageUrl: null,
    },
  });

  it('itemises adjustments as label and negative amount', async () => {
    serveCart(priced);
    renderApp('/cart');
    const rows = await screen.findAllByTestId('cart-adjustment');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Code PAWS10');
    expect(rows[0]).toHaveTextContent('-€1.10');
    expect(rows[1]).toHaveTextContent('5% bulk discount');
  });

  it('shows the delivery estimate, the estimated total and the tax note', async () => {
    serveCart(priced);
    renderApp('/cart');
    expect(await screen.findByTestId('cart-total-estimate')).toHaveTextContent('€14.24');
    expect(screen.getByText(/Shipping \(estimate, standard delivery\)/)).toBeVisible();
    expect(screen.getByText('€4.90')).toBeVisible();
    expect(screen.getByText('Prices include VAT where it applies.')).toBeVisible();
    expect(screen.queryByText(/worked out at checkout/)).not.toBeInTheDocument();
  });

  it('lists the free gift as a €0.00 line', async () => {
    serveCart(priced);
    renderApp('/cart');
    const gift = await screen.findByTestId('cart-gift-line');
    expect(gift).toHaveTextContent('Free gift');
    expect(gift).toHaveTextContent('Peanut Crunch Biscuits');
    expect(gift).toHaveTextContent('€0.00');
  });

  it('explains how discounts combine in a native disclosure', async () => {
    serveCart(priced);
    renderApp('/cart');
    const box = await screen.findByTestId('cart-discounts-combine');
    expect(box.tagName).toBe('DETAILS');
    expect(within(box).getByText('How discounts combine')).toBeVisible();
    expect(box).toHaveTextContent('whichever saves you more');
  });
});

describe('discount code', () => {
  it('applies a code, tracks it and shows the removable chip', async () => {
    const spy = vi.spyOn(tracking, 'track');
    let body: unknown;
    let current = cartWith({});
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json({ data: current })),
      http.post(`${API}/cart/code`, async ({ request }) => {
        body = await request.json();
        current = cartWith({ code: 'PAWS10' });
        return HttpResponse.json({ data: current });
      }),
    );
    renderApp('/cart');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Discount code'), 'paws10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByTestId('cart-code-applied')).toHaveTextContent('PAWS10');
    expect(body).toEqual({ code: 'paws10' });
    expect(spy).toHaveBeenCalledWith({ name: 'promo_applied', code: 'paws10' });
    expect(screen.queryByLabelText('Discount code')).not.toBeInTheDocument();
  });

  it('shows the API message under the input when the code is refused', async () => {
    const spy = vi.spyOn(tracking, 'track');
    serveCart(cartWith({}));
    server.use(
      http.post(`${API}/cart/code`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Add €15.00 more to use this code',
              details: {
                formErrors: [],
                fieldErrors: { code: ['Add €15.00 more to use this code'] },
              },
            },
          },
          { status: 400 },
        ),
      ),
    );
    renderApp('/cart');
    const user = userEvent.setup();
    const input = await screen.findByLabelText('Discount code');
    await user.type(input, 'PAWS10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('Add €15.00 more to use this code')).toBeVisible();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(spy).toHaveBeenCalledWith({ name: 'code_failed', code: 'PAWS10' });
  });

  it('rejects an empty code without a request', async () => {
    serveCart(cartWith({}));
    let calls = 0;
    server.use(
      http.post(`${API}/cart/code`, () => {
        calls += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    renderApp('/cart');
    await userEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('Enter a code')).toBeVisible();
    expect(calls).toBe(0);
  });

  it('removes an applied code', async () => {
    let current = cartWith({ code: 'PAWS10' });
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json({ data: current })),
      http.delete(`${API}/cart/code`, () => {
        current = cartWith({});
        return HttpResponse.json({ data: current });
      }),
    );
    renderApp('/cart');
    await userEvent.click(await screen.findByRole('button', { name: 'Remove code PAWS10' }));
    expect(await screen.findByLabelText('Discount code')).toBeVisible();
    await waitFor(() => expect(screen.queryByTestId('cart-code-applied')).not.toBeInTheDocument());
  });

  it('shows the not-stackable notice next to the applied code', async () => {
    serveCart(
      cartWith({
        code: 'PAWS10',
        adjustments: [
          {
            type: 'bulk_tier',
            refId: 't1',
            label: '10% bulk discount',
            cents: 900,
            scope: 'lines',
          },
        ],
        notices: [{ key: 'code_not_stackable', refId: 'c1' }],
      }),
    );
    renderApp('/cart');
    expect(await screen.findByTestId('cart-code-notice')).toHaveTextContent(
      'Your 10% bulk discount saves more than PAWS10, so we used that.',
    );
  });
});

describe('notice sentences', () => {
  const pricing = makeCartPricing({ code: 'SAVE' });
  const cases: [string, number | undefined, string][] = [
    ['code_unknown', undefined, 'We could not find the code SAVE.'],
    ['code_used_up', undefined, 'SAVE has been used up.'],
    ['code_already_used', undefined, 'You have already used SAVE.'],
    ['code_not_started', undefined, 'SAVE is not active yet.'],
    ['code_expired', undefined, 'SAVE has expired.'],
    ['code_min_spend', 1500, 'Add €15.00 more to use SAVE.'],
    [
      'code_no_eligible_items',
      undefined,
      'SAVE does not apply to anything in your cart right now.',
    ],
    ['code_first_order_only', undefined, 'SAVE is for first orders only.'],
    ['code_not_stackable', undefined, 'Your bulk discount saves more than SAVE, so we used that.'],
    [
      'credit_capped',
      undefined,
      'Your credit was capped so you still pay at least 0.50 (the card minimum).',
    ],
  ];
  const lookup = lookupFor('en-IE');
  const t: TFunction = (key, params) => lookup.t(key, params);
  const money = (cents: number) => formatMoney(cents, 'EUR', 'en-IE');
  it.each(cases)('maps %s to a sentence', (key, cents, sentence) => {
    expect(noticeSentence({ key, ...(cents !== undefined && { cents }) }, pricing, money, t)).toBe(
      sentence,
    );
  });

  it('skips a key this build does not know', () => {
    expect(noticeSentence({ key: 'something_new' }, pricing, money, t)).toBeNull();
  });
});

describe('sale lines and the Omnibus reference', () => {
  const line = (over: Record<string, unknown>) => ({
    variantId: 'v1',
    unitCents: 899,
    priceSource: 'sale' as const,
    lineDiscountCents: 0,
    referenceCents: 1099,
    ...over,
  });

  it('shows the sale unit price and the lowest 30-day price on a sale line only', async () => {
    serveCart({
      ...makeCart([
        makeCartItem({ quantity: 2, lineTotalCents: 2198 }),
        makeCartItem({ id: 'l2', variantId: 'v2', productName: 'Squeaky Ball', quantity: 1 }),
      ]),
      pricing: makeCartPricing({
        lines: [
          line({}),
          line({ variantId: 'v2', unitCents: 1099, priceSource: 'base', referenceCents: null }),
        ],
      }),
    });
    renderApp('/cart');
    const lines = await screen.findAllByTestId('cart-line');
    const sale = within(lines[0]!);
    expect(sale.getByTestId('sale-price')).toHaveTextContent('€8.99');
    expect(sale.getByTestId('sale-omnibus')).toHaveTextContent(
      'Lowest price in the last 30 days: €10.99',
    );
    // The line total follows the sale price (2 x 8.99), not the regular one.
    expect(sale.getByTestId('cart-line-total')).toHaveTextContent('€17.98');
    const regular = within(lines[1]!);
    expect(regular.queryByTestId('sale-omnibus')).not.toBeInTheDocument();
    expect(regular.getByText('€10.99 each')).toBeInTheDocument();
  });

  it('shows no Omnibus text for a sale line without price history', async () => {
    serveCart({
      ...makeCart([makeCartItem()]),
      pricing: makeCartPricing({ lines: [line({ referenceCents: null })] }),
    });
    renderApp('/cart');
    expect(await screen.findByTestId('sale-price')).toHaveTextContent('€8.99');
    expect(screen.queryByTestId('sale-omnibus')).not.toBeInTheDocument();
  });

  it('shows the member price with a label, and falls back to the item price without a pricing entry', async () => {
    serveCart({
      ...makeCart([
        makeCartItem({ quantity: 2, lineTotalCents: 2198 }),
        makeCartItem({
          id: 'l2',
          variantId: 'v2',
          productName: 'Squeaky Ball',
          unitPriceCents: 500,
          lineTotalCents: 500,
        }),
      ]),
      pricing: makeCartPricing({
        lines: [line({ priceSource: 'member', unitCents: 989, referenceCents: null })],
      }),
    });
    renderApp('/cart');
    const lines = await screen.findAllByTestId('cart-line');
    const member = within(lines[0]!);
    expect(member.getByText(/€9.89 each/)).toBeInTheDocument();
    expect(member.getByTestId('cart-line-member')).toHaveTextContent('Member price');
    expect(member.getByTestId('cart-line-total')).toHaveTextContent('€19.78');
    expect(member.queryByTestId('sale-omnibus')).not.toBeInTheDocument();
    // No pricing entry for v2: the item's own price and total.
    const plain = within(lines[1]!);
    expect(plain.getByText('€5.00 each')).toBeInTheDocument();
    expect(plain.getByTestId('cart-line-total')).toHaveTextContent('€5.00');
    expect(plain.queryByTestId('cart-line-member')).not.toBeInTheDocument();
  });
});
