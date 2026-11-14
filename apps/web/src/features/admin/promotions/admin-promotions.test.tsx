import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderApp } from '../../../test/render';
import { API, server, signedInAs } from '../../../test/server';

beforeEach(() => {
  server.use(signedInAs({ role: 'admin' }));
});

const code = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  code: 'PAWS10',
  kind: 'percent',
  value: 10,
  minSpendCents: 3000,
  valueByCurrency: {},
  minSpendByCurrency: {},
  startsAt: null,
  endsAt: null,
  maxUses: 100,
  perCustomerMax: null,
  excludeSaleItems: false,
  firstOrderOnly: false,
  active: true,
  archivedAt: null,
  liveRedemptions: 5,
  createdAt: '2026-11-01T10:00:00.000Z',
  ...over,
});

describe('promotions navigation', () => {
  it('adds one Promotions item to the admin nav, with Codes, Bulk tiers, Gift and Flash sales tabs inside', async () => {
    server.use(http.get(`${API}/admin/discount-codes`, () => HttpResponse.json({ data: [] })));
    renderApp('/admin/promotions');
    const nav = await screen.findByTestId('admin-nav');
    expect(within(nav).getAllByRole('link', { name: /promotions/i })).toHaveLength(1);
    const tabs = await screen.findByTestId('promotions-tabs');
    for (const name of ['Codes', 'Bulk tiers', 'Gift', 'Flash sales'])
      expect(within(tabs).getByRole('link', { name })).toBeInTheDocument();
    // The index redirects to the codes tab.
    expect(await screen.findByTestId('admin-codes')).toBeInTheDocument();
  });
});

