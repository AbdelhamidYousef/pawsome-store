import type { ProductImage, Variant } from '@store/shared';
import { useEffect, useId, useState } from 'react';

import { Button } from '../../../components/ui/Button';
import { useT } from '../../../i18n';
import { useFormat } from '../../../i18n/format';
import { cn } from '../../../lib/cn';
import { useBulkAdd } from '../../cart/queries';
import { useRecommendations } from '../queries';

// How long the button says "Added to cart" after a successful add.
const ADDED_MS = 2500;

interface Tile {
  key: string;
  variantId: string;
  sku: string;
  name: string;
  variantName: string;
  image: string | null;
  priceCents: number;
  /** The regular price when a sale is running (shown struck through), else null. */
  wasCents: number | null;
  /** Omnibus saving: the 30-day reference minus the sale price, when the API gives a reference. */
  savingCents: number;
  /** A suggestion (the page's own item is not one); tests count these. */
  suggestion: boolean;
  /** False when the item cannot be bought right now (the page's own sold-out variant). */
  buyable: boolean;
}

// The "+" between two pictures: centred in the 3.25rem gap and on the picture's middle.
const Plus = () => (
  <span
    aria-hidden="true"
    className="absolute -left-10 top-[3.625rem] z-10 flex size-7 items-center justify-center rounded-full border border-line bg-surface font-display text-lg font-semibold leading-none text-muted shadow-card sm:top-[4.625rem]"
  >
    +
  </span>
);

