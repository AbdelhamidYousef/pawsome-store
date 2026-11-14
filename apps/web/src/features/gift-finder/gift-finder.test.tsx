import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { makeCard, makeList } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { API, server } from '../../test/server';

describe('gift finder wizard', () => {
  it('starts at question 1, needs an answer, and moves through the four questions via the URL', async () => {
    const router = renderApp('/gift-finder');
    expect(await screen.findByTestId('gift-progress')).toHaveTextContent('Question 1 of 4');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Who is the gift for?');
    // First load leaves focus alone (no ring drawn around the question).
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();

    await userEvent.click(screen.getByTestId('gift-next'));
    expect(screen.getByTestId('gift-error')).toHaveTextContent('Pick one');

    await userEvent.click(screen.getByLabelText('A dog'));
    await userEvent.click(screen.getByTestId('gift-next'));
    await waitFor(() => expect(router.state.location.search).toBe('?pet=dog&step=2'));
    expect(screen.getByTestId('gift-progress')).toHaveTextContent('Question 2 of 4');
    // Focus moves to the new question for screen readers.
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus());

    await userEvent.click(screen.getByLabelText('Grown up'));
    await userEvent.click(screen.getByTestId('gift-next'));
    await userEvent.click(screen.getByLabelText('Up to €25.00'));
    await userEvent.click(screen.getByTestId('gift-next'));
    await userEvent.click(screen.getByLabelText('Playtime'));
    await userEvent.click(screen.getByRole('button', { name: 'Show my gift ideas' }));
    await waitFor(() =>
      expect(router.state.location.pathname + router.state.location.search).toBe(
        '/gift-finder/result?pet=dog&age=adult&budget=2500&goal=play',
      ),
    );
  });

  it('resumes where the answers stop, and ignores invalid ones', async () => {
    renderApp('/gift-finder?pet=cat&age=young');
    expect(await screen.findByTestId('gift-progress')).toHaveTextContent('Question 3 of 4');
    renderApp('/gift-finder?pet=horse&age=adult');
    expect((await screen.findAllByTestId('gift-progress')).at(-1)).toHaveTextContent(
      'Question 1 of 4',
    );
  });

  it('goes Back to the previous question with its answer kept, and allows changing it', async () => {
    const router = renderApp('/gift-finder?pet=cat&step=2');
    expect(await screen.findByTestId('gift-progress')).toHaveTextContent('Question 2 of 4');
    await userEvent.click(screen.getByRole('link', { name: 'Back' }));
    await waitFor(() =>
      expect(screen.getByTestId('gift-progress')).toHaveTextContent('Question 1 of 4'),
    );
    expect(screen.getByLabelText('A cat')).toBeChecked();
    expect(router.state.location.search).toBe('?pet=cat&step=1');
  });

  it('uses radio inputs in a fieldset with a legend, arrow keys included', async () => {
    renderApp('/gift-finder');
    const group = await screen.findByRole('group', { name: 'Who is the gift for?' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(7);
    radios[0]!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(radios[1]).toBeChecked();
  });

  it('sends a fully answered URL straight to the result', async () => {
    const router = renderApp('/gift-finder?pet=dog&age=adult&budget=2500&goal=play');
    await waitFor(() => expect(router.state.location.pathname).toBe('/gift-finder/result'));
  });
});

const dogToy = (over: Parameters<typeof makeCard>[0] = {}) =>
  makeCard({ attributes: { pet: 'dog', ageStage: 'all' }, categorySlug: 'dog-toys', ...over });

describe('gift finder result', () => {
  it('shows scored picks with a one-line why, asking the API for in-stock products of the pet', async () => {
    let asked = '';
    server.use(
      http.get(`${API}/products`, ({ request }) => {
        asked = new URL(request.url).search;
        return HttpResponse.json(
          makeList([
            dogToy({ id: 'a', slug: 'a', name: 'Rope Tug' }),
            dogToy({ id: 'b', slug: 'b', name: 'Dear Bed', categorySlug: 'dog-beds' }),
            dogToy({
              id: 'c',
              slug: 'c',
              name: 'Pricey Toy',
              price: { minCents: 9000, maxCents: 9000, currency: 'EUR' },
            }),
          ]),
        );
      }),
    );
    renderApp('/gift-finder/result?pet=dog&age=adult&budget=2500&goal=play');
    const picks = await screen.findAllByTestId('product-card');
    // Only the in-budget toy: the bed is not "play", the pricey toy is over 25.
    expect(picks).toHaveLength(1);
    expect(picks[0]).toHaveTextContent('Rope Tug');
    expect(screen.getAllByTestId('gift-why')[0]).toHaveTextContent('Great for playtime');
    expect(asked).toContain('attr.pet=dog');
    expect(asked).toContain('inStock=true');
    expect(screen.queryByTestId('gift-relaxed')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change my answers' })).toHaveAttribute(
      'href',
      '/gift-finder?pet=dog&age=adult&budget=2500&goal=play&step=1',
    );
  });

  it('says so when the budget had to be relaxed to find anything', async () => {
    server.use(
      http.get(`${API}/products`, () =>
        HttpResponse.json(
          makeList([dogToy({ price: { minCents: 9000, maxCents: 9000, currency: 'EUR' } })]),
        ),
      ),
    );
    renderApp('/gift-finder/result?pet=dog&age=adult&budget=1500&goal=play');
    expect(await screen.findByTestId('gift-relaxed')).toHaveTextContent(
      'Nothing matched up to €15.00, so we widened the budget.',
    );
    expect(screen.getAllByTestId('product-card')).toHaveLength(1);
  });

  it('shows at most six picks and is the same for the same URL', async () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      dogToy({ id: `p${i}`, slug: `p${i}`, name: `Toy ${String(i).padStart(2, '0')}` }),
    );
    server.use(http.get(`${API}/products`, () => HttpResponse.json(makeList(many))));
    renderApp('/gift-finder/result?pet=dog&age=any&budget=0&goal=play');
    const first = (await screen.findAllByTestId('product-card')).map((p) => p.textContent);
    expect(first).toHaveLength(6);
    expect(first[0]).toContain('Toy 00');
  });

  it('sends an invalid URL back to the quiz, keeping the valid answers so far', async () => {
    const router = renderApp('/gift-finder/result?pet=dog&age=adult&budget=7');
    await waitFor(() => expect(router.state.location.pathname).toBe('/gift-finder'));
    expect(router.state.location.search).toBe('?pet=dog&age=adult');
  });

  it('copies the link', async () => {
    server.use(http.get(`${API}/products`, () => HttpResponse.json(makeList([dogToy()]))));
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          copied = text;
          return Promise.resolve();
        },
      },
    });
    renderApp('/gift-finder/result?pet=dog&age=adult&budget=2500&goal=play');
    await userEvent.click(await screen.findByTestId('gift-copy'));
    expect(copied).toContain('/gift-finder/result?pet=dog');
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });

  it('has a message when nothing is in stock for the pet', async () => {
    server.use(http.get(`${API}/products`, () => HttpResponse.json(makeList([]))));
    renderApp('/gift-finder/result?pet=fish&age=any&budget=0&goal=play');
    expect(await screen.findByTestId('empty-state')).toHaveTextContent('nothing in stock');
  });
});