describe('discount codes screen', () => {
  it('lists codes with the same sentence the form previews', async () => {
    server.use(
      http.get(`${API}/admin/discount-codes`, () =>
        HttpResponse.json({
          data: [
            code(),
            code({
              id: 'c2',
              code: 'WELCOME5',
              kind: 'fixed',
              value: 500,
              minSpendCents: 0,
              maxUses: null,
              firstOrderOnly: true,
              liveRedemptions: 0,
            }),
            code({ id: 'c3', code: 'OLD', archivedAt: '2026-11-02T00:00:00.000Z', active: false }),
          ],
        }),
      ),
    );
    renderApp('/admin/promotions/codes');
    const rows = await screen.findAllByTestId('admin-code-row');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('10% off, min €30.00, 5 of 100 used');
    expect(rows[1]).toHaveTextContent('€5.00 off, first order only');
    expect(rows[2]).toHaveTextContent('Archived');
    // An archived code cannot be deleted again.
    expect(within(rows[2]!).queryByRole('button', { name: /Delete/ })).toBeNull();
  });

  it('previews live while typing, and sends euros as integer cents', async () => {
    let posted: unknown;
    server.use(
      http.get(`${API}/admin/discount-codes`, () => HttpResponse.json({ data: [] })),
      http.post(`${API}/admin/discount-codes`, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ data: code() }, { status: 201 });
      }),
    );
    renderApp('/admin/promotions/codes');
    await userEvent.click(await screen.findByRole('button', { name: 'New code' }));
    const form = await screen.findByTestId('admin-code-form');
    const preview = within(form).getByTestId('code-preview');
    expect(preview).toHaveTextContent('Fill in the amount');

    await userEvent.type(within(form).getByLabelText('Code'), 'SPRING10');
    await userEvent.selectOptions(within(form).getByLabelText('Type'), 'fixed');
    await userEvent.type(within(form).getByLabelText('Amount off (EUR)'), '5,5');
    await userEvent.type(within(form).getByLabelText('Minimum spend (EUR)'), '19.99');
    await userEvent.type(within(form).getByLabelText('Amount off (GBP)'), '4.50');
    await waitFor(() => expect(preview).toHaveTextContent('€5.50 off, min €19.99'));
    await userEvent.click(within(form).getByLabelText('First order only'));
    expect(preview).toHaveTextContent('€5.50 off, min €19.99, first order only');

    await userEvent.click(within(form).getByRole('button', { name: 'Create code' }));
    await waitFor(() =>
      expect(posted).toMatchObject({
        code: 'SPRING10',
        kind: 'fixed',
        value: 550,
        minSpendCents: 1999,
        // The GBP minimum was left blank: with a EUR minimum the code is not offered in GBP.
        valueByCurrency: { GBP: 450 },
        minSpendByCurrency: {},
        maxUses: null,
        firstOrderOnly: true,
      }),
    );
  });

  it('refuses bad input before sending, with errors tied to their fields', async () => {
    let posts = 0;
    server.use(
      http.get(`${API}/admin/discount-codes`, () => HttpResponse.json({ data: [] })),
      http.post(`${API}/admin/discount-codes`, () => {
        posts += 1;
        return HttpResponse.json({ data: code() }, { status: 201 });
      }),
    );
    renderApp('/admin/promotions/codes');
    await userEvent.click(await screen.findByRole('button', { name: 'New code' }));
    const form = await screen.findByTestId('admin-code-form');
    await userEvent.type(within(form).getByLabelText('Code'), 'X');
    await userEvent.type(within(form).getByLabelText('Percentage'), '101');
    await userEvent.click(within(form).getByRole('button', { name: 'Create code' }));
    const percent = within(form).getByLabelText('Percentage');
    expect(percent).toHaveAttribute('aria-invalid', 'true');
    const describedBy = percent.getAttribute('aria-describedby') ?? '';
    expect(
      describedBy
        .split(' ')
        .some((id) => document.getElementById(id)?.textContent?.includes('1 to 100')),
    ).toBe(true);
    expect(within(form).getByLabelText('Code')).toHaveAttribute('aria-invalid', 'true');
    expect(posts).toBe(0);
  });

  it('shows the duplicate-code 409 sentence in the form', async () => {
    server.use(
      http.get(`${API}/admin/discount-codes`, () => HttpResponse.json({ data: [] })),
      http.post(`${API}/admin/discount-codes`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLICT',
              message: 'A code with that name already exists (codes are not case-sensitive).',
            },
          },
          { status: 409 },
        ),
      ),
    );
    renderApp('/admin/promotions/codes');
    await userEvent.click(await screen.findByRole('button', { name: 'New code' }));
    const form = await screen.findByTestId('admin-code-form');
    await userEvent.type(within(form).getByLabelText('Code'), 'paws10');
    await userEvent.type(within(form).getByLabelText('Percentage'), '10');
    await userEvent.click(within(form).getByRole('button', { name: 'Create code' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('already exists');
  });
});

describe('bulk tiers screen', () => {
  it('lists tiers and creates one from euros', async () => {
    let posted: unknown;
    server.use(
      http.get(`${API}/admin/bulk-tiers`, () =>
        HttpResponse.json({
          data: [
            { id: 't1', minCents: 7500, minByCurrency: { GBP: 6500 }, percent: 5, active: true },
          ],
        }),
      ),
      http.post(`${API}/admin/bulk-tiers`, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json(
          { data: { id: 't2', minCents: 10000, minByCurrency: {}, percent: 10, active: true } },
          { status: 201 },
        );
      }),
    );
    renderApp('/admin/promotions/tiers');
    const rows = await screen.findAllByTestId('admin-tier-row');
    expect(rows[0]).toHaveTextContent('€75.00');
    expect(rows[0]).toHaveTextContent('£65.00');
    expect(rows[0]).toHaveTextContent('5% off');
    await userEvent.click(screen.getByRole('button', { name: 'New tier' }));
    const form = await screen.findByTestId('admin-tier-form');
    await userEvent.type(within(form).getByLabelText('Spend from (EUR)'), '100');
    await userEvent.type(within(form).getByLabelText('Spend from (GBP)'), '85');
    await userEvent.type(within(form).getByLabelText('Percentage off'), '10');
    await userEvent.click(within(form).getByRole('button', { name: 'Create tier' }));
    await waitFor(() =>
      expect(posted).toEqual({
        minCents: 10000,
        minByCurrency: { GBP: 8500 },
        percent: 10,
        active: true,
      }),
    );
  });

  it('shows the overlapping-threshold 409', async () => {
    server.use(
      http.get(`${API}/admin/bulk-tiers`, () => HttpResponse.json({ data: [] })),
      http.post(`${API}/admin/bulk-tiers`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'CONFLICT',
              message: 'There is already a tier for that spend. Edit it instead.',
            },
          },
          { status: 409 },
        ),
      ),
    );
    renderApp('/admin/promotions/tiers');
    await userEvent.click(await screen.findByRole('button', { name: 'New tier' }));
    const form = await screen.findByTestId('admin-tier-form');
    await userEvent.type(within(form).getByLabelText('Spend from (EUR)'), '75');
    await userEvent.type(within(form).getByLabelText('Percentage off'), '5');
    await userEvent.click(within(form).getByRole('button', { name: 'Create tier' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('already a tier');
  });
});

