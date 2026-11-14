import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { makeCard, makeCart, makeCartItem, makeProduct, makeVariant } from '../../test/fixtures';
import { TestProviders } from '../../test/render';
import { API, server } from '../../test/server';

import { ProductCard } from './ProductCard';

const renderCard = (card = makeCard()) =>
  render(
    <MemoryRouter>
      <ul>
        <ProductCard product={card} />
      </ul>
    </MemoryRouter>,
    { wrapper: TestProviders },
  );

function captureAdds() {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${API}/cart/items`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({ data: makeCart([makeCartItem()]) });
    }),
  );
  return bodies;
}

describe('ProductCard: quick add', () => {
  it('adds a one-variant product straight away and shows "Added"', async () => {
    const only = makeVariant({ id: 'solo', sku: 'BALL-1', options: {}, isDefault: true });
    server.use(
      http.get(`${API}/products/:slug`, () =>
        HttpResponse.json({ data: makeProduct({ optionKeys: [], variants: [only] }) }),
      ),
    );
    const bodies = captureAdds();
    renderCard();

    const button = screen.getByRole('button', { name: 'Add to cart: Rope Tug' });
    await userEvent.click(button);

    expect(await screen.findByText('Added')).toBeInTheDocument();
    expect(bodies).toEqual([{ variantId: 'solo', quantity: 1 }]);
    expect(screen.queryByTestId('quick-add')).not.toBeInTheDocument();
    // The button is outside the product link (no interactive content inside a link).
    expect(button.closest('a')).toBeNull();
  });

  it('opens the option sheet for a product with variants and adds the chosen one', async () => {
    const bodies = captureAdds();
    renderCard();

    await userEvent.click(screen.getByRole('button', { name: 'Add to cart: Rope Tug' }));
    const sheet = await screen.findByTestId('quick-add');
    expect(bodies).toEqual([]);

    // The default variant (red, small) is preselected; choose large.
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Large' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Add to cart' }));

    await waitFor(() => expect(bodies).toEqual([{ variantId: 'v2', quantity: 1 }]));
    await waitFor(() => expect(screen.queryByTestId('quick-add')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Add to cart: Rope Tug' })).toHaveFocus();
  });

  it('offers a back-in-stock email instead of adding when the product is sold out', async () => {
    server.use(
      http.get(`${API}/products/:slug`, () =>
        HttpResponse.json({
          data: makeProduct({
            inStock: false,
            optionKeys: [],
            variants: [makeVariant({ options: {}, available: false, isDefault: true })],
          }),
        }),
      ),
    );
    const bodies = captureAdds();
    renderCard(makeCard({ inStock: false }));

    await userEvent.click(screen.getByRole('button', { name: 'Notify me when Rope Tug is back' }));
    const sheet = await screen.findByTestId('quick-add');
    expect(within(sheet).getByRole('textbox')).toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument();
    expect(bodies).toEqual([]);
  });
});
