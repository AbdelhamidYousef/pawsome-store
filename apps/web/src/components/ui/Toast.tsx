import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { useT } from '../../i18n';
import { cn } from '../../lib/cn';

// `love` is the wishlist's tone: a pink tint, a heart, and a small burst of hearts on arrival.
export type ToastTone = 'info' | 'success' | 'error' | 'love';

// An optional button inside the toast ("View cart"). It is a callback, not a link, because the
// provider sits above the router and cannot render a <Link>; the caller (inside the router) passes
// a function that navigates.
export interface ToastAction {
  label: string;
  onAction: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction | undefined;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

// Soft tinted cards: no hard border, ink text (AA on every tint), the tone carried by the tint
// and a coloured icon.
const toneClasses: Record<ToastTone, string> = {
  info: 'bg-primary-soft',
  success: 'bg-success-soft',
  error: 'bg-danger-soft',
  love: 'bg-[var(--color-love-soft)]',
};

const iconClasses: Record<ToastTone, string> = {
  info: 'text-primary-strong',
  success: 'text-success',
  error: 'text-danger',
  love: 'text-[var(--color-love)]',
};

function ToneIcon({ tone }: { tone: ToastTone }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 22,
    height: 22,
    'aria-hidden': true,
    focusable: false,
    className: cn('shrink-0', iconClasses[tone]),
  } as const;
  if (tone === 'love') {
    return (
      <svg {...common} fill="currentColor">
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
      </svg>
    );
  }
  return (
    <svg
      {...common}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9.25" />
      {tone === 'success' && <path d="M8 12.5l2.7 2.7L16.2 9.5" />}
      {tone === 'error' && <path d="M12 7.5v5.5M12 16.5v.01" />}
      {tone === 'info' && <path d="M12 11v5.5M12 7.5v.01" />}
    </svg>
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

// Where each heart of the burst flies to (px from its corner of the toast) and when it starts:
// up and slightly outwards, mirrored at the other end, so hearts float off both ends of the
// toast without leaving a phone screen.
const HEARTS = [
  { dx: -34, dy: -62, size: 22, delay: 0 },
  { dx: -52, dy: -30, size: 16, delay: 80 },
  { dx: -10, dy: -88, size: 14, delay: 150 },
  { dx: -42, dy: -96, size: 12, delay: 220 },
  { dx: 6, dy: -54, size: 12, delay: 260 },
] as const;

function HeartBurst() {
  const [show] = useState(() => !prefersReducedMotion());
  if (!show) return null;
  return (
    <span aria-hidden="true" data-testid="heart-burst" className="pointer-events-none">
      {(['left', 'right'] as const).flatMap((side) =>
        HEARTS.map((h, i) => (
          <svg
            key={`${side}-${i}`}
            viewBox="0 0 24 24"
            width={h.size}
            height={h.size}
            fill="currentColor"
            stroke="var(--color-surface)"
            strokeWidth="1.5"
            className={cn(
              'toast-heart absolute top-1/2 text-[var(--color-love)]',
              side === 'left' ? 'left-5' : 'right-5',
            )}
            style={
              {
                '--dx': `${side === 'left' ? h.dx : -h.dx}px`,
                '--dy': `${h.dy}px`,
                animationDelay: `${h.delay}ms`,
              } as CSSProperties
            }
          >
            <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
          </svg>
        )),
      )}
    </span>
  );
}

const AUTO_DISMISS_MS = 6000;

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const { t } = useT();
  useEffect(() => {
    // Errors stay until dismissed: a message that vanishes before it is read fails WCAG 2.2.1.
    if (toast.tone === 'error') return;
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <li
      data-testid="toast"
      data-tone={toast.tone}
      className={cn(
        'toast-in pointer-events-auto relative flex items-center gap-3 rounded-card py-2 pl-4 pr-3 text-ink shadow-card',
        toneClasses[toast.tone],
      )}
    >
      {toast.tone === 'love' && <HeartBurst />}
      <ToneIcon tone={toast.tone} />
      <p className="min-w-0 flex-1 break-words py-1.5 font-semibold leading-snug">
        {toast.message}
      </p>
      {toast.action && (
        <button
          type="button"
          data-testid="toast-action"
          onClick={() => {
            toast.action?.onAction();
            onDismiss(toast.id);
          }}
          className="min-h-11 shrink-0 rounded-control px-3 font-display font-semibold underline underline-offset-2 hover:bg-surface"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label={t('shell.toast.dismiss')}
        data-testid="toast-dismiss"
        onClick={() => onDismiss(toast.id)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </li>
  );
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback((message: string, tone: ToastTone = 'info', action?: ToastAction) => {
    setToasts((current) => [...current, { id: nextId++, message, tone, action }]);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Both live regions are always in the DOM: screen readers only announce changes inside a
          region that already existed. Polite waits for a pause; errors use role=alert (assertive). */}
      <div
        aria-label={t('shell.toast.region')}
        role="region"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-col gap-2"
      >
        <ul role="status" aria-live="polite" className="flex flex-col gap-2">
          {toasts
            .filter((item) => item.tone !== 'error')
            .map((item) => (
              <ToastCard key={item.id} toast={item} onDismiss={dismiss} />
            ))}
        </ul>
        <ul role="alert" className="flex flex-col gap-2">
          {toasts
            .filter((item) => item.tone === 'error')
            .map((item) => (
              <ToastCard key={item.id} toast={item} onDismiss={dismiss} />
            ))}
        </ul>
      </div>
    </ToastContext.Provider>
  );
}
