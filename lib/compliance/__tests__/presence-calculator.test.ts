/**
 * @fileoverview Tests for presence days calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  presenceDays,
  normalizeToUTCDate,
  dateKeysToArray,
  getPresenceBounds,
} from '../presence-calculator';
import { InvalidTripError, InvalidDateRangeError, InvalidReferenceDateError } from '../errors';
import type { Trip, ComplianceConfig } from '../types';

// Helper to create test config
function createConfig(overrides: Partial<ComplianceConfig> = {}): ComplianceConfig {
  return {
    mode: 'audit',
    referenceDate: new Date('2026-01-01'),
    complianceStartDate: new Date('2025-10-12'),
    ...overrides,
  };
}

// Helper to create trip
function createTrip(
  entry: string,
  exit: string,
  country: string = 'FR'
): Trip {
  return {
    entryDate: new Date(entry),
    exitDate: new Date(exit),
    country,
  };
}

describe('presenceDays', () => {
  describe('basic calculations', () => {
    it('calculates presence for a single trip', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig({ referenceDate: new Date('2025-12-01') });

      const days = presenceDays(trips, config);

      expect(days.size).toBe(10); // Nov 1-10 = 10 days
    });

    it('same-day trip counts as 1 day', () => {
      const trips = [createTrip('2025-11-15', '2025-11-15')];
      const config = createConfig({ referenceDate: new Date('2025-12-01') });

      const days = presenceDays(trips, config);

      expect(days.size).toBe(1);
    });

    it('handles multiple non-overlapping trips', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-05'),
        createTrip('2025-11-10', '2025-11-15'),
      ];
      const config = createConfig({ referenceDate: new Date('2025-12-01') });

      const days = presenceDays(trips, config);

      expect(days.size).toBe(11); // 5 + 6 days
    });

    it('deduplicates overlapping trips', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-10', 'FR'),
        createTrip('2025-11-05', '2025-11-15', 'DE'),
      ];
      const config = createConfig({ referenceDate: new Date('2025-12-01') });

      const days = presenceDays(trips, config);

      // Nov 1-15 = 15 unique days (not 10 + 11 = 21)
      expect(days.size).toBe(15);
    });

    it('returns empty set for empty trips array', () => {
      const config = createConfig();
      const days = presenceDays([], config);

      expect(days.size).toBe(0);
    });
  });

  describe('compliance start date handling', () => {
    it('excludes trips entirely before compliance start', () => {
      const trips = [createTrip('2025-09-01', '2025-09-10')];
      const config = createConfig({
        referenceDate: new Date('2025-12-01'),
        complianceStartDate: new Date('2025-10-12'),
      });

      const days = presenceDays(trips, config);

      expect(days.size).toBe(0);
    });

    it('clips trip start to compliance start date', () => {
      // Trip spans Oct 1-20, but compliance starts Oct 12
      const trips = [createTrip('2025-10-01', '2025-10-20')];
      const config = createConfig({
        referenceDate: new Date('2025-12-01'),
        complianceStartDate: new Date('2025-10-12'),
      });

      const days = presenceDays(trips, config);

      // Oct 12-20 = 9 days (not 20 days)
      expect(days.size).toBe(9);
    });

    it('includes trip ending on compliance start date', () => {
      const trips = [createTrip('2025-10-10', '2025-10-12')];
      const config = createConfig({
        referenceDate: new Date('2025-12-01'),
        complianceStartDate: new Date('2025-10-12'),
      });

      const days = presenceDays(trips, config);

      // Only Oct 12 counts
      expect(days.size).toBe(1);
    });
  });

  describe('non-Schengen country handling', () => {
    it('excludes Ireland (IE) trips', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-10', 'FR'),
        createTrip('2025-11-05', '2025-11-15', 'IE'),
      ];
      const config = createConfig({ referenceDate: new Date('2025-12-01') });

      const days = presenceDays(trips, config);

      // Only France trip counts
      expect(days.size).toBe(10);
    });

    it('excludes Cyprus (CY) trips', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10', 'CY')];
      const config = createConfig({ referenceDate: new Date('2025-12-01') });

      const days = presenceDays(trips, config);

      expect(days.size).toBe(0);
    });

    it('excludes UK (GB) trips', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10', 'GB')];
      const config = createConfig({ referenceDate: new Date('2025-12-01') });

      const days = presenceDays(trips, config);

      expect(days.size).toBe(0);
    });

    it('includes microstate trips (Monaco, Vatican, etc.)', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-03', 'MC'), // Monaco
        createTrip('2025-11-05', '2025-11-07', 'VA'), // Vatican
        createTrip('2025-11-10', '2025-11-12', 'SM'), // San Marino
        createTrip('2025-11-15', '2025-11-17', 'AD'), // Andorra
      ];
      const config = createConfig({ referenceDate: new Date('2025-12-01') });

      const days = presenceDays(trips, config);

      expect(days.size).toBe(12); // 3 + 3 + 3 + 3
    });
  });

  describe('audit vs planning mode', () => {
    it('audit mode excludes future trips', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-10'), // Past
        createTrip('2025-12-15', '2025-12-20'), // Future
      ];
      const config = createConfig({
        mode: 'audit',
        referenceDate: new Date('2025-12-01'),
      });

      const days = presenceDays(trips, config);

      // Only past trip counts
      expect(days.size).toBe(10);
    });

    it('planning mode includes future trips', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-10'), // Past
        createTrip('2025-12-15', '2025-12-20'), // Future
      ];
      const config = createConfig({
        mode: 'planning',
        referenceDate: new Date('2025-12-01'),
      });

      const days = presenceDays(trips, config);

      // Both trips count
      expect(days.size).toBe(16); // 10 + 6
    });

    it('audit mode clips ongoing trip to reference date', () => {
      // Trip spans Nov 25 - Dec 10, but reference is Dec 1
      const trips = [createTrip('2025-11-25', '2025-12-10')];
      const config = createConfig({
        mode: 'audit',
        referenceDate: new Date('2025-12-01'),
      });

      const days = presenceDays(trips, config);

      // Nov 25 - Dec 1 = 7 days
      expect(days.size).toBe(7);
    });
  });

  describe('input validation', () => {
    it('throws InvalidReferenceDateError for invalid reference date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = {
        mode: 'audit' as const,
        referenceDate: new Date('invalid'),
      };

      expect(() => presenceDays(trips, config)).toThrow(InvalidReferenceDateError);
    });

    it('throws InvalidTripError for missing entry date', () => {
      const trips = [
        {
          entryDate: null as unknown as Date,
          exitDate: new Date('2025-11-10'),
          country: 'FR',
        },
      ];
      const config = createConfig();

      expect(() => presenceDays(trips, config)).toThrow(InvalidTripError);
    });

    it('throws InvalidTripError for missing exit date', () => {
      const trips = [
        {
          entryDate: new Date('2025-11-01'),
          exitDate: null as unknown as Date,
          country: 'FR',
        },
      ];
      const config = createConfig();

      expect(() => presenceDays(trips, config)).toThrow(InvalidTripError);
    });

    it('throws InvalidTripError for empty country', () => {
      const trips = [
        {
          entryDate: new Date('2025-11-01'),
          exitDate: new Date('2025-11-10'),
          country: '',
        },
      ];
      const config = createConfig();

      expect(() => presenceDays(trips, config)).toThrow(InvalidTripError);
    });

    it('throws InvalidDateRangeError when exit before entry', () => {
      const trips = [createTrip('2025-11-10', '2025-11-01')];
      const config = createConfig();

      expect(() => presenceDays(trips, config)).toThrow(InvalidDateRangeError);
    });

    it('provides error details for InvalidTripError', () => {
      const trips = [
        {
          entryDate: new Date('2025-11-01'),
          exitDate: new Date('2025-11-10'),
          country: '',
        },
      ];
      const config = createConfig();

      try {
        presenceDays(trips, config);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidTripError);
        expect((e as InvalidTripError).field).toBe('country');
      }
    });
  });
});

describe('normalizeToUTCDate', () => {
  it('strips time component', () => {
    const date = new Date('2025-11-15T14:30:00.000Z');
    const normalized = normalizeToUTCDate(date);

    expect(normalized.getUTCHours()).toBe(0);
    expect(normalized.getUTCMinutes()).toBe(0);
    expect(normalized.getUTCSeconds()).toBe(0);
    expect(normalized.getUTCMilliseconds()).toBe(0);
  });

  it('preserves date', () => {
    const date = new Date('2025-11-15T14:30:00.000Z');
    const normalized = normalizeToUTCDate(date);

    expect(normalized.getUTCFullYear()).toBe(2025);
    expect(normalized.getUTCMonth()).toBe(10); // November (0-indexed)
    expect(normalized.getUTCDate()).toBe(15);
  });
});

describe('dateKeysToArray', () => {
  it('converts set of keys to sorted Date array', () => {
    const keys = new Set(['2025-11-05', '2025-11-01', '2025-11-03']);
    const dates = dateKeysToArray(keys);

    expect(dates).toHaveLength(3);
    expect(dates[0].toISOString()).toContain('2025-11-01');
    expect(dates[1].toISOString()).toContain('2025-11-03');
    expect(dates[2].toISOString()).toContain('2025-11-05');
  });

  it('returns empty array for empty set', () => {
    const dates = dateKeysToArray(new Set());
    expect(dates).toHaveLength(0);
  });
});

describe('getPresenceBounds', () => {
  it('returns earliest and latest dates', () => {
    const keys = new Set(['2025-11-05', '2025-11-01', '2025-11-10']);
    const bounds = getPresenceBounds(keys);

    expect(bounds).not.toBeNull();
    expect(bounds!.earliest.toISOString()).toContain('2025-11-01');
    expect(bounds!.latest.toISOString()).toContain('2025-11-10');
  });

  it('returns null for empty set', () => {
    const bounds = getPresenceBounds(new Set());
    expect(bounds).toBeNull();
  });
});