describe('gift screen', () => {
  it('shows the active rule and switches it off', async () => {
    let cleared = false;
    server.use(
      http.get(`${API}/admin/gift-rule`, () =>
        HttpResponse.json({
          data: cleared
            ? null
            : {
                id: 'g1',
                thresholdCents: 4000,
                thresholdByCurrency: { GBP: 3500 },
                variantId: 'v1',
                sku: 'BISC-1',
                productName: 'Peanut Crunch Biscuits',
                variantName: '200 g',
              },
        }),
      ),
      http.delete(`${API}/admin/gift-rule`, () => {
        cleared = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderApp('/admin/promotions/gift');
    expect(await screen.findByTestId('gift-status')).toHaveTextContent(
      'a free Peanut Crunch Biscuits (200 g, BISC-1) from €40.00 / £35.00',
    );
    expect(screen.getByLabelText('Spend from (EUR)')).toHaveValue('40.00');
    expect(screen.getByLabelText('Spend from (GBP)')).toHaveValue('35.00');
    await userEvent.click(screen.getByRole('button', { name: 'Switch off' }));
    await waitFor(() => expect(screen.getByTestId('gift-status')).toHaveTextContent('Off'));
  });

  it('sends the threshold in cents and the SKU, and shows the server refusal for a bad variant', async () => {
    let put: unknown;
    server.use(
      http.get(`${API}/admin/gift-rule`, () => HttpResponse.json({ data: null })),
      http.put(`${API}/admin/gift-rule`, async ({ request }) => {
        put = await request.json();
        return HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: {
                formErrors: [],
                fieldErrors: { variant: ['No variant has that SKU or id'] },
              },
            },
          },
          { status: 400 },
        );
      }),
    );
    renderApp('/admin/promotions/gift');
    await userEvent.type(await screen.findByLabelText('Spend from (EUR)'), '40');
    await userEvent.type(screen.getByLabelText('Gift variant SKU'), 'NOPE');
    await userEvent.click(screen.getByRole('button', { name: 'Turn on gift' }));
    // Scoped to the form: a role query over the whole app page is slow.
    expect(
      await within(screen.getByTestId('admin-gift-form')).findByTestId('form-error'),
    ).toHaveTextContent('No variant has that SKU');
    expect(put).toEqual({ thresholdCents: 4000, thresholdByCurrency: {}, variant: 'NOPE' });
  });
});

