import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { PETS } from '../../lib/pets';
import { renderWithProviders } from '../../test/render';

import { AppLayout } from './AppLayout';
import { Breadcrumbs } from './Breadcrumbs';
import { Header } from './Header';

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
}

// AppLayout renders <ScrollRestoration />, which needs a data router.
function renderShell(initial = '/') {
  const router = createMemoryRouter(
    [{ element: <AppLayout />, children: [{ path: '*', element: <Where /> }] }],
    { initialEntries: [initial] },
  );
  return renderWithProviders(<RouterProvider router={router} />);
}

describe('AppLayout', () => {
  it('has the page landmarks and the skip link as the first tab stop', async () => {
    renderShell();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    await userEvent.tab();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute('href', '#main');
  });

  it('lists the six pets and Brands in the header nav, each pet with its accent', () => {
    renderShell();
    const items = within(screen.getByTestId('main-nav')).getAllByRole('listitem');
    // The pets, then the Brands link (which has no pet accent).
    expect(items).toHaveLength(PETS.length + 1);
    expect(items.map((li) => li.getAttribute('data-pet'))).toEqual([
      'dog',
      'cat',
      'bird',
      'fish',
      'small-pet',
      'reptile',
      null,
    ]);
    expect(within(items[5]!).getByRole('link', { name: 'Reptiles' })).toHaveAttribute(
      'href',
      '/c/reptiles',
    );
    expect(within(items[6]!).getByRole('link', { name: 'Brands' })).toHaveAttribute(
      'href',
      '/brands',
    );
    expect(within(items[0]!).getByRole('link', { name: 'Dogs' })).toHaveAttribute(
      'href',
      '/c/dogs',
    );
  });

  it('marks the current category link', () => {
    renderShell('/c/cats');
    const nav = screen.getByTestId('main-nav');
    expect(within(nav).getByRole('link', { name: 'Cats' })).toHaveAttribute('aria-current', 'page');
  });

  it('has a labelled footer with shop links and a test-mode notice', () => {
    renderShell();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('navigation', { name: 'Shop' })).toBeInTheDocument();
    expect(footer).toHaveTextContent('Stripe (test mode)');
  });
});

describe('Header', () => {
  it('searches by navigating to /search?q= and ignores an empty query', async () => {
    const user = userEvent.setup();
    renderShell();
    const box = within(screen.getByTestId('header')).getByRole('combobox', {
      name: 'Search products',
    });
    await user.type(box, '   {Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/');

    await user.type(box, 'squeaky ball{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/search?q=squeaky%20ball');
  });

  it('announces the cart count in the link name and shows a badge', () => {
    renderWithProviders(
      <MemoryRouter>
        <Header cartCount={3} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Cart, 3 items' })).toHaveAttribute('href', '/cart');
    expect(screen.getByTestId('cart-count')).toHaveTextContent('3');
  });

  it('uses the singular for one item and hides the badge at zero', () => {
    const { unmount } = renderWithProviders(
      <MemoryRouter>
        <Header cartCount={1} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Cart, 1 item' })).toBeInTheDocument();
    unmount();
    renderWithProviders(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('cart-count')).not.toBeInTheDocument();
  });

  it('opens and closes the account menu with the keyboard', async () => {
    const user = userEvent.setup();
    renderShell();
    const button = screen.getByRole('button', { name: 'Account' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('opens the mobile drawer, navigates from it and closes it', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const drawer = screen.getByRole('dialog', { name: 'Menu' });
    await user.click(within(drawer).getByRole('link', { name: 'Birds' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/c/birds');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Breadcrumbs', () => {
  it('links the trail and marks the last item as the current page', () => {
    render(
      <MemoryRouter>
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Dogs', to: '/c/dogs' },
            { label: 'Rope tug' },
          ]}
        />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByRole('link', { name: 'Dogs' })).toHaveAttribute('href', '/c/dogs');
    expect(within(nav).getByText('Rope tug')).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: 'Rope tug' })).not.toBeInTheDocument();
  });
});
