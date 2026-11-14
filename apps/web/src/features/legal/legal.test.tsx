import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import * as tracking from '../../lib/track';
import { renderApp } from '../../test/render';

import { LEGAL_PAGES, legalBody } from './pages';

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

describe('legal page translations', () => {
  const headings = (md: string) => md.match(/^## /gm)?.length ?? 0;
  const bullets = (md: string) => md.match(/^(- |\d+\. )/gm)?.length ?? 0;

  it.each(LEGAL_PAGES.map((p) => [p.path, p] as const))(
    '/%s has a German and a French text with the same structure as English',
    (_path, page) => {
      for (const lang of ['de', 'fr'] as const) {
        const body = legalBody(page, lang);
        expect(body, lang).not.toBe(page.body);
        expect(headings(body), `${lang} headings`).toBe(headings(page.body));
        expect(bullets(body), `${lang} list items`).toBe(bullets(page.body));
      }
      expect(legalBody(page, 'de')).not.toBe(legalBody(page, 'fr'));
    },
  );

  it('falls back to English for a language without a file', () => {
    const page = LEGAL_PAGES[0]!;
    expect(legalBody(page, 'en')).toBe(page.body);
    expect(legalBody({ ...page, bodies: {} }, 'de')).toBe(page.body);
  });

  it.each([
    ['/de-de/privacy', 'Die Kurzfassung'],
    ['/fr-fr/privacy', 'En bref'],
    ['/eu-en/privacy', 'The short version'],
    ['/uk-en/about', 'Who we are'],
  ])('%s shows the page in the store language', async (path, heading) => {
    renderApp(path);
    expect(await screen.findByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
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
