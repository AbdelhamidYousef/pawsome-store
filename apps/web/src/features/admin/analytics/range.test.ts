import { describe, expect, it } from 'vitest';

import { formatBasisPoints, intervalFor, parsePreset, rangeFor, todayInStore } from './range';

describe('analytics range', () => {
  it('knows the presets and falls back to 30 for anything else', () => {
    expect(parsePreset('7')).toBe(7);
    expect(parsePreset('90')).toBe(90);
    expect(parsePreset(null)).toBe(30);
    expect(parsePreset('365')).toBe(30);
    expect(parsePreset('abc')).toBe(30);
  });

  it('uses weekly points for 90 days and daily points otherwise', () => {
    expect(intervalFor(7)).toBe('day');
    expect(intervalFor(30)).toBe('day');
    expect(intervalFor(90)).toBe('week');
  });

  it("counts today on the shop's calendar, not UTC", () => {
    // 23:30 UTC on the 3rd is 00:30 on the 4th in Amsterdam (UTC+1 in November).
    expect(todayInStore(new Date('2026-11-03T23:30:00Z'))).toBe('2026-11-04');
    expect(todayInStore(new Date('2026-11-03T22:30:00Z'))).toBe('2026-11-03');
    expect(todayInStore(new Date('2026-11-03T10:00:00Z'))).toBe('2026-11-03');
  });

  it('makes a range of exactly n days ending today', () => {
    expect(rangeFor(7, new Date('2026-11-14T10:00:00Z'))).toEqual({
      from: '2026-11-08',
      to: '2026-11-14',
    });
    expect(rangeFor(30, new Date('2026-11-14T10:00:00Z'))).toEqual({
      from: '2026-10-16',
      to: '2026-11-14',
    });
  });

  it('formats basis points without floats', () => {
    expect(formatBasisPoints(0)).toBe('0.00 %');
    expect(formatBasisPoints(5)).toBe('0.05 %');
    expect(formatBasisPoints(3333)).toBe('33.33 %');
    expect(formatBasisPoints(10000)).toBe('100.00 %');
  });
});
