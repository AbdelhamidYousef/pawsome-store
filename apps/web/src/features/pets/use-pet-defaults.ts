import { petToFilters } from '@store/shared';
import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import { applyListPatch } from '../catalog/list-params';

import { useActivePet } from './ActivePetProvider';

// The active pet is the DEFAULT of a list, not a lock. When a list is opened without its own pet
// filters, the pet's filters are written into the URL (replacing the history entry, so Back does
// not bounce through the unfiltered list). The URL then says exactly what the shopper sees, and a
// shared link works for someone with no pet at all. The shopper removes the chips (or uses
// "Show all pets") and the list stays unfiltered: defaults are applied once per (page, pet) for as
// long as the list stays mounted, so leaving the page and coming back is a fresh visit.
//
// That "already applied" memory is a module-level map rather than React state: it is bookkeeping
// about a side effect on the URL (an effect may not set state synchronously, and no render
// depends on it changing on its own, because every change goes through the URL, which re-renders).
// key (page + pet) -> the pet filters we wrote, as a signature of the two URL values.
const applied = new Map<string, string>();
// Keys whose filters were handed to the router but are not in the URL yet. Until the URL shows
// them, the list keeps holding its request: any unrelated re-render in between would otherwise
// see "applied" with the old, unfiltered URL and fire one request without the pet's filters.
const writing = new Set<string>();

const EMPTY_SIG = '|';

/**
 * `scope` says where this list may be pre-filtered: 'any' (search), or one pet attribute value
 * ('dog') for a category page, where a cat's filters on the Dogs page would show nothing.
 */
export function usePetDefaults(scope: string | undefined): {
  /** The defaults are about to be written; the caller should hold its first request. */
  waiting: boolean;
} {
  const { activePet, pending } = useActivePet();
  const { pathname } = useLocation();
  const [search, setSearch] = useSearchParams();

  const applies =
    scope !== undefined && activePet !== null && (scope === 'any' || scope === activePet.species);
  const key = activePet ? `${pathname}|${activePet.id}` : null;
  const urlSig = `${search.get('attr.pet') ?? ''}|${search.get('attr.ageStage') ?? ''}`;
  // Filters in the URL that we did not write are the shopper's (a shared link, a chip they
  // chose) and are never overwritten; our own are replaced when the active pet changes.
  const urlIsOurs = urlSig === EMPTY_SIG || [...applied.values()].includes(urlSig);
  const inFlight = key !== null && writing.has(key) && urlSig !== applied.get(key);
  const waiting =
    scope !== undefined &&
    (pending || inFlight || (applies && key !== null && !applied.has(key) && urlIsOurs));

  // The URL now carries what we wrote: stop holding (and never hold again once the shopper
  // clears the chips).
  useEffect(() => {
    if (key !== null && writing.has(key) && urlSig === applied.get(key)) writing.delete(key);
  }, [key, urlSig]);

  useEffect(() => {
    if (!applies || !activePet || key === null) return;
    const filters = petToFilters(activePet, new Date());
    const ageStage = filters.attr.ageStage ?? [];
    if (!applied.has(key)) {
      applied.set(key, `${filters.attr.pet.join(',')}|${ageStage.join(',')}`);
      if (urlIsOurs) {
        writing.add(key);
        setSearch(
          (current) => applyListPatch(current, { attr: { pet: filters.attr.pet, ageStage } }),
          { replace: true, preventScrollReset: true },
        );
      }
    }
    return () => {
      applied.delete(key);
      writing.delete(key);
    };
    // Only a new page or pet starts a new application; the URL changing is the shopper's doing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, applies]);

  return { waiting };
}
