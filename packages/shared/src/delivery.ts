// The delivery estimate: "Order in 3h 20m, arrives Tue 4 Nov". Pure functions, the clock is an
// argument, and the STORE's time zone decides everything (cutoff, business days); the visitor's
// own zone is never used for a decision, only (by the caller) for showing a clock.

// Fictional constants, stated as such on the page: this demo shop has an invented warehouse in the
// Netherlands. Edit here; there is no admin screen for them.
export const STORE_ZONE = 'Europe/Amsterdam';
export const CUTOFF = { hour: 15, minute: 0 } as const;
/** Standard delivery is free from this subtotal, per store currency (the seed's shipping rates and
 * the storefront's "free delivery over …" lines both read it). */
export const FREE_DELIVERY_FROM_CENTS = { EUR: 4900, GBP: 4200 } as const;
/** Non-working days (YYYY-MM-DD in the store zone), on top of Saturdays and Sundays. */
export const STORE_HOLIDAYS: readonly string[] = [
  '2026-12-25',
  '2026-12-26',
  '2027-01-01',
  '2027-03-29',
  '2027-04-27', // King's Day
  '2027-05-05', // Liberation Day
  '2027-05-06', // Ascension
  '2027-05-17', // Whit Monday
  '2027-12-27',
];

export interface DeliveryRules {
  /** IANA zone of the warehouse. */
  zone: string;
  cutoffHour: number;
  cutoffMinute: number;
  /** Working days off besides the weekend, as YYYY-MM-DD in `zone`. */
  holidays: readonly string[];
  /** Business days in transit after dispatch (the shipping method's range). */
  transitMinDays: number;
  transitMaxDays: number;
}

export const defaultDeliveryRules = (
  transitMinDays: number,
  transitMaxDays: number,
): DeliveryRules => ({
  zone: STORE_ZONE,
  cutoffHour: CUTOFF.hour,
  cutoffMinute: CUTOFF.minute,
  holidays: STORE_HOLIDAYS,
  transitMinDays,
  transitMaxDays,
});

export interface DeliveryEstimate {
  /** Day the parcel leaves the warehouse, YYYY-MM-DD in the store zone. */
  dispatchDate: string;
  /** Earliest and latest arrival, YYYY-MM-DD (business days after dispatch). */
  arrivesFrom: string;
  arrivesTo: string;
  /** True when an order placed now still leaves today. */
  dispatchesToday: boolean;
  /** Milliseconds until the cutoff, only while an order now would still leave today; else null. */
  msToCutoff: number | null;
  /** "Cutoff 15:00 CET": the cutoff with the zone's current abbreviation. */
  cutoffLabel: string;
}

// ---------- calendar dates as plain strings (no time zone inside them) ----------

type YMD = { y: number; m: number; d: number };
const pad = (n: number) => String(n).padStart(2, '0');
const toKey = ({ y, m, d }: YMD) => `${y}-${pad(m)}-${pad(d)}`;
const fromKey = (key: string): YMD => {
  const [y = 0, m = 0, d = 0] = key.split('-').map(Number);
  return { y, m, d };
};
// Calendar arithmetic goes through UTC noon, which has no daylight-saving edge.
const addDays = (key: string, days: number): string => {
  const { y, m, d } = fromKey(key);
  const date = new Date(Date.UTC(y, m - 1, d + days, 12));
  return toKey({ y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() });
};
// 0 = Sunday ... 6 = Saturday.
const weekday = (key: string): number => {
  const { y, m, d } = fromKey(key);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
};

export function isBusinessDay(key: string, holidays: readonly string[]): boolean {
  const day = weekday(key);
  return day !== 0 && day !== 6 && !holidays.includes(key);
}

export function nextBusinessDay(key: string, holidays: readonly string[]): string {
  let next = addDays(key, 1);
  while (!isBusinessDay(next, holidays)) next = addDays(next, 1);
  return next;
}

export function addBusinessDays(key: string, days: number, holidays: readonly string[]): string {
  let current = key;
  for (let i = 0; i < days; i++) current = nextBusinessDay(current, holidays);
  return current;
}

// ---------- time zones ----------

function zoneParts(instant: number, zone: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    date: toKey({ y: get('year'), m: get('month'), d: get('day') }),
    minutes: get('hour') * 60 + get('minute'),
  };
}

// The instant at which the wall clock in `zone` shows `key` at hour:minute. The zone's offset is
// looked up at the instant itself, twice: the second pass settles the hour around a daylight-saving
// change (the first guess can land on the other side of it).
function zonedInstant(key: string, hour: number, minute: number, zone: string): number {
  const { y, m, d } = fromKey(key);
  const wall = Date.UTC(y, m - 1, d, hour, minute);
  const offsetAt = (instant: number) => {
    const p = zoneParts(instant, zone);
    const asUtc = Date.UTC(
      fromKey(p.date).y,
      fromKey(p.date).m - 1,
      fromKey(p.date).d,
      0,
      p.minutes,
    );
    return asUtc - instant;
  };
  const first = wall - offsetAt(wall);
  return wall - offsetAt(first);
}

function zoneAbbreviation(instant: number, zone: string): string {
  const part = new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'short' })
    .formatToParts(new Date(instant))
    .find((p) => p.type === 'timeZoneName')?.value;
  return part ?? zone;
}

/**
 * When does an order placed at `now` leave, and when does it arrive?
 *  - before the cutoff on a business day: it leaves today;
 *  - after the cutoff, or on a weekend or holiday: it leaves on the next business day;
 *  - it arrives `transitMinDays` to `transitMaxDays` business days after it leaves.
 */
export function estimateDelivery(now: Date, rules: DeliveryRules): DeliveryEstimate {
  const instant = now.getTime();
  const { date: today } = zoneParts(instant, rules.zone);
  const cutoffAt = zonedInstant(today, rules.cutoffHour, rules.cutoffMinute, rules.zone);
  const dispatchesToday = isBusinessDay(today, rules.holidays) && instant < cutoffAt;
  const dispatchDate = dispatchesToday ? today : nextBusinessDay(today, rules.holidays);
  return {
    dispatchDate,
    arrivesFrom: addBusinessDays(dispatchDate, rules.transitMinDays, rules.holidays),
    arrivesTo: addBusinessDays(dispatchDate, rules.transitMaxDays, rules.holidays),
    dispatchesToday,
    msToCutoff: dispatchesToday ? cutoffAt - instant : null,
    cutoffLabel: `Cutoff ${pad(rules.cutoffHour)}:${pad(rules.cutoffMinute)} ${zoneAbbreviation(cutoffAt, rules.zone)}`,
  };
}

// ---------- words ----------

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Tue 4 Nov". Written out (not Intl) so the text is the same in every browser and in tests. */
export function formatDeliveryDay(key: string): string {
  const { m, d } = fromKey(key);
  return `${DAYS[weekday(key)]} ${d} ${MONTHS[m - 1]}`;
}

/**
 * "3h 20m", "45m", "under a minute". Rounds DOWN to whole minutes (a countdown that says 1m must
 * not already be 0m), and the hours part appears only when there is one.
 */
export function formatCountdown(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return 'under a minute';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
