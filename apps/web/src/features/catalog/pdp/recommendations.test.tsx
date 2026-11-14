import type { RecommendationItem } from '@store/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { recordRecentlyViewed } from '../../../lib/recently-viewed';
import { makeCard, makeCart, makeCartItem, makeProduct, makeVariant } from '../../../test/fixtures';
import { renderApp } from '../../../test/render';
import { API, server } from '../../../test/server';

afterEach(() => window.localStorage.clear());

const item = (
  n: number,
  over: Partial<RecommendationItem['variant']> = {},
): RecommendationItem => ({
  card: makeCard({ id: `p${n}`, slug: `item-${n}`, name: `Item ${n}` }),
  variant: {
    id: `rv${n}`,
    sku: `RV-${n}`,
    name: `Pack ${n}`,
    priceCents: 500 * n,
    saleCents: null,
    currency: 'EUR',
    ...over,
  },
});

const recs = (
  boughtTogether: RecommendationItem[],
  related = [makeCard({ id: 'r1', slug: 'rel-1', name: 'Related One' })],
) =>
  http.get(`${API}/products/rope-tug/recommendations`, () =>
    HttpResponse.json({ data: { boughtTogether, related } }),
  );

describe('Frequently bought together', () => {
  it('lists the page item and the suggestions with a live total of what is checked', async () => {
    server.use(recs([item(1), item(2)]));
    renderApp('/products/rope-tug');
    const block = await screen.findByTestId('bought-together');
    // The page's own default variant costs 10.99; suggestions 5.00 and 10.00.
    expect(within(block).getByTestId('bought-together-total')).toHaveTextContent('€25.99');
    expect(within(block).getAllByTestId('bought-together-option')).toHaveLength(2);
    await userEvent.click(within(block).getByRole('checkbox', { name: /Item 2/ }));
    expect(within(block).getByTestId('bought-together-total')).toHaveTextContent('€15.99');
    expect(within(block).getByTestId('bought-together-add')).toHaveTextContent(
      'Add 2 items to cart',
    );

    // The page's own item can be left out too, and nothing in the block navigates away.
    await userEvent.click(within(block).getByRole('checkbox', { name: /Rope Tug/ }));
    expect(within(block).getByTestId('bought-together-total')).toHaveTextContent('€5.00');
    expect(within(block).getByTestId('bought-together-add')).toHaveTextContent(
      'Add 1 item to cart',
    );
    expect(within(block).queryByRole('link')).toBeNull();
  });

  it('uses a running sale price for a suggestion, never a member price', async () => {
    server.use(recs([item(2, { saleCents: 800 })]));
    renderApp('/products/rope-tug');
    const block = await screen.findByTestId('bought-together');
    expect(within(block).getByTestId('bought-together-total')).toHaveTextContent('€18.99');
  });

  it('adds the chosen items in one request and says so', async () => {
    let sent: unknown;
    server.use(
      recs([item(1), item(2)]),
      http.post(`${API}/cart/items/bulk`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: makeCart([makeCartItem()]) });
      }),
    );
    renderApp('/products/rope-tug');
    const block = await screen.findByTestId('bought-together');
    await userEvent.click(within(block).getByRole('checkbox', { name: /Item 1/ }));
    await userEvent.click(within(block).getByTestId('bought-together-add'));
    await waitFor(() => expect(sent).toBeTruthy());
    expect(sent).toEqual({
      items: [
        { variantId: 'v1', quantity: 1 },
        { variantId: 'rv2', quantity: 1 },
      ],
    });
    expect(await screen.findByText('Added 2 items to your cart')).toBeInTheDocument();
    expect(within(block).getByTestId('bought-together-add')).toHaveTextContent('Added to cart');
  });

  it('shows what went wrong line by line when the server refuses the whole add', async () => {
    server.use(
      recs([item(1), item(2)]),
      http.post(`${API}/cart/items/bulk`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLICT',
              message: 'Some items could not be added',
              details: {
                failures: [
                  {
                    variantId: 'rv1',
                    code: 'OUT_OF_STOCK',
                    message: 'This item is sold out',
                    maxQty: 0,
                  },
                  { variantId: 'rv2', code: 'TRIAL_LIMIT', message: 'One per customer' },
                ],
              },
            },
          },
          { status: 409 },
        ),
      ),
    );
    renderApp('/products/rope-tug');
    const block = await screen.findByTestId('bought-together');
    await userEvent.click(within(block).getByTestId('bought-together-add'));
    const alert = await within(block).findByTestId('bought-together-errors');
    expect(alert).toHaveTextContent('Item 1: This item is sold out');
    expect(alert).toHaveTextContent('Item 2: One per customer');
  });

  it('leaves the block out when there are no suggestions, and leaves out the page item when it is sold out', async () => {
    renderApp('/products/rope-tug');
    await screen.findByRole('tab', { name: 'Description' });
    expect(screen.queryByTestId('bought-together')).toBeNull();
  });

  it('does not offer the page item itself when its variant is sold out', async () => {
    server.use(
      recs([item(1)]),
      http.get(`${API}/products/rope-tug`, () =>
        HttpResponse.json({
          data: makeProduct({ variants: [makeVariant({ available: false, isDefault: true })] }),
        }),
      ),
    );
    renderApp('/products/rope-tug');
    const block = await screen.findByTestId('bought-together');
    expect(block).toHaveTextContent('Not available');
    expect(within(block).getByRole('checkbox', { name: /Rope Tug/ })).toBeDisabled();
    expect(within(block).getByTestId('bought-together-total')).toHaveTextContent('€5.00');
    expect(within(block).getByTestId('bought-together-add')).toHaveTextContent(
      'Add 1 item to cart',
    );
  });
});

