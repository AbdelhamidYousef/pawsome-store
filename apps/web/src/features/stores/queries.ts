import type { StoreCode } from '@store/shared';
import { useMutation } from '@tanstack/react-query';

import { fetchSwitchPreview } from '../../api/cart';

// Asked on demand when the shopper picks another store, so a mutation (an imperative call with
// pending state), not a query: there is nothing to cache, the cart may change between two picks.
export function useSwitchPreview() {
  return useMutation({ mutationFn: (store: StoreCode) => fetchSwitchPreview(store) });
}
