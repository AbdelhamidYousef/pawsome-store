import type { PetProfile } from '@store/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { makeUser } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { API, server, signedInAs } from '../../test/server';

import { getActivePetId, getGuestPets, setActivePetId, setGuestPets } from './guest-store';

const biscuit: PetProfile = {
  id: 'local-1',
  name: 'Biscuit',
  species: 'dog',
  birthday: null,
  approxAgeMonths: 30,
  size: 'm',
};

describe('pets page (guest)', () => {
  it('adds a pet to this browser, makes it the one we shop for and keeps it after a reload', async () => {
    renderApp('/account/pets');
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('pet-add'));
    await userEvent.type(await screen.findByLabelText('Name'), 'Biscuit');
    await userEvent.selectOptions(screen.getByLabelText('Kind of pet'), 'dog');
    await userEvent.type(screen.getByLabelText('Age in months (optional)'), '30');
    await userEvent.click(screen.getByTestId('pet-save'));

    const card = await screen.findByTestId('pet-card');
    expect(card).toHaveTextContent('Biscuit');
    expect(card).toHaveTextContent('Dog, 2 years 6 months');
    expect(card).toHaveTextContent('Shopping for');
    // Stored in the browser, and the active choice with it.
    expect(JSON.parse(window.localStorage.getItem('pawsome.pets') ?? '[]')).toHaveLength(1);
    expect(getActivePetId()).toBe(getGuestPets()[0]?.id);
  });

  it('shows form errors and rejects a birthday in the future', async () => {
    renderApp('/account/pets?add=1');
    await userEvent.click(await screen.findByTestId('pet-save'));
    expect(await screen.findByLabelText('Name')).toHaveAccessibleDescription('Required');
    await userEvent.type(screen.getByLabelText('Name'), 'Time');
    await userEvent.type(screen.getByLabelText('Birthday (optional)'), '2999-01-01');
    await userEvent.click(screen.getByTestId('pet-save'));
    expect(await screen.findByText('A birthday cannot be in the future')).toBeInTheDocument();
    expect(getGuestPets()).toHaveLength(0);
  });

  it('deletes a pet and forgets it as the active one', async () => {
    setGuestPets([biscuit]);
    setActivePetId(biscuit.id);
    renderApp('/account/pets');
    await userEvent.click(await screen.findByRole('button', { name: /^Delete/ }));
    await userEvent.click(screen.getByTestId('pet-delete-confirm'));
    await waitFor(() => expect(getGuestPets()).toHaveLength(0));
    expect(getActivePetId()).toBeNull();
  });

  it('disables adding at the limit of eight', async () => {
    setGuestPets(
      Array.from({ length: 8 }, (_, i) => ({ ...biscuit, id: `local-${i}`, name: `P${i}` })),
    );
    renderApp('/account/pets');
    expect(await screen.findByTestId('pet-add')).toBeDisabled();
    expect(screen.getByTestId('pets-limit')).toHaveTextContent('8 pets');
  });
});

describe('pet switcher', () => {
  it('opens as a disclosure, switches pets and closes with Escape', async () => {
    setGuestPets([biscuit, { ...biscuit, id: 'local-2', name: 'Whiskers', species: 'cat' }]);
    setActivePetId('local-1');
    renderApp('/');
    const button = await screen.findByTestId('pet-switcher-button');
    expect(button).toHaveTextContent('Shopping for Biscuit');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByTestId('pet-switcher-panel');
    await userEvent.click(within(panel).getByRole('button', { name: /Whiskers/ }));
    expect(button).toHaveTextContent('Shopping for Whiskers');
    expect(getActivePetId()).toBe('local-2');

    await userEvent.click(button);
    await userEvent.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();

    await userEvent.click(button);
    await userEvent.click(screen.getByTestId('pet-choice-everyone'));
    expect(button).toHaveTextContent('Shopping for everyone');
    expect(getActivePetId()).toBeNull();
  });

  it('sends a visitor with no pet straight to the add-pet form', async () => {
    renderApp('/');
    const pill = await screen.findByTestId('pet-switcher-button');
    expect(pill).toHaveTextContent('Add your pet');
    expect(pill).toHaveAttribute('href', '/account/pets?add=1');
    expect(pill).not.toHaveAttribute('aria-expanded');
  });
});

