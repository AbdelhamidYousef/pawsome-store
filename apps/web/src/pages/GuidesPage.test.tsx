import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import * as tracking from '../lib/track';
import { makeGuideCard, makeGuideDetail } from '../test/fixtures';
import { renderApp } from '../test/render';
import { API, server } from '../test/server';

const meta = { page: 1, limit: 9, total: 2, totalPages: 1 };

describe('guides list', () => {
  it('lists guides with a category and reading time, and the topic tabs', async () => {
    server.use(
      http.get(`${API}/guides`, () =>
        HttpResponse.json({
          data: [makeGuideCard(), makeGuideCard({ slug: 'two', title: 'Second guide' })],
          meta,
        }),
      ),
      http.get(`${API}/guide-categories`, () =>
        HttpResponse.json({ data: [{ slug: 'dogs', name: 'Dogs', guideCount: 2 }] }),
      ),
    );
    renderApp('/guides');
    const cards = await screen.findAllByTestId('guide-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute('href', '/guides/choosing-a-dog-toy');
    expect(within(cards[0]!).getByText('3 min read')).toBeInTheDocument();
    const topics = within(await screen.findByRole('navigation', { name: 'Guide topics' }));
    expect(await topics.findByText(/Dogs/)).toHaveAttribute('href', '/guides?category=dogs');
  });

  it('sends the category from the URL to the API', async () => {
    const seen = vi.fn();
    server.use(
      http.get(`${API}/guides`, ({ request }) => {
        seen(new URL(request.url).searchParams.get('category'));
        return HttpResponse.json({ data: [], meta: { ...meta, total: 0, totalPages: 0 } });
      }),
    );
    renderApp('/guides?category=cats');
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
    expect(seen).toHaveBeenCalledWith('cats');
  });
});

describe('guide page', () => {
  it('shows the article, linked products as product cards, and related guides', async () => {
    const spy = vi.spyOn(tracking, 'track');
    server.use(
      http.get(`${API}/guides/choosing-a-dog-toy`, () =>
        HttpResponse.json({ data: makeGuideDetail() }),
      ),
    );
    renderApp('/guides/choosing-a-dog-toy');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'How to choose a dog toy' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'What to look for' })).toBeInTheDocument();
    expect(
      within(screen.getByTestId('guide-products')).getAllByTestId('product-card'),
    ).toHaveLength(1);
    expect(within(screen.getByTestId('guide-related')).getAllByTestId('guide-card')).toHaveLength(
      1,
    );
    expect(spy).toHaveBeenCalledWith({
      name: 'view_guide',
      slug: 'choosing-a-dog-toy',
      category: 'dogs',
    });
    expect(document.head.querySelector('meta[property="og:type"]')).toHaveAttribute(
      'content',
      'article',
    );
    expect(document.head.querySelector('meta[property="article:published_time"]')).toBeTruthy();
  });

  it("sets a canonical and hreflang links with each language's slug", async () => {
    server.use(
      http.get(`${API}/guides/kauspielzeug-waehlen`, () =>
        HttpResponse.json({
          data: makeGuideDetail({
            slug: 'kauspielzeug-waehlen',
            slugs: { en: 'choosing-a-dog-toy', de: 'kauspielzeug-waehlen', fr: 'choisir-un-jouet' },
          }),
        }),
      ),
    );
    renderApp('/de-de/guides/kauspielzeug-waehlen');
    await screen.findByRole('heading', { level: 1 });
    const href = (sel: string) => document.head.querySelector(sel)?.getAttribute('href') ?? '';
    expect(href('link[rel="canonical"]')).toMatch(/\/de-de\/guides\/kauspielzeug-waehlen$/);
    expect(href('link[rel="alternate"][hreflang="fr-FR"]')).toMatch(
      /\/fr-fr\/guides\/choisir-un-jouet$/,
    );
    expect(href('link[rel="alternate"][hreflang="en-GB"]')).toMatch(
      /\/uk-en\/guides\/choosing-a-dog-toy$/,
    );
  });

  it('does not render raw HTML written inside the Markdown', async () => {
    server.use(
      http.get(`${API}/guides/x`, () =>
        HttpResponse.json({
          data: makeGuideDetail({
            slug: 'x',
            bodyMd: 'Hello <script>window.__pwned = 1</script><img src=x onerror="alert(1)"> world',
          }),
        }),
      ),
    );
    renderApp('/guides/x');
    const body = await screen.findByTestId('guide-body');
    expect(body.querySelector('script')).toBeNull();
    expect(body.querySelector('img')).toBeNull();
    expect(body).toHaveTextContent('Hello');
  });

  it('shows the not-found page for an unknown guide', async () => {
    server.use(
      http.get(`${API}/guides/nope`, () =>
        HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'x' } }, { status: 404 }),
      ),
    );
    renderApp('/guides/nope');
    expect(await screen.findByText(/find that guide/)).toBeInTheDocument();
  });
});
