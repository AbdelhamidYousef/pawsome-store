// Made-up but valid data for the demo helper. Every value passes the same Zod schemas the API
// uses (names, `demo+…@pawsome.test` emails on the reserved .test TLD that can never receive mail,
// a 10+ character password, an address in a country the current store ships to with that
// country's postcode format). `rng` is injectable so tests get the same person every run.

export type Rng = () => number;

const FIRST_NAMES = [
  'Mila',
  'Jonas',
  'Amara',
  'Theo',
  'Ines',
  'Leo',
  'Noor',
  'Felix',
  'Clara',
  'Oskar',
  'Lena',
  'Hugo',
] as const;
const LAST_NAMES = [
  'Rivers',
  'Berger',
  'Laurent',
  'Novak',
  'Okafor',
  'Lindqvist',
  'Moreau',
  'Brennan',
  'Kowalski',
  'Rossi',
] as const;

const pick = <T>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)]!;
const digits = (count: number, rng: Rng) =>
  Array.from({ length: count }, () => Math.floor(rng() * 10)).join('');
/** Six lower-case letters and digits: enough to make each demo email unique. */
const token = (rng: Rng) =>
  Array.from({ length: 6 }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(rng() * 32)]).join(
    '',
  );

export interface DemoPerson {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export function demoPerson(rng: Rng = Math.random): DemoPerson {
  return {
    firstName: pick(FIRST_NAMES, rng),
    lastName: pick(LAST_NAMES, rng),
    email: `demo+${token(rng)}@pawsome.test`,
    password: `Paws-${token(rng)}-${digits(2, rng)}`,
  };
}

interface Place {
  street: string;
  postalCode: string;
  city: string;
}

interface CountryData {
  places: readonly Place[];
  /** "12 Baker Street" (UK, IE, FR) instead of "Torstraße 12". */
  numberFirst?: boolean;
  phone: (rng: Rng) => string;
}

// One or two real streets per country, with a postcode in that country's own format.
const COUNTRIES: Record<string, CountryData> = {
  AT: {
    places: [
      { street: 'Mariahilfer Straße', postalCode: '1070', city: 'Wien' },
      { street: 'Landstraße', postalCode: '4020', city: 'Linz' },
    ],
    phone: (r) => `+43 660 ${digits(7, r)}`,
  },
  BE: {
    places: [
      { street: 'Rue de la Loi', postalCode: '1000', city: 'Bruxelles' },
      { street: 'Meir', postalCode: '2000', city: 'Antwerpen' },
    ],
    phone: (r) => `+32 470 ${digits(6, r)}`,
  },
  DE: {
    places: [
      { street: 'Torstraße', postalCode: '10115', city: 'Berlin' },
      { street: 'Schanzenstraße', postalCode: '20357', city: 'Hamburg' },
    ],
    phone: (r) => `+49 151 ${digits(8, r)}`,
  },
  DK: {
    places: [{ street: 'Nørrebrogade', postalCode: '2200', city: 'København N' }],
    phone: (r) => `+45 20 ${digits(6, r)}`,
  },
  EE: {
    places: [{ street: 'Narva maantee', postalCode: '10117', city: 'Tallinn' }],
    phone: (r) => `+372 5${digits(7, r)}`,
  },
  ES: {
    places: [
      { street: 'Calle de Atocha', postalCode: '28012', city: 'Madrid' },
      { street: 'Carrer de Mallorca', postalCode: '08013', city: 'Barcelona' },
    ],
    phone: (r) => `+34 612 ${digits(6, r)}`,
  },
  FI: {
    places: [{ street: 'Mannerheimintie', postalCode: '00100', city: 'Helsinki' }],
    phone: (r) => `+358 40 ${digits(7, r)}`,
  },
  FR: {
    places: [
      { street: 'rue de Bretagne', postalCode: '75003', city: 'Paris' },
      { street: 'rue de la République', postalCode: '69002', city: 'Lyon' },
    ],
    numberFirst: true,
    phone: (r) => `+33 6 ${digits(8, r)}`,
  },
  GB: {
    places: [
      { street: 'Baker Street', postalCode: 'NW1 6XE', city: 'London' },
      { street: 'Deansgate', postalCode: 'M3 4LQ', city: 'Manchester' },
    ],
    numberFirst: true,
    // 07700 900xxx is Ofcom's range reserved for fiction: it can never ring anyone.
    phone: (r) => `+44 7700 900${digits(3, r)}`,
  },
  IE: {
    places: [{ street: 'Camden Street', postalCode: 'D02 X285', city: 'Dublin' }],
    numberFirst: true,
    phone: (r) => `+353 85 ${digits(7, r)}`,
  },
  IT: {
    places: [{ street: 'Via Torino', postalCode: '20123', city: 'Milano' }],
    phone: (r) => `+39 320 ${digits(7, r)}`,
  },
  LT: {
    places: [{ street: 'Gedimino prospektas', postalCode: '01103', city: 'Vilnius' }],
    phone: (r) => `+370 6${digits(7, r)}`,
  },
  LV: {
    places: [{ street: 'Brīvības iela', postalCode: 'LV-1010', city: 'Rīga' }],
    phone: (r) => `+371 2${digits(7, r)}`,
  },
  NL: {
    places: [{ street: 'Prinsengracht', postalCode: '1016 GV', city: 'Amsterdam' }],
    phone: (r) => `+31 6 ${digits(8, r)}`,
  },
  PL: {
    places: [{ street: 'ul. Marszałkowska', postalCode: '00-024', city: 'Warszawa' }],
    phone: (r) => `+48 501 ${digits(6, r)}`,
  },
  PT: {
    places: [{ street: 'Rua Augusta', postalCode: '1100-053', city: 'Lisboa' }],
    phone: (r) => `+351 912 ${digits(6, r)}`,
  },
  SE: {
    places: [{ street: 'Drottninggatan', postalCode: '111 51', city: 'Stockholm' }],
    phone: (r) => `+46 70 ${digits(7, r)}`,
  },
};

/**
 * The country to fill: the one already chosen in the form when we have data for it and the store
 * ships there, else the store's first shipping country we know, else Germany.
 */
export function demoCountry(current: string, shipCountries: readonly string[]): string {
  if (current in COUNTRIES && shipCountries.includes(current)) return current;
  return shipCountries.find((c) => c in COUNTRIES) ?? 'DE';
}

export interface DemoAddress {
  line1: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
}

export function demoAddress(country: string, rng: Rng = Math.random): DemoAddress {
  const data = COUNTRIES[country] ?? COUNTRIES.DE!;
  const place = pick(data.places, rng);
  const number = String(1 + Math.floor(rng() * 120));
  return {
    line1: data.numberFirst ? `${number} ${place.street}` : `${place.street} ${number}`,
    postalCode: place.postalCode,
    city: place.city,
    country: country in COUNTRIES ? country : 'DE',
    phone: data.phone(rng),
  };
}

export function demoVet(rng: Rng = Math.random) {
  const last = pick(LAST_NAMES, rng);
  return {
    vetName: `Dr ${pick(FIRST_NAMES, rng)} ${last}`,
    clinic: `${pick(LAST_NAMES, rng)} Vet Clinic`,
    vetEmail: `vet+${token(rng)}@pawsome.test`,
  };
}

/** The seeded shopper accounts (customers only: the admin login is never offered). */
export const DEMO_ACCOUNTS = [
  { name: 'Sam', email: 'sam@pawsome.test' },
  { name: 'Riley', email: 'riley@pawsome.test' },
] as const;
/** The seed's shared demo password (`apps/api/src/db/seed/users.ts`), public by design. */
export const DEMO_ACCOUNT_PASSWORD = 'Pawsome-demo-1!';

/** Stripe's universal test card: test mode accepts only Stripe's own test numbers. */
export const TEST_CARD = { number: '4242 4242 4242 4242', expiry: '12 / 34', cvc: '123' } as const;
