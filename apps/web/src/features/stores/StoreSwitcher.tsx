import { STORES, storeFromCode, type StoreSwitchPreview, type StoreView } from '@store/shared';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { ChevronDownIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useT } from '../../i18n';
import { cn } from '../../lib/cn';
import { writeStoreCookie } from '../../lib/store-cookie';
import { swapStorePrefix } from '../../lib/store-entry';
import { track } from '../../lib/track';
import { useCart } from '../cart/queries';

import { useSwitchPreview } from './queries';
import { useStore } from './StoreContext';

// Moves the shopper to the same page in another store view and remembers the choice. A full page
// load, not a client-side navigation: the prefix is the router's basename (fixed per page load)
// and a new store view means a new language and currency, so every query should start fresh.
function reload(url: string): void {
  window.location.assign(url);
}

const CURRENCY_SIGN: Record<StoreView['currency'], string> = { EUR: '€', GBP: '£' };

export function StoreSwitcher({
  testId = 'store-switcher',
  className,
  compact = false,
  onNavigate = reload,
}: {
  testId?: string;
  className?: string;
  /** Header style: a quiet "EN · € ⌄" trigger instead of the full store name. */
  compact?: boolean;
  /** Test seam: where to go instead of a real page load. */
  onNavigate?: (url: string) => void;
}) {
  const { t } = useT();
  const current = useStore();
  // `useLocation` is already relative to the basename, so it is the "rest of the path".
  const location = useLocation();
  const { data: cart } = useCart();
  const preview = useSwitchPreview();
  // A switch that would drop cart lines waits here for the shopper's answer.
  const [pending, setPending] = useState<{
    next: StoreView;
    dropped: StoreSwitchPreview['dropped'];
  } | null>(null);

  const go = (next: StoreView) => {
    writeStoreCookie(next);
    track({ name: 'store_switched', from: current.code, to: next.code });
    onNavigate(swapStorePrefix(location, '', next));
  };

  // Lines with no price in the new currency drop out of the cart (nothing is converted), so the
  // shopper is told which ones first. Same currency, a cart known to be empty, or a failed check:
  // no question (the cart page still names any line that dropped). A cart that has not loaded yet
  // is asked about rather than assumed empty.
  const pick = (next: StoreView) => {
    if (next.currency === current.currency || cart?.items.length === 0) {
      go(next);
      return;
    }
    preview.mutate(next.code, {
      onSuccess: (answer) => {
        if (answer.dropped.length === 0) go(next);
        else setPending({ next, dropped: answer.dropped });
      },
      onError: () => go(next),
    });
  };

  const select = (
    <select
      aria-label={t('shell.storeSwitcher')}
      aria-busy={preview.isPending || undefined}
      disabled={preview.isPending}
      data-testid={testId}
      value={current.code}
      onChange={(event) => {
        const next = storeFromCode(event.target.value);
        if (!next || next.code === current.code) return;
        pick(next);
      }}
      className={cn(
        compact
          ? 'absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0'
          : 'min-h-11 rounded-control border border-line bg-surface px-2 font-semibold text-ink',
        !compact && className,
      )}
    >
      {STORES.map((store) => (
        <option key={store.code} value={store.code}>
          {store.label}
        </option>
      ))}
    </select>
  );

  return (
    <>
      {compact ? (
        // The native <select> stays (keyboard, screen readers and the phone picker for free, and
        // the open list still names each store in full); it is transparent and laid over a small
        // "EN · €" label, which is all the closed control shows.
        <span
          className={cn(
            'relative inline-flex min-h-11 items-center gap-1 rounded-control px-2.5 text-sm font-semibold text-ink hover:bg-pet-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
            className,
          )}
        >
          <span aria-hidden="true" data-testid={`${testId}-label`}>
            {current.lang.toUpperCase()}
            <span className="font-normal text-muted"> · {CURRENCY_SIGN[current.currency]}</span>
          </span>
          <ChevronDownIcon width={14} height={14} aria-hidden="true" className="shrink-0" />
          {select}
        </span>
      ) : (
        select
      )}
      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t('shell.storeSwitch.title', { store: pending?.next.label ?? '' })}
      >
        {pending && (
          <div data-testid={`${testId}-confirm`} className="flex flex-col gap-4">
            <p>{t('shell.storeSwitch.text', { currency: pending.next.currency })}</p>
            <ul className="list-disc pl-6" data-testid="store-switch-dropped">
              {pending.dropped.map((line) => (
                <li key={line.variantId}>
                  {line.productName} ({line.variantName})
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => setPending(null)}>
                {t('shell.storeSwitch.cancel', { store: current.label })}
              </Button>
              <Button onClick={() => go(pending.next)} data-testid="store-switch-confirm">
                {t('shell.storeSwitch.confirm')}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
