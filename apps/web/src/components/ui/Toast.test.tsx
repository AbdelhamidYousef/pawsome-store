import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider, useToast } from './Toast';

function Trigger({ tone }: { tone?: 'info' | 'success' | 'error' | 'love' }) {
  const { show } = useToast();
  return (
    <button type="button" onClick={() => show('Saved!', tone)}>
      Fire
    </button>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  it('announces messages in a polite live region that exists before the message', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toBeEmptyDOMElement();

    await userEvent.click(screen.getByRole('button', { name: 'Fire' }));
    expect(live).toHaveTextContent('Saved!');
  });

  it('puts errors in an alert region and keeps them until dismissed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <ToastProvider>
        <Trigger tone="error" />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fire' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Saved!');
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Saved!');
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });

  it('dismisses non-error toasts automatically', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <ToastProvider>
        <Trigger tone="success" />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fire' }));
    expect(screen.getByTestId('toast')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });

  it('throws a helpful error outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Trigger />)).toThrow('useToast must be used inside <ToastProvider>');
    spy.mockRestore();
  });

  it('bursts hearts for the love tone, but not for visitors who asked for less motion', async () => {
    const { unmount } = render(
      <ToastProvider>
        <Trigger tone="love" />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fire' }));
    expect(screen.getByTestId('toast')).toHaveAttribute('data-tone', 'love');
    expect(screen.getByTestId('heart-burst')).toBeInTheDocument();
    unmount();

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    render(
      <ToastProvider>
        <Trigger tone="love" />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fire' }));
    expect(screen.getByTestId('toast')).toBeInTheDocument();
    expect(screen.queryByTestId('heart-burst')).toBeNull();
    vi.unstubAllGlobals();
  });
});
