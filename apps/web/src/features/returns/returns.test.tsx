import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { makeCustomerOrder, makeOrderReturns, makeReturn } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { API, server, signedInAs } from '../../test/server';

const delivered = () =>
  http.get(`${API}/account/orders/:number`, () =>
    HttpResponse.json({ data: makeCustomerOrder({ status: 'delivered' }) }),
  );
const returnsOf = (data: object) =>
  http.get(`${API}/orders/:number/returns`, () => HttpResponse.json({ data }));

describe('returns on the order page', () => {
  it('offers Return items for an eligible delivered order, with the deadline', async () => {
    server.use(signedInAs(), delivered(), returnsOf(makeOrderReturns()));
    renderApp('/account/orders/PW-2026-000123');
    expect(await screen.findByRole('button', { name: 'Return items' })).toBeInTheDocument();
    expect(screen.getByText(/You can return items until/)).toBeInTheDocument();
  });

  it('sends the chosen line, quantity and reason, and shows a preview of the refund', async () => {
    let body: unknown;
    server.use(
      signedInAs(),
      delivered(),
      returnsOf(makeOrderReturns()),
      http.post(`${API}/orders/:number/returns`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: makeReturn() }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderApp('/account/orders/PW-2026-000123');
    await user.click(await screen.findByRole('button', { name: 'Return items' }));

    // Nothing picked yet: a message, and sending is refused in the browser.
    expect(screen.getByTestId('return-preview')).toHaveTextContent('Pick an item');
    await user.click(screen.getByRole('button', { name: 'Send return request' }));
    expect(await screen.findByText('Choose at least one item to return')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Rope Tug/ }));
    await user.selectOptions(screen.getByLabelText('Quantity of Rope Tug'), '2');
    expect(screen.getByTestId('return-preview')).toHaveTextContent('€21.98');
    await user.selectOptions(screen.getByLabelText('Why are you returning it?'), 'damaged');
    await user.type(screen.getByLabelText(/Anything we should know/), 'Chewed through');
    await user.click(screen.getByRole('button', { name: 'Send return request' }));

    await waitFor(() =>
      expect(body).toEqual({
        reason: 'damaged',
        note: 'Chewed through',
        items: [{ orderItemId: 'oi1', quantity: 2 }],
      }),
    );
    await waitFor(() =>
      expect(screen.queryByTestId('return-request-form')).not.toBeInTheDocument(),
    );
  });

  it('shows the API message when the request is refused', async () => {
    server.use(
      signedInAs(),
      delivered(),
      returnsOf(makeOrderReturns()),
      http.post(`${API}/orders/:number/returns`, () =>
        HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'You can return at most 1 of Rope Tug' } },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderApp('/account/orders/PW-2026-000123');
    await user.click(await screen.findByRole('button', { name: 'Return items' }));
    await user.click(screen.getByRole('checkbox', { name: /Rope Tug/ }));
    await user.click(screen.getByRole('button', { name: 'Send return request' }));
    expect(await screen.findByText('You can return at most 1 of Rope Tug')).toBeInTheDocument();
    expect(screen.getByTestId('return-request-form')).toBeInTheDocument();
  });

  it('explains why a return is not possible and hides the button', async () => {
    server.use(
      signedInAs(),
      delivered(),
      returnsOf(
        makeOrderReturns({
          eligibility: {
            eligible: false,
            reason: 'The 30-day return window has closed',
            deadline: '2026-10-01T10:00:00.000Z',
            lines: [],
          },
        }),
      ),
    );
    renderApp('/account/orders/PW-2026-000123');
    expect(await screen.findByTestId('return-ineligible')).toHaveTextContent('window has closed');
    expect(screen.queryByRole('button', { name: 'Return items' })).not.toBeInTheDocument();
  });

  it('shows each return with its status, items, decline reason and progress', async () => {
    server.use(
      signedInAs(),
      delivered(),
      returnsOf(
        makeOrderReturns({
          returns: [
            makeReturn({
              id: 'a',
              status: 'refunded',
              approvedAt: '2026-11-06T10:00:00.000Z',
              receivedAt: '2026-11-08T10:00:00.000Z',
              refundedAt: '2026-11-09T10:00:00.000Z',
              simulated: true,
            }),
            makeReturn({ id: 'b', status: 'rejected', rejectReason: 'Used and washed' }),
          ],
        }),
      ),
    );
    renderApp('/account/orders/PW-2026-000123');
    const cards = await screen.findAllByTestId('return-card');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]!).getAllByText('Refunded').length).toBeGreaterThan(0);
    expect(cards[0]).toHaveTextContent('Refunded €10.99');
    const steps = within(within(cards[0]!).getByTestId('return-timeline')).getAllByRole('listitem');
    expect(steps.map((s) => s.textContent?.split(' · ')[0])).toEqual([
      'Request sent',
      'Return approved',
      'Return received',
      'Refunded',
    ]);
    expect(cards[1]).toHaveTextContent('Why we declined: Used and washed');
    expect(cards[1]).toHaveTextContent('No refund for this request.');
  });

  it('does not ask for returns of an order that is not delivered', async () => {
    let asked = false;
    server.use(
      signedInAs(),
      http.get(`${API}/account/orders/:number`, () =>
        HttpResponse.json({ data: makeCustomerOrder({ status: 'shipped' }) }),
      ),
      http.get(`${API}/orders/:number/returns`, () => {
        asked = true;
        return HttpResponse.json({ data: makeOrderReturns() });
      }),
    );
    renderApp('/account/orders/PW-2026-000123');
    await screen.findByTestId('page-order-detail');
    expect(screen.queryByTestId('returns-section')).not.toBeInTheDocument();
    expect(asked).toBe(false);
  });
});
