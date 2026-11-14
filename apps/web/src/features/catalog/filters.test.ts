import { describe, expect, it } from 'vitest';

import { lookupFor } from '../../i18n';

import {
  centsToInput,
  defaultSort,
  formatFacetValue,
  parsePriceInput,
  priceChipLabel,
  sortOptions,
} from './filters';

describe('parsePriceInput', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['19.99', 1999],
    ['0.05', 5],
    ['7,25', 725],
  ])('turns %s into %i cents without float maths', (text, cents) => {
    expect(parsePriceInput(text)).toEqual({ cents });
  });
  it('treats blank as empty and junk as an error', () => {
    expect(parsePriceInput('  ')).toEqual({ empty: true });
    expect(parsePriceInput('abc')).toHaveProperty('error');
    expect(parsePriceInput('-3')).toHaveProperty('error');
    expect(parsePriceInput('1.234')).toHaveProperty('error');
  });
});

describe('formatting', () => {
  it('round-trips cents to an input value', () => {
    expect(centsToInput(1200)).toBe('12');
    expect(centsToInput(1205)).toBe('12.05');
    expect(centsToInput(undefined)).toBe('');
  });
  it('makes facet values readable', () => {
    expect(formatFacetValue('pet', 'small')).toBe('Small pets');
    expect(formatFacetValue('ageStage', 'all')).toBe('All ages');
    expect(formatFacetValue('material', 'natural rubber')).toBe('Natural rubber');
    expect(formatFacetValue('material', 'rubber')).toBe('Rubber & silicone');
    expect(formatFacetValue('material', 'wood', lookupFor('de-DE').t)).toBe('Holz & Bambus');
  });
  it('offers best match only for a search', () => {
    expect(sortOptions(true)[0]).toBe('relevance');
    expect(sortOptions(false)).not.toContain('relevance');
    expect(defaultSort(true)).toBe('relevance');
    expect(defaultSort(false)).toBe('newest');
  });
  it('labels price chips', () => {
    expect(priceChipLabel(500, 2000, 'EUR')).toBe('Price: €5.00 - €20.00');
    expect(priceChipLabel(undefined, 2000, 'EUR')).toBe('Price: up to €20.00');
  });
});