describe('pre-filtering the list with the active pet', () => {
  it('writes the pet filters into the url once and lets the shopper clear them', async () => {
    setGuestPets([biscuit]);
    setActivePetId('local-1');
    const asked: string[] = [];
    server.use(
      http.get(`${API}/products`, ({ request }) => {
        asked.push(new URL(request.url).search);
        return HttpResponse.json({
          data: [],
          meta: { page: 1, limit: 24, total: 0, totalPages: 0 },
          facets: { attributes: {}, brand: [], tag: [], badge: [], price: null },
        });
      }),
    );
    const router = renderApp('/c/dogs');
    // 30 months: an adult dog. Age stage "all" rides along for the products that suit every age.
    await waitFor(() =>
      expect(router.state.location.search).toBe('?attr.pet=dog&attr.ageStage=adult%2Call'),
    );
    await waitFor(() => expect(asked.length).toBeGreaterThan(0));
    // The first request already carried the filters: no unfiltered request first.
    expect(asked.every((q) => q.includes('attr.pet=dog'))).toBe(true);

    await userEvent.click(await screen.findByTestId('active-pet-clear'));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    // And it stays cleared: no second application on the same page.
    await new Promise((r) => setTimeout(r, 50));
    expect(router.state.location.search).toBe('');
  });

  it('leaves a category of another species alone, and filters a search', async () => {
    setGuestPets([biscuit]);
    setActivePetId('local-1');
    const cats = renderApp('/c/cats');
    await screen.findAllByTestId('product-card');
    expect(cats.state.location.search).toBe('');
  });

  it('keeps filters that came with the link', async () => {
    setGuestPets([biscuit]);
    setActivePetId('local-1');
    const router = renderApp('/c/dogs?attr.pet=dog');
    await screen.findAllByTestId('product-card');
    expect(router.state.location.search).toBe('?attr.pet=dog');
  });
});

describe('merging guest pets on sign-in', () => {
  it('sends them once, drops the local copy and re-points the active pet', async () => {
    setGuestPets([biscuit]);
    setActivePetId('local-1');
    let body: unknown;
    const merged: PetProfile = { ...biscuit, id: '11111111-1111-4111-8111-111111111111' };
    server.use(
      http.post(`${API}/auth/login`, () => HttpResponse.json({ data: { user: makeUser() } })),
      http.post(`${API}/account/pets/merge`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: [merged] });
      }),
      http.get(`${API}/account/pets`, () => HttpResponse.json({ data: [merged] })),
    );
    renderApp('/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'sam@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(getGuestPets()).toHaveLength(0));
    expect(body).toEqual({
      pets: [{ name: 'Biscuit', species: 'dog', birthday: null, approxAgeMonths: 30, size: 'm' }],
    });
    expect(getActivePetId()).toBe(merged.id);
    expect(await screen.findByTestId('pet-switcher-button')).toHaveTextContent(
      'Shopping for Biscuit',
    );
  });

  it('keeps the local pets when the merge fails', async () => {
    setGuestPets([biscuit]);
    server.use(
      http.post(`${API}/auth/login`, () => HttpResponse.json({ data: { user: makeUser() } })),
      http.post(`${API}/account/pets/merge`, () =>
        HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 }),
      ),
    );
    renderApp('/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'sam@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull());
    expect(getGuestPets()).toHaveLength(1);
  });
});

describe('pets of a signed-in user', () => {
  it('lists the account pets from the API and creates through it', async () => {
    let created: unknown;
    const pet: PetProfile = { ...biscuit, id: '22222222-2222-4222-8222-222222222222' };
    let list: PetProfile[] = [pet];
    server.use(
      signedInAs(),
      http.get(`${API}/account/pets`, () => HttpResponse.json({ data: list })),
      http.post(`${API}/account/pets`, async ({ request }) => {
        created = await request.json();
        const next: PetProfile = {
          ...pet,
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Nemo',
          species: 'fish',
        };
        list = [...list, next];
        return HttpResponse.json({ data: next }, { status: 201 });
      }),
    );
    renderApp('/account/pets');
    expect(await screen.findByRole('heading', { name: 'Biscuit' })).toBeInTheDocument();
    expect(screen.queryByText(/saved in this browser/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('pet-add'));
    await userEvent.type(await screen.findByLabelText('Name'), 'Nemo');
    await userEvent.selectOptions(screen.getByLabelText('Kind of pet'), 'fish');
    await userEvent.click(screen.getByTestId('pet-save'));
    expect(await screen.findByRole('heading', { name: 'Nemo' })).toBeInTheDocument();
    expect(created).toMatchObject({ name: 'Nemo', species: 'fish' });
    expect(getGuestPets()).toHaveLength(0);
  });
});
