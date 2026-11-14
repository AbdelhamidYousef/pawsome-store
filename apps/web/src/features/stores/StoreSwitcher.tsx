import { STORES, storeFromCode, type StoreSwitchPreview, type StoreView } from '@store/shared';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

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

export function StoreSwitcher({
  testId = 'store-switcher',
  className,
  onNavigate = reload,
}: {
  testId?: string;
  className?: string;
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
  // shopper is told which ones first. Same currency, an empty cart, or a failed check: no question
  // (the cart page still names any line that dropped).
  const pick = (next: StoreView) => {
    if (next.currency === current.currency || !cart || cart.items.length === 0) {
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

  return (
    <>
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
          'min-h-11 rounded-control border border-line bg-surface px-2 font-semibold text-ink',
          className,
        )}
      >
        {STORES.map((store) => (
          <option key={store.code} value={store.code}>
            {store.label}
          </option>
        ))}
      </select>
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
