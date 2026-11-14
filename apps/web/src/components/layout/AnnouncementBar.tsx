import { useFreeDeliveryAmount } from '../../features/home/free-delivery';
import { TruckIcon } from '../../features/home/icons';
import { useT } from '../../i18n';

// Height of the slim strip above the header. The header slides up by exactly this much to hide
// it, so the value lives in one place.
export const ANNOUNCEMENT_HEIGHT = '2.25rem';

// The store's free-delivery promise, in its own currency ("€49", "£42", "49 €"). One line, fixed
// height, so it never changes the size of the header around it.
export function AnnouncementBar() {
  const { t } = useT();
  const amount = useFreeDeliveryAmount();
  return (
    <div
      data-testid="announcement-bar"
      className="flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap bg-ink px-4 text-[0.8125rem] font-semibold text-surface"
      style={{ height: ANNOUNCEMENT_HEIGHT }}
    >
      <TruckIcon width={16} height={16} className="shrink-0" />
      <p className="truncate">{t('shell.announcement.freeDelivery', { amount })}</p>
    </div>
  );
}