describe('flash sales screen', () => {
  const item = (over: Record<string, unknown> = {}) => ({
    id: 'i1',
    variantId: 'v1',
    sku: 'PW-ROPE-S',
    productName: 'Rope Tug',
    variantName: 'Small',
    regularCents: 2000,
    salePriceCents: 1500,
    referenceCents: null,
    ...over,
  });
  const sale = (over: Record<string, unknown> = {}) => ({
    id: 'f1',
    name: 'Weekend Woof',
    startsAt: '2026-11-20T10:00:00.000Z',
    endsAt: '2026-11-21T10:00:00.000Z',
    status: 'scheduled',
    itemCount: 1,
    items: [item()],
    createdAt: '2026-11-01T10:00:00.000Z',
    ...over,
  });
  const lookup = () =>
    http.get(`${API}/admin/flash-sales/variant-lookup`, () =>
      HttpResponse.json({
        data: {
          variantId: 'v1',
          sku: 'PW-ROPE-S',
          productName: 'Rope Tug',
          variantName: 'Small',
          regularCents: 2000,
        },
      }),
    );

  it('lists sales with status and item count, as a tab inside Promotions', async () => {
    server.use(
      http.get(`${API}/admin/flash-sales`, () =>
        HttpResponse.json({
          data: [sale(), sale({ id: 'f2', name: 'Old', status: 'ended', itemCount: 3 })],
        }),
      ),
    );
    renderApp('/admin/promotions/flash-sales');
    const rows = await screen.findAllByTestId('admin-flash-row');
    expect(rows[0]).toHaveTextContent('Weekend Woof');
    expect(rows[0]).toHaveTextContent('Scheduled');
    expect(rows[1]).toHaveTextContent('Ended');
    expect(rows[1]).toHaveTextContent('3');
    // An ended sale cannot be deleted.
    expect(within(rows[1]!).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    expect(within(rows[0]!).getByRole('button', { name: /Delete/ })).toBeInTheDocument();
  });

  it('shows the regular price and % off for a typed SKU, and sends cents', async () => {
    let posted: unknown;
    server.use(
      http.get(`${API}/admin/flash-sales`, () => HttpResponse.json({ data: [] })),
      lookup(),
      http.post(`${API}/admin/flash-sales`, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ data: sale() }, { status: 201 });
      }),
    );
    renderApp('/admin/promotions/flash-sales');
    await userEvent.click(await screen.findByRole('button', { name: 'New flash sale' }));
    const form = await screen.findByTestId('admin-flash-form');
    await userEvent.type(within(form).getByLabelText('Sale name'), 'Weekend Woof');
    await userEvent.type(within(form).getByLabelText('Starts (UTC)'), '2026-11-20T10:00');
    await userEvent.type(within(form).getByLabelText('Ends (UTC)'), '2026-11-21T10:00');
    await userEvent.type(within(form).getByLabelText('SKU, item 1'), 'PW-ROPE-S');
    await userEvent.type(within(form).getByLabelText('Sale price (EUR), item 1'), '15');
    const info = within(form).getByTestId('flash-item-info');
    // The lookup runs when the SKU box loses focus.
    await userEvent.tab({ shift: false });
    await userEvent.click(within(form).getByLabelText('Sale price (EUR), item 1'));
    await waitFor(() => expect(info).toHaveTextContent('Regular price €20.00. 25% off.'));

    await userEvent.click(within(form).getByRole('button', { name: 'Create sale' }));
    await waitFor(() =>
      expect(posted).toMatchObject({
        name: 'Weekend Woof',
        startsAt: '2026-11-20T10:00:00.000Z',
        items: [{ variant: 'PW-ROPE-S', salePriceCents: 1500 }],
      }),
    );
  });

  it('warns when the typed price is not below the regular price', async () => {
    server.use(
      http.get(`${API}/admin/flash-sales`, () => HttpResponse.json({ data: [] })),
      lookup(),
    );
    renderApp('/admin/promotions/flash-sales');
    await userEvent.click(await screen.findByRole('button', { name: 'New flash sale' }));
    const form = await screen.findByTestId('admin-flash-form');
    await userEvent.type(within(form).getByLabelText('SKU, item 1'), 'PW-ROPE-S');
    await userEvent.type(within(form).getByLabelText('Sale price (EUR), item 1'), '20');
    await waitFor(() =>
      expect(within(form).getByTestId('flash-item-info')).toHaveTextContent(
        'The sale price must be below the regular price.',
      ),
    );
  });

  it('refuses bad input before sending, on the right fields', async () => {
    let posts = 0;
    server.use(
      http.get(`${API}/admin/flash-sales`, () => HttpResponse.json({ data: [] })),
      http.post(`${API}/admin/flash-sales`, () => {
        posts += 1;
        return HttpResponse.json({ data: sale() }, { status: 201 });
      }),
    );
    renderApp('/admin/promotions/flash-sales');
    await userEvent.click(await screen.findByRole('button', { name: 'New flash sale' }));
    const form = await screen.findByTestId('admin-flash-form');
    await userEvent.type(within(form).getByLabelText('Starts (UTC)'), '2026-11-21T10:00');
    await userEvent.type(within(form).getByLabelText('Ends (UTC)'), '2026-11-20T10:00');
    await userEvent.click(within(form).getByRole('button', { name: 'Create sale' }));
    expect(await within(form).findByText('Give the sale a name')).toBeVisible();
    expect(within(form).getByText('The end must be after the start')).toBeVisible();
    expect(within(form).getByText('Enter the SKU')).toBeVisible();
    expect(posts).toBe(0);
  });

  it('puts a server price refusal on the item row', async () => {
    server.use(
      http.get(`${API}/admin/flash-sales`, () => HttpResponse.json({ data: [] })),
      http.post(`${API}/admin/flash-sales`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: {
                formErrors: [],
                fieldErrors: {
                  'items.0.salePriceCents': [
                    'The sale price must be below the regular price (€20.00)',
                  ],
                },
              },
            },
          },
          { status: 400 },
        ),
      ),
    );
    renderApp('/admin/promotions/flash-sales');
    await userEvent.click(await screen.findByRole('button', { name: 'New flash sale' }));
    const form = await screen.findByTestId('admin-flash-form');
    await userEvent.type(within(form).getByLabelText('Sale name'), 'X');
    await userEvent.type(within(form).getByLabelText('Starts (UTC)'), '2026-11-20T10:00');
    await userEvent.type(within(form).getByLabelText('Ends (UTC)'), '2026-11-21T10:00');
    await userEvent.type(within(form).getByLabelText('SKU, item 1'), 'PW-ROPE-S');
    await userEvent.type(within(form).getByLabelText('Sale price (EUR), item 1'), '19');
    await userEvent.click(within(form).getByRole('button', { name: 'Create sale' }));
    expect(
      await within(form).findByText('The sale price must be below the regular price (€20.00)'),
    ).toBeVisible();
  });

  it('shows the Omnibus reference per item on a live sale, locks it, and can end it now', async () => {
    let ended = 0;
    server.use(
      http.get(`${API}/admin/flash-sales`, () =>
        HttpResponse.json({
          data: [
            sale({
              status: 'active',
              items: [
                item({ referenceCents: 1899 }),
                item({ id: 'i2', sku: 'PW-BALL', variantId: 'v2', referenceCents: null }),
              ],
              itemCount: 2,
            }),
          ],
        }),
      ),
      http.post(`${API}/admin/flash-sales/f1/end`, () => {
        ended += 1;
        return HttpResponse.json({ data: sale({ status: 'ended' }) });
      }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderApp('/admin/promotions/flash-sales');
    await userEvent.click(await screen.findByRole('button', { name: /View/ }));
    const detail = await screen.findByTestId('admin-flash-detail');
    const refs = within(detail).getAllByTestId('flash-omnibus');
    expect(refs[0]).toHaveTextContent('Lowest 30-day price: €18.99');
    expect(refs[1]).toHaveTextContent('No history');
    expect(within(detail).queryByLabelText('Sale name')).not.toBeInTheDocument();
    await userEvent.click(within(detail).getByRole('button', { name: 'End now' }));
    await waitFor(() => expect(ended).toBe(1));
  });
});
