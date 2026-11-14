import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import * as tracking from '../../lib/track';
import { makeCard, makeProduct, makeReview, makeReviewList } from '../../test/fixtures';
import { renderApp, renderWithProviders } from '../../test/render';
import { API, server, signedInAs } from '../../test/server';
import { ProductCard } from '../catalog/ProductCard';

import { RatingStars } from './RatingStars';

const reviews = [
  makeReview({ id: 'r1', title: 'Tough rope', photos: [{ id: 'p1', path: '/reviews/a.webp' }] }),
  makeReview({
    id: 'r2',
    title: 'Fine',
    verifiedBuyer: false,
    petAgeMonths: null,
    petWeightG: null,
  }),
];
const served = (list = makeReviewList(reviews, { topics: [{ topic: 'rope', count: 4 }] })) =>
  server.use(http.get(`${API}/products/rope-tug/reviews`, () => HttpResponse.json(list)));

describe('rating stars', () => {
  it('has one accessible name and fills to the tenth', () => {
    renderWithProviders(<RatingStars tenths={46} />);
    const stars = screen.getByRole('img', { name: '4.6 out of 5' });
    expect(stars.querySelector('span[style]')).toHaveStyle({ width: '92%' });
  });

  it('shows on a product card only when there are reviews', () => {
    const { unmount } = renderWithProviders(
      <MemoryRouter>
        <ul>
          <ProductCard product={makeCard({ rating: { count: 12, averageTenths: 47 } })} />
        </ul>
      </MemoryRouter>,
    );
    expect(screen.getByRole('img', { name: '4.7 out of 5' })).toBeInTheDocument();
    expect(screen.getByText('4.7 (12)')).toBeInTheDocument();
    unmount();
    renderWithProviders(
      <MemoryRouter>
        <ul>
          <ProductCard product={makeCard()} />
        </ul>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('img', { name: /out of 5/ })).not.toBeInTheDocument();
  });
});

describe('reviews section on the product page', () => {
  it('shows the summary, the breakdown, the recommend share and the cards', async () => {
    served();
    renderApp('/products/rope-tug');
    const section = await screen.findByTestId('reviews-section');
    expect(await within(section).findByText('4.6')).toBeInTheDocument();
    expect(within(section).getByText('92% would recommend this')).toBeInTheDocument();
    expect(within(section).getByTestId('review-breakdown')).toBeInTheDocument();
    const cards = await within(section).findAllByTestId('review-card');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]!).getByText('Verified buyer')).toBeInTheDocument();
    expect(
      within(cards[0]!).getByText('Pet age 2 years 6 months, weighs 11.5 kg, bought size M'),
    ).toBeInTheDocument();
    expect(within(cards[1]!).queryByText('Verified buyer')).not.toBeInTheDocument();
  });

  it('renders review text as text, never as HTML', async () => {
    served(
      makeReviewList([makeReview({ body: 'Great <img src=x onerror=alert(1)> toy, honestly.' })]),
    );
    renderApp('/products/rope-tug');
    expect(await screen.findByText(/Great <img src=x/)).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('sorts and filters through the URL and asks the API with those params', async () => {
    const seen: string[] = [];
    server.use(
      http.get(`${API}/products/rope-tug/reviews`, ({ request }) => {
        seen.push(new URL(request.url).search);
        return HttpResponse.json(
          makeReviewList(reviews, { topics: [{ topic: 'rope', count: 4 }] }),
        );
      }),
    );
    const router = renderApp('/products/rope-tug');
    await screen.findAllByTestId('review-card');
    await userEvent.selectOptions(screen.getByLabelText('Sort reviews'), 'newest');
    await waitFor(() => expect(router.state.location.search).toContain('rsort=newest'));
    await userEvent.click(screen.getByRole('button', { name: /^5 star reviews/ }));
    await waitFor(() => expect(router.state.location.search).toContain('rstar=5'));
    await userEvent.click(screen.getByTestId('review-topic'));
    await waitFor(() => expect(router.state.location.search).toContain('rtopic=rope'));
    await waitFor(() => expect(seen.at(-1)).toContain('topic=rope'));
    expect(seen.at(-1)).toContain('sort=newest');
    expect(seen.at(-1)).toContain('rating=5');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(router.state.location.search).not.toContain('rstar'));
  });

  it('opens a photo in a dialog', async () => {
    served();
    renderApp('/products/rope-tug');
    await userEvent.click(await screen.findByTestId('review-photo'));
    expect(await screen.findByAltText(/Photo from Ada L\.'s review/)).toHaveAttribute(
      'src',
      '/reviews/a.webp',
    );
  });

  it('invites a guest to sign in and shows no form', async () => {
    served();
    renderApp('/products/rope-tug');
    const link = await screen.findByRole('link', { name: 'Sign in' });
    expect(link.getAttribute('href')).toContain('/login?next=');
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });

  it('says so when there are no reviews yet', async () => {
    renderApp('/products/rope-tug');
    expect(await screen.findByText(/No reviews yet/)).toBeInTheDocument();
  });

  it('a guest cannot mark helpful; a signed-in user can, and it is tracked', async () => {
    server.use(signedInAs({ id: 'u9' }));
    served();
    const spy = vi.spyOn(tracking, 'track').mockImplementation(() => undefined);
    let voted = 0;
    server.use(
      http.post(`${API}/reviews/r1/helpful`, () => {
        voted += 1;
        return HttpResponse.json({ data: { helpfulCount: 3, voted: true } });
      }),
    );
    renderApp('/products/rope-tug');
    const buttons = await screen.findAllByTestId('review-helpful');
    await userEvent.click(buttons[0]!);
    await waitFor(() => expect(voted).toBe(1));
    expect(spy).toHaveBeenCalledWith({ name: 'review_helpful', reviewId: 'r1', voted: true });
    spy.mockRestore();
  });
});

