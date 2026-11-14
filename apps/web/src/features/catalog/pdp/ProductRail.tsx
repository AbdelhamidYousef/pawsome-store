import type { ProductCard as ProductCardData } from '@store/shared';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { ChevronRightIcon } from '../../../components/icons';
import { useT } from '../../../i18n';
import { cn } from '../../../lib/cn';
import { track } from '../../../lib/track';
import { ProductCard } from '../ProductCard';

const arrow =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card transition hover:border-ink disabled:cursor-default disabled:opacity-40 disabled:hover:border-line';

// A row of product cards that scrolls sideways INSIDE its own box (never widening the page), with
// scroll-snap. Cards are wide (about 2.75 per row on desktop, 1.3 on phones) so the next one always
// peeks in: the visible cue that there is more. Arrow buttons from md up; touch swipes.
export function ProductRail({
  cards,
  label,
  testId,
  heading,
  headingId,
  listId: analyticsListId,
}: {
  cards: readonly ProductCardData[];
  label: string;
  testId: string;
  /** The row's title, drawn in the same line as the arrows. */
  heading?: string;
  headingId?: string;
  /** When set, the row reports a `view_item_list` like a product grid does. */
  listId?: string;
}) {
  const { t } = useT();
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    // 2px of slack: sub-pixel widths otherwise leave "next" enabled at the very end.
    setEdges({
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = listRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, cards.length]);

  const step = (dir: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    const card = el.querySelector('li');
    const by = card ? card.getBoundingClientRect().width + 24 : el.clientWidth * 0.8;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * by, behavior: reduce ? 'auto' : 'smooth' });
  };

  const idsKey = cards.map((c) => c.id).join(',');
  useEffect(() => {
    if (!analyticsListId || !idsKey) return;
    track({
      name: 'view_item_list',
      listId: analyticsListId,
      items: cards.map((c) => ({ id: c.id, name: c.name, price: c.price.minCents })),
    });
    // `cards` is represented by `idsKey`, as in ProductGrid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsListId, idsKey]);

  const scrollable = !(edges.start && edges.end);

  return (
    <div>
      {(heading || scrollable) && (
        <div className="mb-5 flex items-end justify-between gap-4">
          {heading ? (
            <h2 id={headingId} className="font-display text-2xl font-semibold sm:text-3xl">
              {heading}
            </h2>
          ) : (
            <span />
          )}
          {scrollable && (
            <div className="hidden shrink-0 gap-2 md:flex">
              <button
                type="button"
                className={arrow}
                aria-controls={listId}
                aria-label={t('pdp.rail.prev')}
                disabled={edges.start}
                onClick={() => step(-1)}
              >
                <ChevronRightIcon className="h-5 w-5 rotate-180" />
              </button>
              <button
                type="button"
                className={arrow}
                aria-controls={listId}
                aria-label={t('pdp.rail.next')}
                disabled={edges.end}
                onClick={() => step(1)}
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}
      <ul
        ref={listRef}
        id={listId}
        aria-label={label}
        data-testid={testId}
        onScroll={measure}
        className={cn(
          // Negative margin + padding keep the cards' shadows and hover lift from being clipped.
          '-mx-4 -my-3 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 py-3 sm:-mx-2 sm:scroll-px-2 sm:gap-6 sm:px-2',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          '[&>li]:shrink-0 [&>li]:snap-start [&>li]:basis-[76%] sm:[&>li]:basis-[calc((100%-1.5rem)/2.25)] lg:[&>li]:basis-[calc((100%-3rem)/2.75)]',
        )}
      >
        {cards.map((card) => (
          <ProductCard
            key={card.id}
            product={card}
            sizes="(min-width: 1024px) 420px, (min-width: 640px) 45vw, 76vw"
          />
        ))}
      </ul>
    </div>
  );
}
