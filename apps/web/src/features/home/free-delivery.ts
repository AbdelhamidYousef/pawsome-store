import { FREE_DELIVERY_FROM_CENTS } from '@store/shared';

import { useFormat } from '../../i18n/format';
import { useStore } from '../stores/StoreContext';

/** "€49" / "49 €" / "£42": the free-delivery threshold in the store's currency, whole units. */
export function useFreeDeliveryAmount(): string {
  const { currency } = useStore();
  const format = useFormat();
  return format.number(FREE_DELIVERY_FROM_CENTS[currency] / 100, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
}
