import { useId, useState, type ReactNode } from 'react';

import { ChevronDownIcon, CloseIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button';
import { useT } from '../../i18n';
import { cn } from '../../lib/cn';
import { TEST_IDS } from '../../lib/test-ids';

import { readPanelState, writePanelState, type PanelState } from './session';

// The frame every demo helper shares: a labelled region at the top of the page, in the normal flow
// (so on a phone it pushes the form down instead of covering a field), that folds to a pill or
// closes for the rest of the visit. The storefront is a public portfolio demo, so it is on for
// everyone; it is only ever mounted on sign-in, registration and checkout, never in admin.
export function DemoHelperFrame({
  children,
  className,
  intro = true,
}: {
  children: ReactNode;
  className?: string;
  /** The one-line "what is this" sentence; checkout's step hints already say it. */
  intro?: boolean;
}) {
  const { t } = useT();
  const titleId = useId();
  const bodyId = useId();
  const [state, setState] = useState<PanelState>(readPanelState);
  const change = (next: PanelState) => {
    setState(next);
    writePanelState(next);
  };

  if (state === 'closed') return null;

  if (state === 'collapsed') {
    return (
      <div className={cn('flex', className)}>
        <button
          type="button"
          aria-expanded="false"
          data-testid={TEST_IDS.demoHelperExpand}
          onClick={() => change('open')}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-dashed border-primary bg-primary-soft px-4 font-display font-semibold text-primary-strong shadow-card hover:bg-surface"
        >
          <span aria-hidden="true">✨</span>
          {t('demo.expand')}
        </button>
      </div>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      data-testid={TEST_IDS.demoHelper}
      className={cn(
        'rounded-card border-2 border-dashed border-primary bg-primary-soft p-4 shadow-card sm:p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 text-2xl leading-none">
          ✨
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-strong">
            {t('demo.badge')}
          </p>
          <h2 id={titleId} className="font-display text-xl font-semibold">
            {t('demo.title')}
          </h2>
        </div>
        <div className="-mr-1 -mt-1 flex shrink-0 gap-1">
          <button
            type="button"
            aria-expanded="true"
            aria-controls={bodyId}
            aria-label={t('demo.collapse')}
            title={t('demo.collapse')}
            data-testid={TEST_IDS.demoHelperCollapse}
            onClick={() => change('collapsed')}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface"
          >
            <ChevronDownIcon className="h-5 w-5 rotate-180" />
          </button>
          <button
            type="button"
            aria-label={t('demo.close')}
            title={t('demo.close')}
            data-testid={TEST_IDS.demoHelperClose}
            onClick={() => change('closed')}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      {intro && <p className="mt-2 text-sm">{t('demo.intro')}</p>}
      <div id={bodyId} className="mt-3">
        {children}
      </div>
    </section>
  );
}

// A value the visitor types elsewhere (Stripe's frame, a later sign-in) with a copy button. The
// clipboard can be refused (permissions, an old browser): then the value is still on screen and
// selectable, and the status line says to copy it by hand.
export function CopyValue({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  const { t } = useT();
  const labelId = useId();
  const [status, setStatus] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(t('demo.copied', { label }));
    } catch {
      setStatus(t('demo.copyFailed'));
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-surface px-3 py-2">
      <div className="min-w-0 flex-1">
        <p id={labelId} className="text-xs font-semibold text-muted">
          {label}
        </p>
        <p className="break-all font-mono text-base font-semibold" data-testid={testId}>
          {value}
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        // Named "Copy" and described by the value's label, so the button never shares an
        // accessible name with the form field it helps fill ("Password").
        aria-describedby={labelId}
        onClick={() => void copy()}
      >
        {t('demo.copy')}
      </Button>
      <p role="status" className="w-full text-sm">
        {status}
      </p>
    </div>
  );
}
