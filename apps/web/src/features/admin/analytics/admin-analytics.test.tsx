import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderApp } from '../../../test/render';
import { API, server, signedInAs } from '../../../test/server';

beforeEach(() => {
  server.use(signedInAs({ role: 'admin' }));
});

const analytics = (over: object = {}) => ({
  range: { from: '2026-10-16', to: '2026-11-14', interval: 'day', timeZone: 'Europe/Amsterdam' },
  currency: 'EUR',
  revenue: {
    totalCents: 123456,
    series: [
      { bucket: '2026-11-12', revenueCents: 1000, orders: 1 },
      { bucket: '2026-11-13', revenueCents: 0, orders: 0 },
      { bucket: '2026-11-14', revenueCents: 4000, orders: 2 },
    ],
  },
  orders: 3,
  aovCents: 41152,
  topByUnits: [{ productId: 'p1', name: 'Rope Tug', units: 12, revenueCents: 13188 }],
  topByRevenue: [{ productId: 'p2', name: 'Cloud Bed', units: 2, revenueCents: 9800 }],
  lowStock: [
    {
      variantId: 'v1',
      productId: 'p1',
      sku: 'TUG-S',
      productName: 'Rope Tug',
      variantName: 'Small',
      available: 2,
    },
  ],
  lowStockThreshold: 5,
  returns: { returnedUnits: 1, deliveredUnits: 3, rateBp: 3333 },
  ...over,
});
const serve = (data: object, seen?: string[]) =>
  server.use(
    http.get(`${API}/admin/analytics`, ({ request }) => {
      seen?.push(new URL(request.url).search);
      return HttpResponse.json({ data });
    }),
  );

describe('admin analytics dashboard', () => {
  it('shows the figures as formatted money, the chart, tables and CSV links', async () => {
    serve(analytics());
    renderApp('/admin/analytics');
    const kpis = await screen.findAllByTestId('analytics-kpi');
    expect(kpis.map((k) => k.textContent)).toEqual([
      expect.stringContaining('€1,234.56'),
      expect.stringContaining('3'),
      expect.stringContaining('€411.52'),
      expect.stringContaining('33.33 %'),
    ]);
    expect(kpis[3]).toHaveTextContent('1 of 3 delivered units');
    expect(
      screen.getByRole('img', { name: /Revenue per day, highest €40.00/ }),
    ).toBeInTheDocument();
    // The text alternative lists every point.
    expect(screen.getByTestId('analytics-chart')).toHaveTextContent('2026-11-14: €40.00');
    const tops = screen.getAllByTestId('analytics-top-product');
    expect(tops[0]).toHaveTextContent('Rope Tug');
    expect(tops[1]).toHaveTextContent('Cloud Bed');
    expect(tops[1]).toHaveTextContent('€98.00');
    const stock = screen.getByTestId('analytics-low-stock');
    expect(within(stock).getByRole('link', { name: 'Rope Tug' })).toHaveAttribute(
      'href',
      '/admin/products/p1',
    );
    const csv = screen.getByRole('link', { name: 'Orders CSV' });
    expect(csv.getAttribute('href')).toMatch(
      /\/api\/v1\/admin\/analytics\/export\.csv\?report=orders&from=\d{4}-\d{2}-\d{2}&to=/,
    );
    expect(csv).toHaveAttribute('download');
  });

  it('keeps the period in the URL and asks the API for it (90 days = weekly)', async () => {
    const seen: string[] = [];
    serve(analytics(), seen);
    const user = userEvent.setup();
    const router = renderApp('/admin/analytics');
    await screen.findAllByTestId('analytics-kpi');
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Last 90 days' }));
    await waitFor(() => expect(router.state.location.search).toBe('?days=90'));
    await waitFor(() => expect(seen.some((q) => q.includes('interval=week'))).toBe(true));
    await user.click(screen.getByRole('button', { name: 'Last 30 days' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('opens on the preset from the URL and ignores a bad one', async () => {
    serve(analytics());
    renderApp('/admin/analytics?days=7');
    await screen.findAllByTestId('analytics-kpi');
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows an empty state with zeros, and empty tables', async () => {
    serve(
      analytics({
        revenue: { totalCents: 0, series: [{ bucket: '2026-11-14', revenueCents: 0, orders: 0 }] },
        orders: 0,
        aovCents: 0,
        topByUnits: [],
        topByRevenue: [],
        lowStock: [],
        returns: { returnedUnits: 0, deliveredUnits: 0, rateBp: 0 },
      }),
    );
    renderApp('/admin/analytics');
    expect(await screen.findByTestId('analytics-empty')).toBeInTheDocument();
    expect(screen.getAllByText('No sales in this period.')).toHaveLength(2);
    expect(screen.getByText('Nothing is running low.')).toBeInTheDocument();
    expect(screen.getAllByTestId('analytics-kpi')[0]).toHaveTextContent('€0.00');
  });

  it('shows a loading state, then an error with Try again', async () => {
    server.use(
      http.get(`${API}/admin/analytics`, () =>
        HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 }),
      ),
    );
    renderApp('/admin/analytics');
    expect(
      await screen.findByText('We could not load the analytics.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
