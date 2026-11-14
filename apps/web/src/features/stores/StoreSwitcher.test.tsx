import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { STORE_COOKIE } from '../../lib/store-cookie';
import * as trackModule from '../../lib/track';
import { makeCart, makeCartItem } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { API, server } from '../../test/server';

import { StoreLayout } from './StoreContext';
import { StoreSwitcher } from './StoreSwitcher';

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = `${STORE_COOKIE}=; Max-Age=0; Path=/`;
});

function setup(path: string) {
  const go = vi.fn();
  renderApp(path, [
    {
      element: <StoreLayout />,
      children: [{ path: '*', element: <StoreSwitcher onNavigate={go} /> }],
    },
  ]);
  return go;
}

describe('StoreSwitcher', () => {
  it('lists every store view and shows the current one', () => {
    setup('/de-de/c/dogs');
    const select = screen.getByTestId('store-switcher');
    expect(select).toHaveValue('de-de');
    expect(screen.getAllByRole('option').map((o) => o.getAttribute('value'))).toEqual([
      'eu-en',
      'de-de',
      'fr-fr',
      'uk-en',
    ]);
  });

  it('swaps the prefix keeping path and query, remembers the pick and tracks it', async () => {
    const track = vi.spyOn(trackModule, 'track');
    const go = setup('/de-de/products/rope-tug?v=2#faq');
    await userEvent.selectOptions(screen.getByTestId('store-switcher'), 'uk-en');
    expect(go).toHaveBeenCalledWith('/uk-en/products/rope-tug?v=2#faq');
    expect(document.cookie).toContain(`${STORE_COOKIE}=uk-en`);
    expect(track).toHaveBeenCalledWith({ name: 'store_switched', from: 'de-de', to: 'uk-en' });
  });

  describe('with a full cart', () => {
    let cartServed = false;
    // The header has read the cart long before a real click; wait for it the same way.
    const cartLoaded = async () => {
      await waitFor(() => expect(cartServed).toBe(true));
      await new Promise((r) => setTimeout(r, 20));
    };
    afterEach(() => {
      cartServed = false;
    });
    function cartWith(dropped: { variantId: string; productName: string; variantName: string }[]) {
      let asked: string | null = null;
      server.use(
        http.get(`${API}/cart`, () => {
          cartServed = true;
          return HttpResponse.json({
            data: makeCart([makeCartItem(), makeCartItem({ id: 'l2', variantId: 'v2' })]),
          });
        }),
        http.get(`${API}/cart/switch-preview`, ({ request }) => {
          asked = new URL(request.url).searchParams.get('store');
          return HttpResponse.json({ data: { dropped } });
        }),
      );
      return () => asked;
    }

    it('names the lines that drop; cancel keeps the store and closes', async () => {
      const asked = cartWith([{ variantId: 'v2', productName: 'Euro Ball', variantName: 'Large' }]);
      const go = setup('/eu-en/cart');
      await cartLoaded();
      await userEvent.selectOptions(screen.getByTestId('store-switcher'), 'uk-en');
      const dialog = await screen.findByRole('dialog', {
        name: 'Switch to United Kingdom (English)?',
      });
      expect(asked()).toBe('uk-en');
      expect(within(dialog).getByTestId('store-switch-dropped')).toHaveTextContent(
        'Euro Ball (Large)',
      );
      expect(dialog).toHaveTextContent('no price in GBP');
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Stay in Europe (English)' }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(go).not.toHaveBeenCalled();
      expect(screen.getByTestId('store-switcher')).toHaveValue('eu-en');
      expect(document.cookie).not.toContain(`${STORE_COOKIE}=uk-en`);
    });

    it('closes on Escape without switching, and switches on confirm', async () => {
      cartWith([{ variantId: 'v2', productName: 'Euro Ball', variantName: 'Large' }]);
      const go = setup('/eu-en/cart');
      await cartLoaded();
      await userEvent.selectOptions(screen.getByTestId('store-switcher'), 'uk-en');
      const dialog = await screen.findByRole('dialog');
      // Browsers turn Escape into close() on a modal <dialog>; jsdom does not, so close it that way.
      dialog.closest('dialog')?.close();
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(go).not.toHaveBeenCalled();

      await userEvent.selectOptions(screen.getByTestId('store-switcher'), 'uk-en');
      await userEvent.click(await screen.findByTestId('store-switch-confirm'));
      expect(go).toHaveBeenCalledWith('/uk-en/cart');
    });

    it('asks for the preview when the cart has not loaded yet (never assumes it empty)', async () => {
      const asked = cartWith([{ variantId: 'v2', productName: 'Euro Ball', variantName: 'Large' }]);
      // The cart request hangs, so the switcher picks before it knows the cart.
      server.use(http.get(`${API}/cart`, () => new Promise<never>(() => {})));
      const go = setup('/eu-en/cart');
      await userEvent.selectOptions(screen.getByTestId('store-switcher'), 'uk-en');
      expect(await screen.findByRole('dialog')).toHaveTextContent('Euro Ball');
      expect(asked()).toBe('uk-en');
      expect(go).not.toHaveBeenCalled();
    });

    it('switches straight away when nothing would drop or the currency stays', async () => {
      const asked = cartWith([]);
      const go = setup('/eu-en/cart');
      await cartLoaded();
      await userEvent.selectOptions(screen.getByTestId('store-switcher'), 'de-de');
      expect(go).toHaveBeenCalledWith('/de-de/cart');
      expect(asked()).toBeNull();
      await userEvent.selectOptions(screen.getByTestId('store-switcher'), 'uk-en');
      await waitFor(() => expect(go).toHaveBeenCalledWith('/uk-en/cart'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
