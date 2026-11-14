import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import * as tracking from '../../lib/track';
import { renderApp } from '../../test/render';

import { LEGAL_PAGES } from './pages';

describe('legal pages', () => {
  it.each(LEGAL_PAGES.map((p) => [p.path, p.title] as const))(
    '/%s renders its title, text and the update notice',
    async (path, title) => {
      renderApp(`/${path}`);
      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(screen.getByTestId('demo-notice')).toHaveTextContent('Last updated');
      expect(
        within(screen.getByTestId('page-legal')).getAllByRole('heading', { level: 2 }).length,
      ).toBeGreaterThan(0);
    },
  );

  it('has a meaningful amount of text on every page (no empty placeholder)', () => {
    for (const page of LEGAL_PAGES) expect(page.body.length).toBeGreaterThan(200);
  });
});

describe('footer', () => {
  it('has the five link columns, the payment note and the withdrawal link', async () => {
    renderApp('/');
    const footer = within(await screen.findByTestId('footer'));
    for (const name of ['Shop', 'Guides', 'Help', 'Company', 'Legal']) {
      expect(footer.getByRole('navigation', { name })).toBeInTheDocument();
    }
    expect(footer.getByRole('link', { name: 'Withdraw from contract' })).toHaveAttribute(
      'href',
      '/withdraw',
    );
    expect(footer.getByRole('link', { name: 'Track your order' })).toHaveAttribute(
      'href',
      '/track-order',
    );
    expect(footer.getByTestId('payment-note')).toHaveTextContent('test mode');
  });

  it('reports the clicked group and label', async () => {
    const spy = vi.spyOn(tracking, 'track');
    const user = userEvent.setup();
    renderApp('/');
    const footer = within(await screen.findByTestId('footer'));
    await user.click(footer.getByRole('link', { name: 'Privacy notice' }));
    expect(spy).toHaveBeenCalledWith({
      name: 'footer_link',
      group: 'Legal',
      label: 'Privacy notice',
    });
  });
});
