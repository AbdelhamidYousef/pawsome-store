import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  makeCart,
  makeCartItem,
  makeCartPricing,
  makePoints,
  makeProduct,
  makeQuote,
} from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { API, server, signedInAs } from '../../test/server';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const item = makeCartItem({ unitPriceCents: 1099, quantity: 1, lineTotalCents: 1099 });
const serveCart = (requiresVetApproval: boolean) =>
  server.use(
    http.get(`${API}/cart`, () =>
      HttpResponse.json({ data: makeCart([item], [], requiresVetApproval) }),
    ),
  );

async function fillAddress(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Email'), 'sam@example.test');
  await user.type(screen.getByLabelText('Full name'), 'Sam Rivers');
  await user.type(screen.getByLabelText('Address line 1'), '1 Bone Street');
  await user.type(screen.getByLabelText('Postal code'), '10115');
  await user.type(screen.getByLabelText('City'), 'Berlin');
}

describe('vet details at checkout', () => {
  it('asks for the vet only when the cart needs one', async () => {
    serveCart(false);
    renderApp('/checkout');
    await screen.findByLabelText('Email');
    expect(screen.queryByTestId('vet-details-form')).not.toBeInTheDocument();
  });

  it('requires every vet field before moving on, with the turnaround note', async () => {
    serveCart(true);
    renderApp('/checkout');
    const user = userEvent.setup();
    await fillAddress(user);
    expect(screen.getByTestId('vet-details-form')).toHaveTextContent('within one working day');
    await user.click(screen.getByTestId('checkout-continue-shipping'));
    expect(await screen.findByLabelText("Vet's name")).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Clinic')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText("Vet's email")).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByTestId('checkout-step').map((s) => s.getAttribute('data-state'))).toEqual(
      ['active', 'locked', 'locked'],
    );
    await user.type(screen.getByLabelText("Vet's name"), 'Dr Rosa Marsh');
    await user.type(screen.getByLabelText('Clinic'), 'Pawside Vet Clinic');
    await user.type(screen.getByLabelText("Vet's email"), 'nope');
    await user.click(screen.getByTestId('checkout-continue-shipping'));
    expect(await screen.findByLabelText("Vet's email")).toHaveAttribute('aria-invalid', 'true');
  });

  it('sends the vet details with the order', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_x');
    serveCart(true);
    let body: Record<string, unknown> = {};
    server.use(
      http.get(`${API}/checkout/shipping-methods`, () =>
        HttpResponse.json({ data: [makeQuote()] }),
      ),
      http.post(`${API}/checkout`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          data: {
            orderNumber: 'PW-2026-000200',
            clientSecret: 'pi_x_secret_y',
            totals: {
              currency: 'EUR',
              subtotalCents: 1099,
              shippingCents: 490,
              discountCents: 0,
              taxCents: 0,
              totalCents: 1589,
            },
          },
        });
      }),
    );
    renderApp('/checkout');
    const user = userEvent.setup();
    await fillAddress(user);
    await user.type(screen.getByLabelText("Vet's name"), 'Dr Rosa Marsh');
    await user.type(screen.getByLabelText('Clinic'), 'Pawside Vet Clinic');
    await user.type(screen.getByLabelText("Vet's email"), 'rosa@pawside-vet.test');
    await user.click(screen.getByTestId('checkout-continue-shipping'));
    await user.click(await screen.findByTestId('checkout-continue-payment'));
    await waitFor(() =>
      expect(body.vetDetails).toEqual({
        vetName: 'Dr Rosa Marsh',
        clinic: 'Pawside Vet Clinic',
        vetEmail: 'rosa@pawside-vet.test',
      }),
    );
  });
});

describe('vet details with points and the round-up', () => {
  it('sends all three together in one order', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_x');
    let body: Record<string, unknown> = {};
    server.use(
      http.get(`${API}/cart`, () =>
        HttpResponse.json({
          data: {
            ...makeCart([item], [], true),
            pricing: makeCartPricing({ merchandiseCents: 1099, totalEstimateCents: 1099 }),
          },
        }),
      ),
      signedInAs(),
      http.get(`${API}/account/addresses`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/me/points`, () => HttpResponse.json({ data: makePoints({ balance: 500 }) })),
      http.get(`${API}/checkout/shipping-methods`, () =>
        HttpResponse.json({ data: [makeQuote()] }),
      ),
      http.post(`${API}/checkout`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    renderApp('/checkout');
    const user = userEvent.setup();
    // Signed in: no email field, and the address may come prefilled from the account.
    await user.type(await screen.findByLabelText("Vet's name"), 'Dr Rosa Marsh');
    for (const [label, value] of [
      ['Full name', 'Sam Rivers'],
      ['Address line 1', '1 Bone Street'],
      ['Postal code', '10115'],
      ['City', 'Berlin'],
    ] as const) {
      await user.clear(screen.getByLabelText(label));
      await user.type(screen.getByLabelText(label), value);
    }
    await user.type(screen.getByLabelText('Clinic'), 'Pawside Vet Clinic');
    await user.type(screen.getByLabelText("Vet's email"), 'rosa@pawside-vet.test');
    await user.click(screen.getByTestId('checkout-continue-shipping'));
    await user.type(await screen.findByLabelText('Use loyalty points'), '200');
    await user.click(screen.getByLabelText(/Round my total up/));
    await user.click(screen.getByTestId('checkout-continue-payment'));
    await waitFor(() =>
      expect(body).toMatchObject({
        pointsToRedeem: 200,
        roundUpDonation: true,
        vetDetails: { vetName: 'Dr Rosa Marsh', clinic: 'Pawside Vet Clinic' },
      }),
    );
  }, 15_000);
});

describe('vet banner on the product page', () => {
  it('shows it for an item that needs approval and not otherwise', async () => {
    server.use(
      http.get(`${API}/products/:slug`, () =>
        HttpResponse.json({ data: makeProduct({ requiresVetApproval: true }) }),
      ),
    );
    renderApp('/products/rope-tug');
    expect(await screen.findByTestId('vet-banner')).toHaveTextContent('Needs a vet');
  });

  it('is absent for an ordinary product', async () => {
    server.use(http.get(`${API}/products/:slug`, () => HttpResponse.json({ data: makeProduct() })));
    renderApp('/products/rope-tug');
    await screen.findByRole('heading', { name: 'Rope Tug', level: 1 });
    expect(screen.queryByTestId('vet-banner')).not.toBeInTheDocument();
  });
});
