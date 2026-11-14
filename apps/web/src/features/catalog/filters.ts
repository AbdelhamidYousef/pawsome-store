import { FACET_KEYS, formatMoney, type FacetKey, type ProductSort } from '@store/shared';

import { lookupFor, type StringKey, type TFunction } from '../../i18n';

// Helpers that return text take `t` as a parameter; left out, they speak the default English
// (how the plain unit tests and non-React callers use them).
const defaultT = lookupFor('en-IE').t;

export const FACET_LABELS: Record<FacetKey, StringKey> = {
  pet: 'catalog.facet.pet',
  material: 'catalog.facet.material',
  ageStage: 'catalog.facet.ageStage',
};

export const FACET_ORDER: readonly FacetKey[] = FACET_KEYS;

const PET_LABELS: Record<string, StringKey> = {
  dog: 'catalog.facet.petDog',
  cat: 'catalog.facet.petCat',
  bird: 'catalog.facet.petBird',
  fish: 'catalog.facet.petFish',
  small: 'catalog.facet.petSmall',
  reptile: 'catalog.facet.petReptile',
};

// The seed's material vocabulary (apps/api/src/db/seed/materials.ts). A value an admin typed by
// hand has no entry and is shown as typed.
const MATERIAL_LABELS: Record<string, StringKey> = {
  cotton: 'catalog.material.cotton',
  rope: 'catalog.material.rope',
  rubber: 'catalog.material.rubber',
  plush: 'catalog.material.plush',
  fabric: 'catalog.material.fabric',
  nylon: 'catalog.material.nylon',
  metal: 'catalog.material.metal',
  ceramic: 'catalog.material.ceramic',
  plastic: 'catalog.material.plastic',
  glass: 'catalog.material.glass',
  wood: 'catalog.material.wood',
  natural: 'catalog.material.natural',
};

// Facet values are raw data ("small", "all", "baked meat and oat treats"); this makes them
// readable without hardcoding which values exist.
export function formatFacetValue(key: string, value: string, t: TFunction = defaultT): string {
  const petKey = PET_LABELS[value];
  if (key === 'pet') return petKey ? t(petKey) : capitalise(value);
  if (key === 'ageStage' && value === 'all') return t('catalog.facet.allAges');
  const materialKey = key === 'material' ? MATERIAL_LABELS[value] : undefined;
  if (materialKey) return t(materialKey);
  return capitalise(value);
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function facetLabel(key: string, t: TFunction = defaultT): string {
  return key in FACET_LABELS ? t(FACET_LABELS[key as FacetKey]) : capitalise(key);
}

export const SORT_LABELS: Record<ProductSort, StringKey> = {
  relevance: 'catalog.sort.relevance',
  newest: 'catalog.sort.newest',
  price_asc: 'catalog.sort.priceAsc',
  price_desc: 'catalog.sort.priceDesc',
  unit_price_asc: 'catalog.sort.unitPriceAsc',
  name: 'catalog.sort.name',
};

export function sortOptions(hasSearch: boolean): ProductSort[] {
  return hasSearch
    ? ['relevance', 'newest', 'price_asc', 'price_desc', 'unit_price_asc', 'name']
    : ['newest', 'price_asc', 'price_desc', 'unit_price_asc', 'name'];
}

export function defaultSort(hasSearch: boolean): ProductSort {
  return hasSearch ? 'relevance' : 'newest';
}

export type PriceInput = { cents: number } | { empty: true } | { error: string };

// "12", "12.5", "12.50" -> cents, by splitting on the dot: no float multiplication, so 19.99
// never becomes 1998.9999. Anything else is an error shown next to the field.
export function parsePriceInput(text: string): PriceInput {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return { empty: true };
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (!match) return { error: 'Enter a price like 12.50' }; // shown through tm(): msg.catalog.priceFormat
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  return { cents: whole * 100 + fraction };
}

export function centsToInput(cents: number | undefined): string {
  if (cents === undefined) return '';
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, '0')}`;
}

export function priceChipLabel(
  min: number | undefined,
  max: number | undefined,
  currency: string,
  t: TFunction = defaultT,
  locale?: string,
): string {
  const money = (cents: number) => formatMoney(cents, currency, locale);
  if (min !== undefined && max !== undefined)
    return t('catalog.filters.priceRange', { min: money(min), max: money(max) });
  if (min !== undefined) return t('catalog.filters.priceFrom', { min: money(min) });
  return t('catalog.filters.priceUpTo', { max: money(max ?? 0) });
}
