import { describe, expect, it } from 'vitest';
import {
  addUtcDays,
  differenceInUtcDays,
  parseDateOnlyAsUTC,
  toUTCMidnight,
} from '../date-utils';

describe('date-utils', () => {
  describe('parseDateOnlyAsUTC', () => {
    it('parses date-only strings at UTC midnight', () => {
      const parsed = parseDateOnlyAsUTC('2026-03-30');

      expect(parsed.toISOString()).toBe('2026-03-30T00:00:00.000Z');
    });

    it('trims whitespace before parsing date-only strings', () => {
      const parsed = parseDateOnlyAsUTC(' 2026-03-30 ');

      expect(parsed.toISOString()).toBe('2026-03-30T00:00:00.000Z');
    });

    it('falls back to parseISO for timestamp inputs', () => {
      const parsed = parseDateOnlyAsUTC('2026-03-30T23:15:00+02:00');

      expect(parsed.toISOString()).toBe('2026-03-30T21:15:00.000Z');
    });
  });

  describe('toUTCMidnight', () => {
    it('strips the time while keeping the UTC calendar date', () => {
      const date = new Date('2026-03-30T23:15:00-05:00');

      expect(toUTCMidnight(date).toISOString()).toBe('2026-03-31T00:00:00.000Z');
    });
  });

  describe('addUtcDays', () => {
    it('adds calendar days using UTC math across DST boundaries', () => {
      const date = new Date('2026-03-29T12:30:00.000Z');

      expect(addUtcDays(date, 1).toISOString()).toBe('2026-03-30T00:00:00.000Z');
      expect(addUtcDays(date, -1).toISOString()).toBe('2026-03-28T00:00:00.000Z');
    });
  });

  describe('differenceInUtcDays', () => {
    it('returns whole-day differences based on UTC calendar dates', () => {
      const earlier = new Date('2026-03-29T23:30:00-05:00');
      const later = new Date('2026-04-02T01:15:00+01:00');

      expect(differenceInUtcDays(later, earlier)).toBe(3);
    });

    it('returns negative values when dates are reversed', () => {
      const earlier = new Date('2026-03-30T00:00:00.000Z');
      const later = new Date('2026-04-02T00:00:00.000Z');

      expect(differenceInUtcDays(earlier, later)).toBe(-3);
    });
  });
});
