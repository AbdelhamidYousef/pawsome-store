import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearHomeSlots, registerHomeSlot } from '../features/home/slots';
import * as tracking from '../lib/track';
import { renderApp } from '../test/render';
import { server, API } from '../test/server';

const sections = () =>
  [...document.querySelectorAll('[data-home-section]')].map((n) =>
    n.getAttribute('data-home-section'),
  );

afterEach(() => {
  clearHomeSlots();
});

describe('home page', () => {
  it('shows the hero, pet tiles with counts, bestsellers, guides and testimonials', async () => {
    const spy = vi.spyOn(tracking, 'track');
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Happy tails start here');
    expect(await screen.findByTestId('hero-carousel')).toBeInTheDocument();

    const tiles = within(screen.getByTestId('pet-tiles'));
    expect(tiles.getAllByRole('link')).toHaveLength(6);
    expect(await tiles.findByText('10 products')).toBeInTheDocument();

    const cards = await screen.findAllByTestId('product-card');
    expect(cards[0]).toHaveAttribute('href', '/products/rope-tug');
    expect(await screen.findByTestId('guides-teaser')).toBeInTheDocument();
    expect(await screen.findByTestId('rating-summary')).toHaveTextContent('4.8 out of 5');
    expect(spy).toHaveBeenCalledWith({ name: 'view_home' });
  });

  it('keeps the carousel box in place while the page loads', () => {
    renderApp('/');
    expect(screen.getByTestId('hero-skeleton')).toBeInTheDocument();
  });

  it('leaves the free-delivery promise to the announcement bar, not a band in the page', async () => {
    renderApp('/');
    await screen.findByTestId('hero-carousel');
    expect(screen.queryByTestId('promo-tile')).toBeNull();
    expect(screen.getByTestId('announcement-bar')).toHaveTextContent(
      'Free delivery on orders over €49',
    );
  });

  it('leaves no empty block for missing optional sections', async () => {
    renderApp('/');
    await screen.findByTestId('hero-carousel');
    await screen.findByTestId('guides-teaser');
    await screen.findByTestId('rating-summary');
    // No registered slots (cleared here) and every built-in section has content: nothing is an
    // empty wrapper. (`Section` carries `empty:hidden` for the day one is.)
    const all = [...document.querySelectorAll('[data-home-section]')];
    expect(all.filter((n) => n.childNodes.length === 0)).toEqual([]);
    expect(all[0]).toHaveClass('empty:hidden');
  });

  it('renders registered slots in the fixed order: seasonal before guides, the rest after', async () => {
    registerHomeSlot({ id: 'newsletter', render: () => createElement('p', null, 'News') });
    registerHomeSlot({ id: 'seasonal', render: () => createElement('p', null, 'Season') });
    renderApp('/');
    await screen.findByTestId('hero-carousel');
    expect(sections()).toEqual([
      'shop-by-pet',
      'bestsellers',
      'seasonal',
      'guides',
      'testimonials',
      'newsletter',
    ]);
  });

  it('keeps the page usable when the home data fails to load', async () => {
    server.use(http.get(`${API}/home`, () => HttpResponse.json({}, { status: 500 })));
    renderApp('/');
    expect(await within(screen.getByRole('main')).findByRole('alert')).toHaveTextContent(
      'could not load our bestsellers',
    );
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