describe('review form', () => {
  async function openForm(list = makeReviewList()) {
    server.use(signedInAs({ id: 'u9' }));
    served(list);
    renderApp('/products/rope-tug');
    await userEvent.click(await screen.findByRole('button', { name: 'Write a review' }));
    return screen.findByTestId('review-form');
  }

  it('shows validation messages and does not post an invalid form', async () => {
    let posted = false;
    server.use(
      http.post(`${API}/products/rope-tug/reviews`, () => {
        posted = true;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const form = await openForm();
    await userEvent.click(within(form).getByRole('button', { name: 'Submit review' }));
    expect(await within(form).findByText('Choose a star rating')).toBeInTheDocument();
    expect(within(form).getByText('Give your review a short title')).toBeInTheDocument();
    expect(within(form).getByText('Please write at least 20 characters')).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('posts multipart with kg converted to grams and then shows the pending message', async () => {
    const spy = vi.spyOn(tracking, 'track').mockImplementation(() => undefined);
    let received: FormData | null = null;
    server.use(
      http.post(`${API}/products/rope-tug/reviews`, async ({ request }) => {
        received = await request.formData();
        return HttpResponse.json(
          { data: { id: 'new', status: 'pending', verifiedBuyer: true } },
          { status: 201 },
        );
      }),
    );
    const form = await openForm();
    await userEvent.click(within(form).getByLabelText('4 stars'));
    await userEvent.type(within(form).getByLabelText('Title'), 'Great tug');
    await userEvent.type(
      within(form).getByLabelText('Your review'),
      'My dog plays with it every day and it is still in one piece.',
    );
    await userEvent.type(within(form).getByLabelText('Pet weight (kg)'), '4.5');
    await userEvent.type(within(form).getByLabelText('Pet age (months)'), '18');
    const file = new File([new Uint8Array([1, 2, 3])], 'dog.jpg', { type: 'image/jpeg' });
    await userEvent.upload(within(form).getByLabelText(/Photos/), file);
    expect(within(form).getByAltText('Preview of dog.jpg')).toBeInTheDocument();
    await userEvent.click(within(form).getByRole('button', { name: 'Submit review' }));

    expect(await screen.findByTestId('review-pending')).toHaveTextContent('waiting for approval');
    const body = received as unknown as FormData;
    expect(body.get('rating')).toBe('4');
    expect(body.get('petWeightG')).toBe('4500');
    expect(body.get('petAgeMonths')).toBe('18');
    expect(body.get('wouldRecommend')).toBe('true');
    // msw's FormData parser hands files back as generic blobs, so check there is one and its size.
    expect((body.getAll('photos')[0] as Blob).size).toBe(3);
    expect(spy).toHaveBeenCalledWith({
      name: 'review_submitted',
      productId: makeProduct().id,
      rating: 4,
      photos: 1,
    });
    spy.mockRestore();
  });

  it('refuses a fourth photo and a wrong file type before any upload', async () => {
    const form = await openForm();
    const input = within(form).getByLabelText(/Photos/);
    const jpg = (n: string) => new File([new Uint8Array([1])], n, { type: 'image/jpeg' });
    await userEvent.upload(input, [jpg('a.jpg'), jpg('b.jpg'), jpg('c.jpg')]);
    expect(input).toBeDisabled();
    fireEvent.change(input, { target: { files: [jpg('d.jpg')] } });
    // A wrong type on a fresh form:
  });

  it('rejects a non-image file', async () => {
    const form = await openForm();
    const input = within(form).getByLabelText(/Photos/);
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'evil.gif', { type: 'image/gif' })] },
    });
    expect(await within(form).findByRole('alert')).toHaveTextContent('use a JPEG, PNG or WebP');
  });

  it('hides the photo picker when uploads are switched off', async () => {
    const form = await openForm(makeReviewList([], { uploadsEnabled: false }));
    expect(within(form).queryByLabelText(/Photos/)).not.toBeInTheDocument();
    expect(within(form).getByText(/Photo uploads are coming soon/)).toBeInTheDocument();
  });

  it('shows a server error such as a duplicate review', async () => {
    server.use(
      http.post(`${API}/products/rope-tug/reviews`, () =>
        HttpResponse.json(
          { error: { code: 'CONFLICT', message: 'You have already reviewed this product.' } },
          { status: 409 },
        ),
      ),
    );
    const form = await openForm();
    await userEvent.click(within(form).getByLabelText('5 stars'));
    await userEvent.type(within(form).getByLabelText('Title'), 'Great tug');
    await userEvent.type(
      within(form).getByLabelText('Your review'),
      'My dog plays with it every day and it is still in one piece.',
    );
    await userEvent.click(within(form).getByRole('button', { name: 'Submit review' }));
    expect(
      await within(form).findByText('You have already reviewed this product.'),
    ).toBeInTheDocument();
  });
});

describe('product page extras', () => {
  it('adds aggregateRating JSON-LD only when the product has reviews', async () => {
    server.use(
      http.get(`${API}/products/rope-tug`, () =>
        HttpResponse.json({
          data: makeProduct({ rating: { count: 12, averageTenths: 46 } }),
        }),
      ),
    );
    renderApp('/products/rope-tug');
    await screen.findByRole('link', { name: /4\.6 \(12 reviews\)/ });
    const script = document.head.querySelector('script[data-seo="json-ld"]');
    const node = JSON.parse(script?.textContent ?? '{}') as {
      aggregateRating?: { ratingValue: string; reviewCount: number };
    };
    expect(node.aggregateRating).toMatchObject({ ratingValue: '4.6', reviewCount: 12 });
  });

  it('has no aggregateRating without reviews', async () => {
    renderApp('/products/rope-tug');
    await screen.findByRole('heading', { level: 1, name: 'Rope Tug' });
    expect(document.head.querySelector('script[data-seo="json-ld"]')).toBeNull();
  });
});
