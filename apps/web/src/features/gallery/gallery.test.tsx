import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import * as tracking from '../../lib/track';
import { renderApp, renderWithProviders } from '../../test/render';
import { API, server } from '../../test/server';
import { getHomeSlots } from '../home/slots';

import { ShoppableGallery } from './ShoppableGallery';

const product = (over: object = {}) => ({
  id: 'p1',
  slug: 'rope-tug',
  name: 'Rope Tug',
  imageUrl: '/products/dog-toys/rope-tug-1.webp',
  priceCents: 1099,
  currency: 'EUR',
  variantId: 'v1',
  inStock: true,
  ...over,
});
const photo = (n: number, over: object = {}) => ({
  id: `g${n}`,
  path: `/reviews/p${n}.webp`,
  caption: `Biscuit with his tug ${n}`,
  petName: 'Biscuit',
  products: [product()],
  ...over,
});
const serve = (photos: object[], seen?: string[]) =>
  server.use(
    http.get(`${API}/gallery`, ({ request }) => {
      seen?.push(new URL(request.url).search);
      return HttpResponse.json({ data: photos });
    }),
  );

describe('shoppable gallery', () => {
  it('renders nothing at all when there are no photos', async () => {
    serve([]);
    const { container } = renderWithProviders(
      <MemoryRouter>
        <ShoppableGallery />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.querySelector('section')).toBeNull());
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('shows a grid of photos, each a button with a name', async () => {
    serve([photo(1), photo(2)]);
    renderWithProviders(
      <MemoryRouter>
        <ShoppableGallery />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: '#RealPawsomePets' })).toBeInTheDocument();
    const items = screen.getAllByTestId('gallery-item');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAccessibleName('Open photo: Biscuit with his tug 1');
  });

  it('opens a modal with the photo, caption and products, and adds a product to the cart', async () => {
    const added: unknown[] = [];
    serve([photo(1)]);
    server.use(
      http.post(`${API}/cart/items`, async ({ request }) => {
        added.push(await request.json());
        return HttpResponse.json({ data: { items: [] } }, { status: 200 });
      }),
    );
    const spy = vi.spyOn(tracking, 'track').mockImplementation(() => undefined);
    renderWithProviders(
      <MemoryRouter>
        <ShoppableGallery />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByTestId('gallery-item'));
    const modal = await screen.findByTestId('gallery-modal');
    expect(
      within(modal).getByText('Biscuit with his tug 1', { selector: 'p' }),
    ).toBeInTheDocument();
    expect(within(modal).getByText('Pictured: Biscuit')).toBeInTheDocument();
    expect(within(modal).getByRole('link', { name: 'Rope Tug' })).toHaveAttribute(
      'href',
      '/products/rope-tug',
    );
    expect(within(modal).getByTestId('price')).toHaveTextContent('€10.99');
    expect(spy).toHaveBeenCalledWith({ name: 'gallery_open', photoId: 'g1' });
    await userEvent.click(within(modal).getByRole('button', { name: 'Add Rope Tug to cart' }));
    await waitFor(() => expect(added).toEqual([{ variantId: 'v1', quantity: 1 }]));
    spy.mockRestore();
  });

  it('says Sold out instead of a button when a product cannot be bought', async () => {
    serve([photo(1, { products: [product({ variantId: null, inStock: false })] })]);
    renderWithProviders(
      <MemoryRouter>
        <ShoppableGallery />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByTestId('gallery-item'));
    const modal = await screen.findByTestId('gallery-modal');
    expect(within(modal).getByText('Sold out')).toBeInTheDocument();
    expect(within(modal).queryByRole('button', { name: /Add .* to cart/ })).not.toBeInTheDocument();
  });

  it('handles a photo with no linked products', async () => {
    serve([photo(1, { products: [] })]);
    renderWithProviders(
      <MemoryRouter>
        <ShoppableGallery />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByTestId('gallery-item'));
    expect(await screen.findByText('No products are linked to this photo.')).toBeInTheDocument();
  });

  it('asks the API only for photos of this product on a product page', async () => {
    const seen: string[] = [];
    serve([photo(1)], seen);
    renderApp('/products/rope-tug');
    expect(
      await screen.findByRole('heading', { name: 'Customers with this product' }),
    ).toBeInTheDocument();
    expect(seen.some((s) => s.startsWith('?productId='))).toBe(true);
  });
});

describe('gallery layout', () => {
  it('features the first photo and shows 9, then 8 more per click', async () => {
    serve(Array.from({ length: 20 }, (_, i) => photo(i + 1)));
    renderWithProviders(
      <MemoryRouter>
        <ShoppableGallery />
      </MemoryRouter>,
    );
    expect(await screen.findAllByTestId('gallery-item')).toHaveLength(9);
    expect(screen.getAllByTestId('gallery-item')[0]!.parentElement).toHaveClass('col-span-2');
    await userEvent.click(screen.getByRole('button', { name: 'Show more photos' }));
    expect(screen.getAllByTestId('gallery-item')).toHaveLength(17);
    await userEvent.click(screen.getByRole('button', { name: 'Show more photos' }));
    expect(screen.getAllByTestId('gallery-item')).toHaveLength(20);
    expect(screen.queryByRole('button', { name: 'Show more photos' })).not.toBeInTheDocument();
  });

  it('captions a tile with the pet and the first product', async () => {
    serve([photo(1)]);
    renderWithProviders(
      <MemoryRouter>
        <ShoppableGallery />
      </MemoryRouter>,
    );
    const tile = await screen.findByTestId('gallery-item');
    expect(tile).toHaveTextContent('Biscuit');
    expect(tile).toHaveTextContent('with Rope Tug');
  });
});

describe('gallery on the homepage', () => {
  it('is registered as the customer-gallery slot and shows after the testimonials', async () => {
    serve([photo(1)]);
    renderApp('/');
    expect(getHomeSlots().map((slot) => slot.id)).toContain('customer-gallery');
    expect(await screen.findByRole('heading', { name: '#RealPawsomePets' })).toBeInTheDocument();
  });
});
