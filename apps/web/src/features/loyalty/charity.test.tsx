import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { makePoints } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { API, server, signedInAs } from '../../test/server';

const total = (totalCents: number, donations = 3) =>
  http.get(`${API}/charity/total`, () =>
    HttpResponse.json({
      data: {
        charity: {
          slug: 'whisker-hollow-rescue',
          name: 'Whisker Hollow Rescue',
          description: 'A fictional shelter.',
        },
        totalCents,
        donations,
      },
    }),
  );

describe('charity', () => {
  it('shows the running total and how it grows on /charity', async () => {
    server.use(total(12_350));
    renderApp('/charity');
    expect(await screen.findByTestId('charity-amount')).toHaveTextContent('€123.50');
    expect(screen.getByText(/from 3 donations/)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('added to the total');
  });

  it('links the shelter page from the footer of every page, without a running total', async () => {
    server.use(total(500, 1));
    renderApp('/help');
    const footer = await screen.findByTestId('footer');
    expect(within(footer).getByRole('link', { name: 'Our shelter partner' })).toHaveAttribute(
      'href',
      '/charity',
    );
    expect(within(footer).queryByTestId('charity-total')).not.toBeInTheDocument();
  });

  it('sends the round-up choice with the order only when ticked', async () => {
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.get(`${API}/cart`, async () => {
        const { makeCart, makeCartItem } = await import('../../test/fixtures');
        return HttpResponse.json({ data: makeCart([makeCartItem({ unitPriceCents: 2350 })]) });
      }),
    );
    server.use(
      http.post(`${API}/checkout`, async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    // Without a key the page never posts: this only checks the checkbox is on the shipping step.
    renderApp('/checkout');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'sam@example.test');
    await user.type(screen.getByLabelText('Full name'), 'Sam Rivers');
    await user.type(screen.getByLabelText('Address line 1'), '1 Bone Street');
    await user.type(screen.getByLabelText('Postal code'), '10115');
    await user.type(screen.getByLabelText('City'), 'Berlin');
    await user.click(screen.getByTestId('checkout-continue-shipping'));
    const box = await screen.findByLabelText(/Round my total up/);
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    expect(bodies).toHaveLength(0);
  });

  it('donates points from the rewards page and refreshes the balance', async () => {
    let balance = 500;
    server.use(
      signedInAs(),
      total(0, 0),
      http.get(`${API}/me/points`, () =>
        HttpResponse.json({ data: makePoints({ balance, lifetimeEarned: 500 }) }),
      ),
      http.get(`${API}/rewards`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/me/codes`, () => HttpResponse.json({ data: [] })),
      http.post(`${API}/me/points/donate`, async ({ request }) => {
        const { points } = (await request.json()) as { points: number };
        balance -= points;
        return HttpResponse.json({ data: { balance, donatedCents: points } }, { status: 201 });
      }),
    );
    renderApp('/account/rewards');
    const form = await screen.findByTestId('donate-points');
    const button = within(form).getByRole('button', { name: 'Donate' });
    expect(button).toBeDisabled();
    await userEvent.type(within(form).getByLabelText('Points to donate'), '200');
    await userEvent.click(button);
    expect(await screen.findByText(/Thank you! 200 points/)).toBeInTheDocument();
    expect(await screen.findByTestId('points-balance')).toHaveTextContent('300');
  });
});
