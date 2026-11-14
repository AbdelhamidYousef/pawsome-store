import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { makeCard } from '../../test/fixtures';
import { TestProviders } from '../../test/render';

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

const swatch = (color: string, extra: Partial<{ url: string }> = {}) => ({
  color,
  hex: '#112233',
  image: extra.url
    ? {
        id: color,
        url: extra.url,
        alt: `${color} photo`,
        width: 1200,
        height: 1200,
        variantId: color,
      }
    : null,
});

describe('ProductCard: badges and unit price', () => {
  it('shows the derived badges and a unit price line, and neither when there are none', () => {
    const { unmount } = renderCard(
      makeCard({ badges: ['Sale', 'Eco'], unitPrice: { cents: 420, per: 'kg' } }),
    );
    const badges = screen.getAllByTestId('product-badge').map((b) => b.textContent);
    expect(badges).toEqual(['Sale', 'Eco']);
    expect(screen.getByTestId('unit-price')).toHaveTextContent('€4.20/kg');
    unmount();

    renderCard(makeCard());
    expect(screen.queryByTestId('product-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unit-price')).not.toBeInTheDocument();
  });

  it('puts a litre price per L', () => {
    renderCard(makeCard({ unitPrice: { cents: 1998, per: 'L' } }));
    expect(screen.getByTestId('unit-price')).toHaveTextContent('€19.98/L');
  });
});

describe('ProductCard: colour swatches', () => {
  it('renders no swatch row for a product without colours', () => {
    renderCard();
    expect(screen.queryByRole('group', { name: /Colours of/ })).not.toBeInTheDocument();
  });

  it('shows up to four dots and "+N colours" for the rest', () => {
    renderCard(
      makeCard({
        swatches: ['red', 'blue', 'green', 'pink', 'teal', 'sand'].map((c) => swatch(c)),
      }),
    );
    expect(screen.getAllByTestId('swatch')).toHaveLength(4);
    expect(screen.getByTestId('swatch-more')).toHaveTextContent('+2 colours');
  });

  it('says "+1 colour" for exactly one extra', () => {
    renderCard(makeCard({ swatches: ['a', 'b', 'c', 'd', 'e'].map((c) => swatch(c)) }));
    expect(screen.getByTestId('swatch-more')).toHaveTextContent('+1 colour');
  });

  it('keeps the dots outside the product link (no button inside a link)', () => {
    renderCard(makeCard({ swatches: [swatch('red'), swatch('blue')] }));
    const link = screen.getByTestId('product-card');
    expect(within(link).queryByRole('button')).not.toBeInTheDocument();
    // two colour dots, the add-to-cart button and the wishlist heart
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('previews a colour photo on hover and focus, and keeps it on click', async () => {
    renderCard(
      makeCard({
        swatches: [swatch('red', { url: '/r.webp' }), swatch('blue', { url: '/b.webp' })],
      }),
    );
    const image = () => screen.getByRole('img');
    const first = image().getAttribute('src');

    await userEvent.hover(screen.getByRole('button', { name: 'Red' }));
    expect(image()).toHaveAttribute('src', '/r.webp');
    await userEvent.unhover(screen.getByRole('button', { name: 'Red' }));
    expect(image()).toHaveAttribute('src', first);

    // Keyboard: focus previews too.
    await userEvent.tab();
    await userEvent.tab();
    expect(image().getAttribute('src')).not.toBe(first);

    // Tap (click) keeps the colour after the pointer leaves.
    await userEvent.click(screen.getByRole('button', { name: 'Blue' }));
    await userEvent.unhover(screen.getByRole('button', { name: 'Blue' }));
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true');
    expect(image()).toHaveAttribute('src', '/b.webp');
  });

  it('keeps the card image when a colour has no photo of its own', async () => {
    renderCard(makeCard({ swatches: [swatch('red')] }));
    const before = screen.getByRole('img').getAttribute('src');
    await userEvent.hover(screen.getByRole('button', { name: 'Red' }));
    expect(screen.getByRole('img')).toHaveAttribute('src', before);
  });
});

describe('ProductCard: flash sale (Omnibus)', () => {
  const offer = (referenceCents: number | null) => ({
    priceCents: 799,
    referenceCents,
    basePriceCents: 1099,
    endsAt: '2026-11-08T10:00:00.000Z',
  });

  it('strikes through the lowest price of the last 30 days, never the regular price', () => {
    renderCard(makeCard({ sale: offer(999) }));
    expect(screen.getByTestId('sale-price')).toHaveTextContent('€7.99');
    expect(screen.getByTestId('sale-strike')).toHaveTextContent('Was €9.99');
    expect(screen.getByTestId('sale-strike')).not.toHaveTextContent('€10.99');
    expect(screen.getByTestId('sale-omnibus')).toHaveTextContent(
      'Lowest price in the last 30 days: €9.99',
    );
  });

  it('shows no strike-through when the reference is not above the sale price', () => {
    renderCard(makeCard({ sale: offer(799) }));
    expect(screen.queryByTestId('sale-strike')).not.toBeInTheDocument();
    expect(screen.getByTestId('sale-omnibus')).toHaveTextContent('€7.99');
  });

  it('shows no strike-through and no Omnibus line when there is no reference', () => {
    renderCard(makeCard({ sale: offer(null) }));
    expect(screen.getByTestId('sale-price')).toHaveTextContent('€7.99');
    expect(screen.queryByTestId('sale-strike')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sale-omnibus')).not.toBeInTheDocument();
  });
});

describe('ProductCard: member price', () => {
  it('teases a guest outside the product link, returning to the product after login', () => {
    renderCard(makeCard({ slug: 'rope-tug', hasMemberPrice: true }));
    const teaser = screen.getByTestId('member-teaser');
    expect(teaser).toHaveAttribute('href', '/login?next=%2Fproducts%2Frope-tug');
    expect(screen.getByTestId('product-card')).not.toContainElement(teaser);
  });

  it('shows no teaser and no member price without a member offer', () => {
    renderCard(makeCard({ hasMemberPrice: false }));
    expect(screen.queryByTestId('member-teaser')).not.toBeInTheDocument();
    expect(screen.queryByTestId('member-price')).not.toBeInTheDocument();
  });

  it('shows the member price when the payload carries it', () => {
    renderCard(
      makeCard({
        hasMemberPrice: true,
        member: { priceCents: 900 },
        price: { minCents: 1000, maxCents: 1000, currency: 'EUR' },
      }),
    );
    expect(screen.getByTestId('member-price')).toHaveTextContent('Member price €9.00');
  });
});