describe('related and recently viewed on the product page', () => {
  it('shows the related strip', async () => {
    server.use(recs([]));
    renderApp('/products/rope-tug');
    const strip = await screen.findByTestId('related');
    expect(within(strip).getByText('Related One')).toBeInTheDocument();
  });

  it('records the visit, and shows earlier visits (not the page itself) after a reload', async () => {
    const other = '00000000-0000-4000-8000-0000000000aa';
    recordRecentlyViewed(other);
    let asked = '';
    server.use(
      http.get(`${API}/products/by-ids`, ({ request }) => {
        asked = new URL(request.url).searchParams.get('ids') ?? '';
        return HttpResponse.json({
          data: [makeCard({ id: other, slug: 'seen', name: 'Seen Before' })],
        });
      }),
    );
    renderApp('/products/rope-tug');
    const strip = await screen.findByTestId('recently-viewed');
    expect(within(strip).getByText('Seen Before')).toBeInTheDocument();
    expect(asked).toBe(other);
    // The page recorded its own id, first in the list.
    expect(window.localStorage.getItem('pawsome.recently-viewed')).toContain('p1');
  });

  it('shows no strip for a first-time visitor and asks the API for nothing', async () => {
    let called = false;
    server.use(
      http.get(`${API}/products/by-ids`, () => {
        called = true;
        return HttpResponse.json({ data: [] });
      }),
    );
    renderApp('/products/rope-tug');
    await screen.findByRole('tab', { name: 'Description' });
    expect(screen.queryByTestId('recently-viewed')).toBeNull();
    expect(called).toBe(false);
  });
});

describe('cart page and mini cart', () => {
  it('shows recently viewed under the cart page lines', async () => {
    const other = '00000000-0000-4000-8000-0000000000bb';
    recordRecentlyViewed(other);
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json({ data: makeCart([makeCartItem()]) })),
      http.get(`${API}/products/by-ids`, () =>
        HttpResponse.json({ data: [makeCard({ id: other, slug: 'seen', name: 'Seen Before' })] }),
      ),
    );
    renderApp('/cart');
    const strip = await screen.findByTestId('recently-viewed');
    expect(within(strip).getByText('Seen Before')).toBeInTheDocument();
  });

  it('suggests at most two things you might need, never what is already in the cart', async () => {
    server.use(
      http.get(`${API}/cart`, () =>
        HttpResponse.json({ data: makeCart([makeCartItem({ productId: 'in-cart' })]) }),
      ),
      http.get(`${API}/products/rope-tug/recommendations`, () =>
        HttpResponse.json({
          data: {
            boughtTogether: [
              item(1),
              { ...item(5), card: makeCard({ id: 'in-cart', name: 'Rope Tug' }) },
            ],
            related: [
              makeCard({ id: 'r1', slug: 'rel-1', name: 'Related One' }),
              makeCard({ id: 'r2', name: 'Related Two' }),
            ],
          },
        }),
      ),
    );
    renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: /cart/i }));
    const block = await screen.findByTestId('you-might-need');
    // Item 1 (one-click add) and Related One (a link); the cart's own product and the rest are out.
    expect(within(block).getAllByRole('listitem')).toHaveLength(2);
    expect(within(block).getByText('Item 1')).toBeInTheDocument();
    expect(within(block).getByRole('button', { name: 'Add Item 1' })).toBeInTheDocument();
    expect(within(block).getByRole('link', { name: 'Related One' })).toHaveAttribute(
      'href',
      '/products/rel-1',
    );
    expect(within(block).queryByText('Related Two')).toBeNull();
  });

  it('adds a suggestion straight from the drawer', async () => {
    let sent: unknown;
    server.use(
      http.get(`${API}/cart`, () =>
        HttpResponse.json({ data: makeCart([makeCartItem({ productId: 'in-cart' })]) }),
      ),
      http.get(`${API}/products/rope-tug/recommendations`, () =>
        HttpResponse.json({ data: { boughtTogether: [item(1)], related: [] } }),
      ),
      http.post(`${API}/cart/items`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: makeCart([makeCartItem()]) });
      }),
    );
    renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: /cart/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'Add Item 1' }));
    await waitFor(() => expect(sent).toEqual({ variantId: 'rv1', quantity: 1 }));
  });
});