// "Frequently bought together": the page's own item first, then up to three suggestions, as
// pictures in a row joined by "+" (a horizontal scroll row on phones). Each picture has a real
// checkbox on it; the total (and the sale saving, if any) follows the ticks live, and one button
// adds the ticked items in a single all-or-nothing request, right here, without leaving the page.
// The total is an estimate before discounts; the cart prices it.
export function BoughtTogether({
  productSlug,
  productName,
  variant,
  image,
}: {
  productSlug: string;
  productName: string;
  variant: Variant | undefined;
  image?: ProductImage | null;
}) {
  const { t, tn, tm } = useT();
  const fmt = useFormat();
  const headingId = useId();
  const { data } = useRecommendations(productSlug);
  const [unchecked, setUnchecked] = useState<ReadonlySet<string>>(new Set());
  const [problems, setProblems] = useState<string[]>([]);
  const [added, setAdded] = useState(false);
  const bulk = useBulkAdd();

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), ADDED_MS);
    return () => window.clearTimeout(timer);
  }, [added]);

  const items = data?.boughtTogether ?? [];
  if (items.length === 0 || !variant) return null;

  const currency = variant.currency;
  const ownSale = variant.sale;
  const tiles: Tile[] = [
    {
      key: 'this',
      variantId: variant.id,
      sku: variant.sku,
      name: productName,
      variantName: variant.name,
      image: image?.url ?? null,
      priceCents: ownSale?.priceCents ?? variant.priceCents,
      wasCents: ownSale ? variant.priceCents : null,
      savingCents:
        ownSale?.referenceCents && ownSale.referenceCents > ownSale.priceCents
          ? ownSale.referenceCents - ownSale.priceCents
          : 0,
      suggestion: false,
      buyable: variant.available && !variant.isTrial,
    },
    ...items.map((i) => ({
      key: i.card.id,
      variantId: i.variant.id,
      sku: i.variant.sku,
      name: i.card.name,
      variantName: i.variant.name,
      image: i.card.image?.url ?? null,
      priceCents: i.variant.saleCents ?? i.variant.priceCents,
      wasCents: i.variant.saleCents !== null ? i.variant.priceCents : null,
      // Suggestions carry no 30-day reference price, so no saving is claimed for them.
      savingCents: 0,
      suggestion: true,
      buyable: true,
    })),
  ];

  const isChosen = (tile: Tile) => tile.buyable && !unchecked.has(tile.key);
  const chosen = tiles.filter(isChosen);
  const totalCents = chosen.reduce((sum, l) => sum + l.priceCents, 0);
  const savingCents = chosen.reduce((sum, l) => sum + l.savingCents, 0);

  const toggle = (key: string) => {
    setAdded(false);
    setUnchecked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const submit = async () => {
    setProblems([]);
    const lines = chosen.map((l) => ({
      variantId: l.variantId,
      quantity: 1,
      name: l.name,
      sku: l.sku,
      priceCents: l.priceCents,
    }));
    const failures = await bulk.addAll(lines);
    if (failures.length === 0) {
      setAdded(true);
      return;
    }
    const names = new Map(lines.map((l) => [l.variantId, l.name]));
    setProblems(
      failures.map((f) =>
        t('pdp.bought.problem', {
          name: names.get(f.variantId) ?? t('pdp.bought.anItem'),
          message: tm(f.message),
        }),
      ),
    );
  };

  return (
    <section aria-labelledby={headingId} data-testid="bought-together" className="mt-16">
      <h2 id={headingId} className="font-display text-2xl font-semibold sm:text-3xl">
        {t('pdp.bought.heading')}
      </h2>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-[3.25rem] overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {tiles.map((tile, index) => {
            const on = isChosen(tile);
            const nameId = `${headingId}-${index}`;
            return (
              <li key={tile.key} className="relative w-36 shrink-0 snap-start sm:w-44">
                {index > 0 && <Plus />}
                <label
                  className={cn(
                    'flex flex-col gap-2',
                    tile.buyable ? 'cursor-pointer' : 'cursor-not-allowed',
                  )}
                >
                  <span
                    className={cn(
                      'relative block aspect-square overflow-hidden rounded-card border-2 bg-pet-soft transition-colors',
                      on ? 'border-primary' : 'border-line',
                    )}
                  >
                    {tile.image && (
                      <img
                        src={tile.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className={cn(
                          'h-full w-full object-cover transition-opacity',
                          !on && 'opacity-40',
                        )}
                      />
                    )}
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!tile.buyable}
                      onChange={() => toggle(tile.key)}
                      aria-labelledby={nameId}
                      data-testid={tile.suggestion ? 'bought-together-option' : undefined}
                      className="absolute left-2.5 top-2.5 size-6 cursor-pointer accent-primary disabled:cursor-not-allowed"
                    />
                    {!tile.suggestion && (
                      <span className="absolute bottom-2 left-2 rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-surface">
                        {t('pdp.bought.thisItemBadge')}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span
                      id={nameId}
                      className={cn(
                        'line-clamp-2 font-display text-sm font-semibold leading-snug sm:text-base',
                        !on && 'text-muted',
                      )}
                    >
                      {tile.name}
                      {tile.variantName && (
                        <span className="sr-only">
                          {t('pdp.bought.variantSpoken', { variant: tile.variantName })}
                        </span>
                      )}
                    </span>
                    {tile.variantName && (
                      <span aria-hidden="true" className="line-clamp-1 text-xs text-muted">
                        {tile.variantName}
                      </span>
                    )}
                    {tile.buyable ? (
                      <span className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                        <span
                          className={cn('font-semibold', on ? 'text-pet-strong' : 'text-muted')}
                        >
                          {fmt.money(tile.priceCents, currency)}
                        </span>
                        {tile.wasCents !== null && tile.wasCents > tile.priceCents && (
                          <s className="text-xs text-muted">{fmt.money(tile.wasCents, currency)}</s>
                        )}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-danger">
                        {t('pdp.bought.notAvailable')}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-3 rounded-card bg-pet-soft p-5 lg:w-80 lg:shrink-0">
          <p data-testid="bought-together-total" className="flex flex-col">
            <span className="text-sm text-muted">{tn('pdp.bought.totalFor', chosen.length)}</span>
            <span className="font-display text-3xl font-semibold">
              {fmt.money(totalCents, currency)}
            </span>
            {savingCents > 0 && (
              <span className="text-sm font-semibold text-success">
                {t('pdp.bought.saving', { amount: fmt.money(savingCents, currency) })}
              </span>
            )}
          </p>
          <Button
            size="lg"
            loading={bulk.pending}
            disabled={chosen.length === 0}
            data-testid="bought-together-add"
            onClick={() => void submit()}
            className={cn('w-full', added && 'bg-success hover:bg-success')}
          >
            {added
              ? t('pdp.bought.added')
              : chosen.length > 0
                ? tn('pdp.bought.addCount', chosen.length)
                : t('pdp.bought.chooseOne')}
          </Button>
          <p className="text-xs text-muted">{t('pdp.bought.beforeDiscounts')}</p>
          {problems.length > 0 && (
            <ul role="alert" data-testid="bought-together-errors" className="text-sm text-danger">
              {problems.map((p) => (
                <li key={p} className="font-semibold">
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
