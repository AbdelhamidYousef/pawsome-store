import {
  CheckoutAddressSchema,
  LoginSchema,
  RegisterSchema,
  STORES,
  SUPPORTED_COUNTRIES,
} from '@store/shared';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { makeCart, makeCartItem, makeUser } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { API, server } from '../../test/server';

import {
  DEMO_ACCOUNT_PASSWORD,
  DEMO_ACCOUNTS,
  demoAddress,
  demoCountry,
  demoPerson,
} from './demo-data';

beforeEach(() => {
  window.sessionStorage.clear();
});

// A seeded generator, so a failure names the same person every run.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

describe('demo data', () => {
  it('makes shoppers the register schema accepts, each with a unique demo email', () => {
    const rng = seeded(7);
    const emails = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const person = demoPerson(rng);
      expect(RegisterSchema.safeParse(person).success).toBe(true);
      expect(person.email).toMatch(/^demo\+[a-z0-9]{6}@pawsome\.test$/);
      emails.add(person.email);
    }
    expect(emails.size).toBe(50);
  });

  it.each(SUPPORTED_COUNTRIES)('makes a valid %s address', (country) => {
    const address = demoAddress(country, seeded(3));
    expect(address.country).toBe(country);
    expect(CheckoutAddressSchema.safeParse({ ...address, fullName: 'Mila Rivers' }).success).toBe(
      true,
    );
  });

  it('uses each country’s own postcode format', () => {
    expect(demoAddress('GB', seeded(1)).postalCode).toMatch(/^[A-Z]{1,2}\d{1,2}[A-Z]? \d[A-Z]{2}$/);
    expect(demoAddress('DE', seeded(1)).postalCode).toMatch(/^\d{5}$/);
    expect(demoAddress('NL', seeded(1)).postalCode).toMatch(/^\d{4} [A-Z]{2}$/);
  });

  it('keeps the chosen country when the store ships there, else takes one it does', () => {
    const uk = STORES.find((s) => s.code === 'uk-en')!;
    const fr = STORES.find((s) => s.code === 'fr-fr')!;
    expect(demoCountry('DE', uk.shipCountries)).toBe('GB');
    expect(demoCountry('BE', fr.shipCountries)).toBe('BE');
    expect(demoCountry('', fr.shipCountries)).toBe('FR');
  });

  it('offers only customer accounts that the login schema accepts', () => {
    for (const a of DEMO_ACCOUNTS) {
      expect(a.email).not.toMatch(/admin/);
      expect(
        LoginSchema.safeParse({ email: a.email, password: DEMO_ACCOUNT_PASSWORD }).success,
      ).toBe(true);
    }
  });
});

describe('demo helper panel', () => {
  it('fills the registration form, shows the password and submits what it filled', async () => {
    let body: Record<string, string> | undefined;
    server.use(
      http.post(`${API}/auth/register`, async ({ request }) => {
        body = (await request.json()) as Record<string, string>;
        return HttpResponse.json({ data: { user: makeUser() } }, { status: 201 });
      }),
    );
    const router = renderApp('/register');
    const user = userEvent.setup();
    expect(await screen.findByRole('region', { name: 'Demo helper' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Fill with a new demo shopper' }));

    expect(screen.getByLabelText('First name')).not.toHaveValue('');
    expect(screen.getByLabelText<HTMLInputElement>('Email').value).toMatch(/^demo\+/);
    const password = screen.getByTestId('demo-password').textContent;
    expect(screen.getByLabelText('Password')).toHaveValue(password);
    // Focus moved on to the submit button, ready for Enter.
    expect(screen.getByTestId('register-submit')).toHaveFocus();

    await user.click(screen.getByTestId('register-submit'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'));
    expect(body?.password).toBe(password);
  });

  it('fills a demo account on the sign-in page', async () => {
    renderApp('/login');
    await userEvent.click(await screen.findByRole('button', { name: 'Use Sam' }));
    expect(screen.getByLabelText('Email')).toHaveValue('sam@pawsome.test');
    expect(screen.getByLabelText('Password')).toHaveValue(DEMO_ACCOUNT_PASSWORD);
    expect(screen.getByTestId('login-submit')).toHaveFocus();
  });

  it('folds to a pill and closes for the rest of the visit', async () => {
    renderApp('/login');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Fold away' }));
    expect(screen.queryByRole('region', { name: 'Demo helper' })).not.toBeInTheDocument();
    const pill = screen.getByRole('button', { name: 'Demo helper: fill this form' });
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    await user.click(pill);
    await user.click(screen.getByRole('button', { name: 'Close the demo helper' }));
    expect(screen.queryByTestId('demo-helper')).not.toBeInTheDocument();
    expect(screen.queryByTestId('demo-helper-expand')).not.toBeInTheDocument();

    // A new page view in the same tab remembers it.
    cleanup();
    renderApp('/register');
    expect(await screen.findByLabelText('First name')).toBeInTheDocument();
    expect(screen.queryByTestId('demo-helper')).not.toBeInTheDocument();
  });

  it('walks the checkout: contact, address, delivery, then the Stripe test card', async () => {
    server.use(
      http.get(`${API}/cart`, () => HttpResponse.json({ data: makeCart([makeCartItem()]) })),
    );
    renderApp('/checkout');
    const user = userEvent.setup();
    await user.click(await screen.findByTestId('demo-fill-contact'));
    expect(screen.getByLabelText<HTMLInputElement>('Email').value).toMatch(/@pawsome\.test$/);
    expect(screen.getByLabelText('Full name')).not.toHaveValue('');
    expect(screen.getByLabelText('Address line 1')).toHaveFocus();

    await user.click(screen.getByTestId('demo-fill-address'));
    expect(screen.getByLabelText<HTMLInputElement>('Postal code').value).toMatch(/^\d{5}$/);
    expect(screen.getByTestId('checkout-continue-shipping')).toHaveFocus();
    await user.click(screen.getByTestId('checkout-continue-shipping'));

    await user.click(await screen.findByTestId('demo-pick-shipping'));
    expect(screen.getByTestId('checkout-continue-payment')).toHaveFocus();
    await user.click(screen.getByTestId('checkout-continue-payment'));

    expect(await screen.findByTestId('demo-test-card')).toHaveTextContent('4242 4242 4242 4242');
    expect(screen.getByText(/Why 4242\?/)).toBeVisible();
  });
});
