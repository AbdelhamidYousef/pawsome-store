import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeHome } from '../../test/fixtures';

import { HeroCarousel } from './HeroCarousel';

const slides = makeHome().heroSlides;
const setup = () =>
  render(
    <MemoryRouter>
      <HeroCarousel slides={slides} />
    </MemoryRouter>,
  );
const visibleTitle = () => screen.getByRole('heading', { level: 2 }).textContent;

function mockMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  mockMotion(false);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('HeroCarousel', () => {
  it('is a labelled carousel with slide groups, one visible', () => {
    setup();
    expect(screen.getByRole('region', { name: 'Featured offers' })).toHaveAttribute(
      'aria-roledescription',
      'carousel',
    );
    expect(screen.getAllByRole('group', { hidden: true })).toHaveLength(3);
    expect(visibleTitle()).toBe('Happy tails start here');
  });

  it('rotates on its own, and has no pause button', () => {
    setup();
    act(() => void vi.advanceTimersByTime(6000));
    expect(visibleTitle()).toBe('Purr-fect playtime');
    expect(screen.queryByTestId('hero-toggle')).toBeNull();
    expect(screen.queryByRole('button', { name: /pause/i })).toBeNull();
  });

  it('never rotates for reduced motion', () => {
    mockMotion(true);
    setup();
    expect(screen.getByTestId('hero-carousel')).toHaveAttribute('data-playing', 'false');
    act(() => void vi.advanceTimersByTime(30_000));
    expect(visibleTitle()).toBe('Happy tails start here');
  });

  it('pauses while focus is inside, and resumes when it leaves', () => {
    setup();
    fireEvent.focus(screen.getByTestId('hero-next'));
    act(() => void vi.advanceTimersByTime(30_000));
    expect(visibleTitle()).toBe('Happy tails start here');
    fireEvent.blur(screen.getByTestId('hero-next'), { relatedTarget: document.body });
    act(() => void vi.advanceTimersByTime(6000));
    expect(visibleTitle()).toBe('Purr-fect playtime');
  });

  it('pauses while hovered', () => {
    setup();
    fireEvent.mouseEnter(screen.getByTestId('hero-carousel'));
    act(() => void vi.advanceTimersByTime(30_000));
    expect(visibleTitle()).toBe('Happy tails start here');
    fireEvent.mouseLeave(screen.getByTestId('hero-carousel'));
    act(() => void vi.advanceTimersByTime(6000));
    expect(visibleTitle()).toBe('Purr-fect playtime');
  });

  it('moves with prev, next and the dots, wrapping around', () => {
    setup();
    fireEvent.click(screen.getByTestId('hero-prev'));
    expect(visibleTitle()).toBe('Little pets, big love');
    fireEvent.click(screen.getByTestId('hero-next'));
    expect(visibleTitle()).toBe('Happy tails start here');
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));
    expect(visibleTitle()).toBe('Purr-fect playtime');
    expect(screen.getByRole('button', { name: 'Go to slide 2' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });
});
