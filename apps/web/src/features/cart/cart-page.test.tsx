import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WebCart } from '../../api/cart';
import * as tracking from '../../lib/track';
import { makeCart, makeCartItem, makeQuote } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { API, server } from '../../test/server';

afterEach(() => {
  vi.restoreAllMocks();
});

const tug = makeCartItem({
  id: 'l1',
  variantId: 'v1',
  productName: 'Rope Tug',
  unitPriceCents: 1099,
});
const ball = makeCartItem({
  id: 'l2',
  variantId: 'v2',
  productId: 'p2',
  productName: 'Bouncy Ball',
  productSlug: 'bouncy-ball',
  unitPriceCents: 500,
  quantity: 2,
  lineTotalCents: 1000,
});

function serveCart(cart: WebCart) {
  server.use(http.get(`${API}/cart`, () => HttpResponse.json({ data: cart })));
}

describe('cart page', () => {
  it('lists the lines with prices, the subtotal and the free-shipping hint', async () => {
    serveCart(makeCart([tug, ball]));
    renderApp('/cart');
    const lines = await screen.findAllByTestId('cart-line');
    expect(lines).toHaveLength(2);
    expect(within(lines[0]!).getByRole('link', { name: 'Rope Tug' })).toHaveAttribute(
      'href',
      '/products/rope-tug',
    );
    expect(within(lines[1]!).getByTestId('cart-line-total')).toHaveTextContent('€10.00');
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('€20.99');
    expect(await screen.findByTestId('cart-shipping-hint')).toHaveTextContent(
      'Add €28.01 more for free standard shipping.',
    );
    expect(screen.getByTestId('cart-checkout')).toHaveAttribute('href', '/checkout');
  });

  it('reads the free-shipping threshold from the shipping quotes, not a constant', async () => {
    serveCart(makeCart([tug, ball]));
    server.use(
      http.get(`${API}/checkout/shipping-methods`, () =>
        HttpResponse.json({ data: [makeQuote({ freeOverCents: 3000 })] }),
      ),
    );
    renderApp('/cart');
    expect(await screen.findByText('Add €9.01 more for free standard shipping.')).toBeVisible();
  });

  // The API refuses a country the store does not ship to (it used to always ask for DE).
  it('asks for the hint in a country the store ships to', async () => {
    serveCart(makeCart([tug, ball]));
    const asked: (string | null)[] = [];
    server.use(
      http.get(`${API}/checkout/shipping-methods`, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('country'));
        return HttpResponse.json({ data: [makeQuote({ freeOverCents: 3000 })] });
      }),
    );
    renderApp('/uk-en/cart');
    await screen.findAllByTestId('cart-line');
    await waitFor(() => expect(asked).toContain('GB'));
    expect(asked).not.toContain('DE');
  });

  it('hides the hint when no shipping method is ever free', async () => {
    serveCart(makeCart([tug, ball]));
    server.use(
      http.get(`${API}/checkout/shipping-methods`, () =>
        HttpResponse.json({ data: [makeQuote({ freeOverCents: null })] }),
      ),
    );
    renderApp('/cart');
    await screen.findAllByTestId('cart-line');
    expect(screen.queryByTestId('cart-shipping-hint')).not.toBeInTheDocument();
  });

  it('shows an empty state with a way back to the shop', async () => {
    renderApp('/cart');
    const empty = await screen.findByTestId('cart-empty');
    expect(within(empty).getByRole('link', { name: 'Continue shopping' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.queryByTestId('cart-checkout')).not.toBeInTheDocument();
  });

  it('updates the quantity at once (optimistic) and settles on the server cart', async () => {
    serveCart(makeCart([tug]));
    let release: () => void = () => undefined;
    server.use(
      http.patch(`${API}/cart/items/:id`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({
          data: makeCart([{ ...tug, quantity: 2, lineTotalCents: 2198 }]),
        });
      }),
    );
    renderApp('/cart');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Increase quantity of Rope Tug' }),
    );
    // The request is still pending, yet the screen already shows the new numbers.
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('€21.98');
    expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
    release();
    await waitFor(() => expect(screen.getByLabelText('Quantity of Rope Tug')).toHaveValue(2));
  });

  it('rolls back and explains when the server refuses a quantity (409 OUT_OF_STOCK)', async () => {
    serveCart(makeCart([tug]));
    server.use(
      http.patch(`${API}/cart/items/:id`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'OUT_OF_STOCK',
              message: 'Not enough stock',
              details: { variantId: 'v1', maxQty: 1, inCart: 1, requested: 2 },
            },
          },
          { status: 409 },
        ),
      ),
    );
    renderApp('/cart');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Increase quantity of Rope Tug' }),
    );
    expect(
      await screen.findByText('You already have all 1 we can offer in your cart.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Quantity of Rope Tug')).toHaveValue(1));
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('€10.99');
  });

  it('applies a typed quantity on blur, not on every keystroke', async () => {
    serveCart(makeCart([tug]));
    const sent: unknown[] = [];
    server.use(
      http.patch(`${API}/cart/items/:id`, async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json({
          data: makeCart([{ ...tug, quantity: 7, lineTotalCents: 7693 }]),
        });
      }),
    );
    renderApp('/cart');
    const box = await screen.findByLabelText('Quantity of Rope Tug');
    await userEvent.clear(box);
    await userEvent.type(box, '7');
    expect(sent).toHaveLength(0);
    await userEvent.tab();
    await waitFor(() => expect(sent).toEqual([{ quantity: 7 }]));
  });

  it('removes a line, tracks it, and ends on the empty state', async () => {
    const spy = vi.spyOn(tracking, 'track').mockImplementation(() => undefined);
    let cart = makeCart([tug]);
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json({ data: cart })),
      http.delete(`${API}/cart/items/:id`, () => {
        cart = makeCart([]);
        return HttpResponse.json({ data: cart });
      }),
    );
    renderApp('/cart');
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Rope Tug' }));
    expect(await screen.findByTestId('cart-empty')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'remove_from_cart', quantity: 1 }),
    );
  });

  it('greys out a sold-out line, leaves it out of the total and blocks checkout with a reason', async () => {
    serveCart(
      makeCart([
        tug,
        makeCartItem({
          id: 'l3',
          variantId: 'v3',
          productName: 'Gone Toy',
          available: 0,
          maxQty: 0,
        }),
      ]),
    );
    renderApp('/cart');
    const lines = await screen.findAllByTestId('cart-line');
    expect(lines[1]).toHaveAttribute('data-sold-out');
    expect(within(lines[1]!).getByText(/Not included in your total/)).toBeInTheDocument();
    expect(within(lines[1]!).getByRole('spinbutton')).toBeDisabled();
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('€10.99');
    const checkout = screen.getByRole('button', { name: 'Proceed to checkout' });
    expect(checkout).toBeDisabled();
    expect(checkout).toHaveAccessibleDescription('Remove the sold-out items to continue.');
  });

  it('shows quantity-reduced and price-changed notices inline, and keeps them after a refetch', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/cart`, () => {
        calls += 1;
        // The API reports warnings once; the second read is calm.
        return HttpResponse.json({
          data: makeCart(
            [tug],
            calls === 1
              ? [
                  {
                    code: 'QTY_REDUCED',
                    variantId: 'v1',
                    productName: 'Rope Tug',
                    variantName: 'Small',
                    previousQuantity: 5,
                    quantity: 3,
                  },
                  {
                    code: 'PRICE_CHANGED',
                    variantId: 'v1',
                    productName: 'Rope Tug',
                    variantName: 'Small',
                    previousUnitPriceCents: 999,
                    unitPriceCents: 1099,
                  },
                ]
              : [],
          ),
        });
      }),
    );
    renderApp('/cart');
    const line = await screen.findByTestId('cart-line');
    expect(
      await within(line).findByText('Only 3 available, so we lowered the quantity from 5.'),
    ).toBeInTheDocument();
    expect(within(line).getByText('The price changed from €9.99 to €10.99.')).toBeInTheDocument();
    // Dismiss one.
    await userEvent.click(within(line).getAllByRole('button', { name: /^OK/ })[0]!);
    expect(within(line).queryByText(/lowered the quantity/)).not.toBeInTheDocument();
    expect(within(line).getByText(/The price changed/)).toBeInTheDocument();
  });

  it('survives a warning code it does not know and a removed variant', async () => {
    serveCart(
      makeCart(
        [tug],
        [
          {
            code: 'SHINY_NEW_CODE',
            variantId: 'v9',
            productName: 'Mystery',
            variantName: 'One',
          },
          {
            code: 'VARIANT_UNAVAILABLE',
            variantId: 'v8',
            productName: 'Old Bed',
            variantName: 'Large',
          },
        ],
      ),
    );
    renderApp('/cart');
    const banner = await screen.findByTestId('cart-warnings');
    expect(within(banner).getByText('Something changed for Mystery (One).')).toBeInTheDocument();
    expect(
      within(banner).getByText(/Old Bed \(Large\) is no longer available and was removed/),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('cart-line')).toHaveLength(1);
  });

  it('clamps a typed quantity to the most available (99 at most)', async () => {
    serveCart(makeCart([makeCartItem({ quantity: 1, maxQty: 99, available: 150 })]));
    const sent: unknown[] = [];
    server.use(
      http.patch(`${API}/cart/items/:id`, async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json({
          data: makeCart([
            makeCartItem({ quantity: 99, maxQty: 99, available: 150, lineTotalCents: 108801 }),
          ]),
        });
      }),
    );
    renderApp('/cart');
    const box = await screen.findByLabelText('Quantity of Rope Tug');
    await userEvent.clear(box);
    await userEvent.type(box, '150');
    await userEvent.tab();
    await waitFor(() => expect(sent).toEqual([{ quantity: 99 }]));
    expect(await screen.findByText('Maximum available')).toBeInTheDocument();
  });

  it('states the maximum when the line is at the most available', async () => {
    serveCart(makeCart([makeCartItem({ quantity: 3, maxQty: 3, lineTotalCents: 3297 })]));
    renderApp('/cart');
    expect(await screen.findByText('Maximum available')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase quantity of Rope Tug' })).toBeDisabled();
  });
});

describe('mini cart', () => {
  it('opens from the header icon with the lines, subtotal and links', async () => {
    serveCart(makeCart([tug, ball]));
    renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Cart, 3 items' }));
    const mini = await screen.findByTestId('mini-cart');
    expect(within(mini).getAllByTestId('cart-line')).toHaveLength(2);
    expect(within(mini).getByTestId('cart-subtotal')).toHaveTextContent('€20.99');
    expect(within(mini).getByRole('link', { name: 'View cart' })).toHaveAttribute('href', '/cart');
  });

  it('closes when you follow View cart', async () => {
    serveCart(makeCart([tug]));
    const router = renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Cart, 1 item' }));
    await userEvent.click(await screen.findByRole('link', { name: 'View cart' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/cart'));
    expect(screen.queryByTestId('mini-cart')).not.toBeInTheDocument();
  });

  it('is replaced by a plain link on the cart page itself', async () => {
    serveCart(makeCart([tug]));
    renderApp('/cart');
    expect(await screen.findByRole('link', { name: 'Cart, 1 item' })).toHaveAttribute(
      'href',
      '/cart',
    );
  });
});
