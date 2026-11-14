import { splitHighlights, type HelpHit } from '@store/shared';
import { useState } from 'react';

import { ChevronRightIcon } from '../../components/icons';
import { cn } from '../../lib/cn';
import { TEST_IDS } from '../../lib/test-ids';
import { MarkdownBody } from '../guides/MarkdownBody';

// One disclosure per article: a real <button aria-expanded> that controls its answer region, so
// keyboard and screen-reader users get the same open/closed state as everyone else. Several can
// be open at once (an answer is often compared with the next one).
export function HelpAccordion({
  hits,
  searching,
}: {
  hits: readonly HelpHit[];
  searching: boolean;
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (slug: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });

  return (
    <ul
      className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card"
      data-testid={TEST_IDS.helpList}
    >
      {hits.map((hit) => {
        const expanded = open.has(hit.slug);
        const panelId = `help-panel-${hit.slug}`;
        return (
          <li key={hit.slug} data-testid={TEST_IDS.helpItem}>
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(hit.slug)}
                className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-4 text-left text-lg font-semibold hover:bg-pet-soft sm:px-6"
              >
                <span className="break-words">{hit.question}</span>
                <ChevronRightIcon
                  aria-hidden="true"
                  width={18}
                  height={18}
                  className={cn('shrink-0 transition-transform', expanded && 'rotate-90')}
                />
              </button>
            </h3>
            {!expanded && searching && hit.snippet && (
              <p className="px-5 pb-4 text-muted sm:px-6" data-testid={TEST_IDS.helpSnippet}>
                {splitHighlights(hit.snippet).map((part, i) =>
                  part.match ? (
                    <mark key={i} className="rounded bg-primary-soft px-0.5 font-semibold text-ink">
                      {part.text}
                    </mark>
                  ) : (
                    <span key={i}>{part.text}</span>
                  ),
                )}
              </p>
            )}
            <div
              id={panelId}
              role="region"
              aria-label={hit.question}
              hidden={!expanded}
              className="px-5 pb-5 sm:px-6"
            >
              <MarkdownBody source={hit.answerMd} className="text-base" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
