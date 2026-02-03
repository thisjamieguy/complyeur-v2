/**
 * @fileoverview Tests for compliance vector calculations.
 *
 * Tests cover:
 * - computeComplianceVector: Daily compliance for date range
 * - computeComplianceVectorOptimized: Sliding window optimization
 * - computeMonthCompliance: Monthly calendar calculation
 * - computeYearCompliance: Yearly calendar calculation
 */

import { describe, it, expect } from 'vitest';
import {
  computeComplianceVector,
  computeComplianceVectorOptimized,
  computeMonthCompliance,
  computeYearCompliance,
} from '../compliance-vector';
import { InvalidReferenceDateError } from '../errors';
import type { Trip, ComplianceConfig, DailyCompliance } from '../types';

// Helper to create a trip
function createTrip(
  entry: string,
  exit: string,
  country: string = 'FR'
): Trip {
  return {
    entryDate: new Date(entry + 'T00:00:00.000Z'),
    exitDate: new Date(exit + 'T00:00:00.000Z'),
    country,
  };
}

// Use early compliance start date so tests don't hit the default Oct 12, 2025 cutoff
const EARLY_COMPLIANCE_START = new Date('2024-01-01T00:00:00.000Z');

// Helper to create config
function createConfig(overrides: Partial<ComplianceConfig> = {}): ComplianceConfig {
  return {
    mode: 'audit',
    referenceDate: new Date('2026-01-01T00:00:00.000Z'),
    complianceStartDate: EARLY_COMPLIANCE_START,
    ...overrides,
  };
}

// Helper to find result for specific date
function findByDate(results: DailyCompliance[], dateStr: string): DailyCompliance | undefined {
  return results.find(r => r.date.toISOString().startsWith(dateStr));
}

// Oracle calculator for independent verification
function oracleCalculateDaysUsed(
  trips: Trip[],
  referenceDate: Date,
  complianceStartDate: Date
): number {
  const schengenCountries = new Set([
    'AT', 'BE', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS',
    'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'SK', 'SI',
    'ES', 'SE', 'CH', 'MC', 'SM', 'VA', 'AD',
  ]);

  const schengenDays = new Set<string>();
  const refDate = new Date(referenceDate);
  refDate.setUTCHours(0, 0, 0, 0);
  const windowStart = new Date(refDate);
  windowStart.setUTCDate(windowStart.getUTCDate() - 180);

  // Respect compliance start date
  const effectiveWindowStart = windowStart < complianceStartDate ? complianceStartDate : windowStart;

  // Window is [refDate - 180, refDate - 1] (the day before the reference date)
  const windowEnd = new Date(refDate);
  windowEnd.setUTCDate(windowEnd.getUTCDate() - 1);

  for (const trip of trips) {
    if (!schengenCountries.has(trip.country.toUpperCase())) continue;

    const entry = new Date(trip.entryDate);
    entry.setUTCHours(0, 0, 0, 0);
    const exit = trip.exitDate ? new Date(trip.exitDate) : new Date(refDate);
    exit.setUTCHours(0, 0, 0, 0);

    let current = new Date(entry);
    while (current <= exit) {
      if (current >= effectiveWindowStart && current <= windowEnd) {
        schengenDays.add(current.toISOString().split('T')[0]);
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return schengenDays.size;
}

describe('computeComplianceVector', () => {
  describe('basic functionality', () => {
    it('returns daily compliance for date range', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-07T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVector(trips, startDate, endDate, config);

      expect(results).toHaveLength(7);
    });

    it('includes all required properties in results', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-01T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVector(trips, startDate, endDate, config);
      const result = results[0];

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('daysUsed');
      expect(result).toHaveProperty('daysRemaining');
      expect(result).toHaveProperty('riskLevel');
    });

    it('returns results in chronological order', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-05T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVector(trips, startDate, endDate, config);

      for (let i = 1; i < results.length; i++) {
        expect(results[i].date.getTime()).toBeGreaterThan(results[i - 1].date.getTime());
      }
    });
  });

  describe('calculation accuracy', () => {
    it('correctly calculates days used for each date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')]; // 10 days
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-03T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVector(trips, startDate, endDate, config);

      for (const result of results) {
        expect(result.daysUsed).toBe(10);
        expect(result.daysRemaining).toBe(80);
      }
    });

    it('matches oracle calculation', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-10', 'FR'),
        createTrip('2025-11-20', '2025-11-25', 'DE'),
      ];
      const startDate = new Date('2025-12-15T00:00:00.000Z');
      const endDate = new Date('2025-12-15T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVector(trips, startDate, endDate, config);
      const oracleResult = oracleCalculateDaysUsed(
        trips,
        new Date('2025-12-15T00:00:00.000Z'),
        config.complianceStartDate!
      );

      expect(results[0].daysUsed).toBe(oracleResult);
    });

    it('shows days expiring over time', () => {
      // Trip Oct 15-24 (10 days) - within compliance window
      const trips = [createTrip('2025-10-15', '2025-10-24')]; // 10 days
      // Check in late April 2026 when days start expiring
      // Oct 15 + 180 = Apr 13, so by Apr 14 window is [Oct 16, Apr 13], Oct 15 expires
      const startDate = new Date('2026-04-10T00:00:00.000Z');
      const endDate = new Date('2026-04-25T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVector(trips, startDate, endDate, config);

      const apr10 = findByDate(results, '2026-04-10');
      const apr25 = findByDate(results, '2026-04-25');

      // Apr 10: Window is [Oct 12, Apr 9], trip Oct 15-24 is fully in window = 10 days
      expect(apr10?.daysUsed).toBe(10);
      // Apr 25: Window is [Oct 27, Apr 24], Oct 15-24 expired = 0 days
      expect(apr25?.daysUsed).toBe(0);
    });

    it('calculates correct risk levels', () => {
      // Create different amounts of presence
      const trips = [createTrip('2025-10-01', '2025-12-14')]; // 75 days
      const startDate = new Date('2026-01-01T00:00:00.000Z');
      const endDate = new Date('2026-01-01T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVector(trips, startDate, endDate, config);

      expect(results[0].daysUsed).toBe(75);
      expect(results[0].daysRemaining).toBe(15);
      expect(results[0].riskLevel).toBe('amber');
    });
  });

  describe('date validation', () => {
    it('throws InvalidReferenceDateError for invalid start date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      expect(() =>
        computeComplianceVector(trips, new Date('invalid'), new Date('2025-12-31'), config)
      ).toThrow(InvalidReferenceDateError);
    });

    it('throws InvalidReferenceDateError for invalid end date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      expect(() =>
        computeComplianceVector(trips, new Date('2025-12-01'), new Date('invalid'), config)
      ).toThrow(InvalidReferenceDateError);
    });

    it('throws InvalidReferenceDateError when start after end', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      expect(() =>
        computeComplianceVector(
          trips,
          new Date('2025-12-31T00:00:00.000Z'),
          new Date('2025-12-01T00:00:00.000Z'),
          config
        )
      ).toThrow(InvalidReferenceDateError);
    });

    it('throws InvalidReferenceDateError for null start date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      expect(() =>
        computeComplianceVector(trips, null as unknown as Date, new Date('2025-12-31'), config)
      ).toThrow(InvalidReferenceDateError);
    });

    it('throws InvalidReferenceDateError for undefined end date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      expect(() =>
        computeComplianceVector(trips, new Date('2025-12-01'), undefined as unknown as Date, config)
      ).toThrow(InvalidReferenceDateError);
    });
  });

  describe('edge cases', () => {
    it('handles single day range', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const date = new Date('2025-12-01T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVector(trips, date, date, config);

      expect(results).toHaveLength(1);
    });

    it('handles same start and end date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const date = new Date('2025-12-15T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVector(trips, date, date, config);

      expect(results).toHaveLength(1);
      expect(results[0].daysUsed).toBe(10);
    });

    it('handles empty trips array', () => {
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-07T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVector([], startDate, endDate, config);

      expect(results).toHaveLength(7);
      for (const result of results) {
        expect(result.daysUsed).toBe(0);
        expect(result.daysRemaining).toBe(90);
        expect(result.riskLevel).toBe('green');
      }
    });

    it('handles trips outside the calculation window', () => {
      // Trip way before the calculation range
      const trips = [createTrip('2024-01-01', '2024-01-10')];
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-07T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVector(trips, startDate, endDate, config);

      for (const result of results) {
        expect(result.daysUsed).toBe(0);
      }
    });

    it('respects compliance start date', () => {
      // Trip spans before and after compliance start
      const trips = [createTrip('2025-01-01', '2025-01-20')];
      const startDate = new Date('2025-02-01T00:00:00.000Z');
      const endDate = new Date('2025-02-01T00:00:00.000Z');
      const config = createConfig({
        complianceStartDate: new Date('2025-01-10T00:00:00.000Z'),
      });

      const results = computeComplianceVector(trips, startDate, endDate, config);

      // Only Jan 10-20 should count (11 days)
      expect(results[0].daysUsed).toBe(11);
    });
  });
});

describe('computeComplianceVectorOptimized', () => {
  describe('basic functionality', () => {
    it('returns same results as non-optimized version', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-10', 'FR'),
        createTrip('2025-11-20', '2025-11-25', 'DE'),
      ];
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-15T00:00:00.000Z');
      const config = createConfig();

      const optimized = computeComplianceVectorOptimized(trips, startDate, endDate, config);
      const standard = computeComplianceVector(trips, startDate, endDate, config);

      expect(optimized).toHaveLength(standard.length);
      for (let i = 0; i < optimized.length; i++) {
        expect(optimized[i].daysUsed).toBe(standard[i].daysUsed);
        expect(optimized[i].daysRemaining).toBe(standard[i].daysRemaining);
        expect(optimized[i].riskLevel).toBe(standard[i].riskLevel);
      }
    });

    it('is faster for large date ranges', () => {
      const trips = [
        createTrip('2025-03-01', '2025-03-31', 'FR'),
        createTrip('2025-06-15', '2025-07-15', 'DE'),
      ];
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-12-31T00:00:00.000Z');
      const config = createConfig();

      const startOptimized = Date.now();
      const optimizedResults = computeComplianceVectorOptimized(trips, startDate, endDate, config);
      const optimizedDuration = Date.now() - startOptimized;

      expect(optimizedResults).toHaveLength(365);
      expect(optimizedDuration).toBeLessThan(1000); // Should be fast
    });
  });

  describe('sliding window correctness', () => {
    it('correctly tracks days falling out of window', () => {
      // Trip Oct 15-24 (10 days)
      const trips = [createTrip('2025-10-15', '2025-10-24')]; // 10 days
      const startDate = new Date('2026-04-12T00:00:00.000Z');
      const endDate = new Date('2026-04-25T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVectorOptimized(trips, startDate, endDate, config);

      // Apr 12: window [Oct 14, Apr 11] - all 10 days in window
      const apr12 = findByDate(results, '2026-04-12');
      expect(apr12?.daysUsed).toBe(10);

      // Apr 15: window [Oct 17, Apr 14] - Oct 15-16 fall out, 8 remain
      const apr15 = findByDate(results, '2026-04-15');
      expect(apr15?.daysUsed).toBe(8);

      // Apr 25: window [Oct 27, Apr 24] - all trip days fall out
      const apr25 = findByDate(results, '2026-04-25');
      expect(apr25?.daysUsed).toBe(0);
    });

    it('correctly tracks days entering the window', () => {
      // Trip starting mid-range
      const trips = [createTrip('2025-12-05', '2025-12-10')];
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-15T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVectorOptimized(trips, startDate, endDate, config);

      // Dec 1-5: no trip days yet (trip hasn't started or just started)
      const dec1 = findByDate(results, '2025-12-01');
      expect(dec1?.daysUsed).toBe(0);

      // Dec 6: Dec 5 now in window (yesterday)
      const dec6 = findByDate(results, '2025-12-06');
      expect(dec6?.daysUsed).toBe(1);

      // Dec 11: Dec 5-10 all in window (6 days)
      const dec11 = findByDate(results, '2025-12-11');
      expect(dec11?.daysUsed).toBe(6);
    });
  });

  describe('date validation', () => {
    it('throws InvalidReferenceDateError for invalid start date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      expect(() =>
        computeComplianceVectorOptimized(trips, new Date('invalid'), new Date('2025-12-31'), config)
      ).toThrow(InvalidReferenceDateError);
    });

    it('throws InvalidReferenceDateError for invalid end date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      expect(() =>
        computeComplianceVectorOptimized(trips, new Date('2025-12-01'), new Date('invalid'), config)
      ).toThrow(InvalidReferenceDateError);
    });

    it('throws InvalidReferenceDateError when start after end', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      expect(() =>
        computeComplianceVectorOptimized(
          trips,
          new Date('2025-12-31T00:00:00.000Z'),
          new Date('2025-12-01T00:00:00.000Z'),
          config
        )
      ).toThrow(InvalidReferenceDateError);
    });
  });

  describe('edge cases', () => {
    it('handles empty trips array', () => {
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-07T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVectorOptimized([], startDate, endDate, config);

      expect(results).toHaveLength(7);
      for (const result of results) {
        expect(result.daysUsed).toBe(0);
      }
    });

    it('handles single day range', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const date = new Date('2025-12-01T00:00:00.000Z');
      const config = createConfig();

      const results = computeComplianceVectorOptimized(trips, date, date, config);

      expect(results).toHaveLength(1);
    });
  });
});

describe('computeMonthCompliance', () => {
  describe('basic functionality', () => {
    it('calculates compliance for entire month', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      const results = computeMonthCompliance(trips, 2025, 12, config);

      // December has 31 days
      expect(results).toHaveLength(31);
    });

    it('uses 1-indexed months (January = 1)', () => {
      const trips = [createTrip('2025-01-01', '2025-01-10')];
      const config = createConfig();

      // February 2025
      const results = computeMonthCompliance(trips, 2025, 2, config);

      // February 2025 has 28 days
      expect(results).toHaveLength(28);

      // First result should be Feb 1
      expect(results[0].date.getUTCMonth()).toBe(1); // 0-indexed in Date
      expect(results[0].date.getUTCDate()).toBe(1);
    });

    it('handles leap year February', () => {
      const trips: Trip[] = [];
      const config = createConfig();

      // February 2024 (leap year)
      const results = computeMonthCompliance(trips, 2024, 2, config);

      expect(results).toHaveLength(29);
    });

    it('calculates correct values for each day', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')]; // 10 days
      const config = createConfig();

      const results = computeMonthCompliance(trips, 2025, 12, config);

      // All days in December should show 10 days used (trip in window)
      for (const result of results) {
        expect(result.daysUsed).toBe(10);
        expect(result.daysRemaining).toBe(80);
      }
    });
  });

  describe('month boundary handling', () => {
    it('correctly handles January', () => {
      const trips: Trip[] = [];
      const config = createConfig();

      const results = computeMonthCompliance(trips, 2025, 1, config);

      expect(results).toHaveLength(31);
      expect(results[0].date.getUTCFullYear()).toBe(2025);
      expect(results[0].date.getUTCMonth()).toBe(0);
      expect(results[0].date.getUTCDate()).toBe(1);
    });

    it('correctly handles December', () => {
      const trips: Trip[] = [];
      const config = createConfig();

      const results = computeMonthCompliance(trips, 2025, 12, config);

      expect(results).toHaveLength(31);
      expect(results[30].date.getUTCDate()).toBe(31);
    });

    it('handles trips spanning month boundaries', () => {
      const trips = [createTrip('2025-11-25', '2025-12-10')]; // Spans Nov-Dec
      const config = createConfig();

      const results = computeMonthCompliance(trips, 2025, 12, config);

      // Dec 1: Should show days from Nov 25 - Nov 30 (6 days in window)
      // Actually window is [ref - 180, ref - 1], so Dec 1 sees Nov 25-30
      const dec1 = results[0];
      expect(dec1.daysUsed).toBe(6);

      // Dec 11: Shows Nov 25 - Dec 10 (16 days)
      const dec11 = results[10];
      expect(dec11.daysUsed).toBe(16);
    });
  });

  describe('edge cases', () => {
    it('handles empty trips for month', () => {
      const trips: Trip[] = [];
      const config = createConfig();

      const results = computeMonthCompliance(trips, 2025, 6, config);

      expect(results).toHaveLength(30); // June has 30 days
      for (const result of results) {
        expect(result.daysUsed).toBe(0);
        expect(result.riskLevel).toBe('green');
      }
    });

    it('handles 30-day month', () => {
      const trips: Trip[] = [];
      const config = createConfig();

      // April has 30 days
      const results = computeMonthCompliance(trips, 2025, 4, config);

      expect(results).toHaveLength(30);
    });

    it('handles 31-day month', () => {
      const trips: Trip[] = [];
      const config = createConfig();

      // March has 31 days
      const results = computeMonthCompliance(trips, 2025, 3, config);

      expect(results).toHaveLength(31);
    });
  });
});

describe('computeYearCompliance', () => {
  describe('basic functionality', () => {
    it('calculates compliance for entire year', () => {
      const trips = [createTrip('2025-06-01', '2025-06-30')];
      const config = createConfig();

      const results = computeYearCompliance(trips, 2025, config);

      // 2025 is not a leap year: 365 days
      expect(results).toHaveLength(365);
    });

    it('handles leap year', () => {
      const trips: Trip[] = [];
      const config = createConfig();

      const results = computeYearCompliance(trips, 2024, config);

      // 2024 is a leap year: 366 days
      expect(results).toHaveLength(366);
    });

    it('returns results in chronological order', () => {
      const trips = [createTrip('2025-06-01', '2025-06-30')];
      const config = createConfig();

      const results = computeYearCompliance(trips, 2025, config);

      // First should be Jan 1
      expect(results[0].date.getUTCMonth()).toBe(0);
      expect(results[0].date.getUTCDate()).toBe(1);

      // Last should be Dec 31
      expect(results[364].date.getUTCMonth()).toBe(11);
      expect(results[364].date.getUTCDate()).toBe(31);
    });

    it('calculates compliance changes throughout the year', () => {
      // Trip in June
      const trips = [createTrip('2025-06-01', '2025-06-30')]; // 30 days
      const config = createConfig();

      const results = computeYearCompliance(trips, 2025, config);

      // January: trip not yet happened (future from Jan perspective)
      // In audit mode, future trips don't count
      const jan1 = findByDate(results, '2025-01-01');
      expect(jan1?.daysUsed).toBe(0);

      // May: trip not yet started
      const may1 = findByDate(results, '2025-05-01');
      expect(may1?.daysUsed).toBe(0);

      // July: trip just completed, fully in window
      const jul15 = findByDate(results, '2025-07-15');
      expect(jul15?.daysUsed).toBe(30);
    });
  });

  describe('performance', () => {
    it('calculates 365 days efficiently', () => {
      const trips = [
        createTrip('2025-03-01', '2025-03-31', 'FR'),
        createTrip('2025-06-15', '2025-07-15', 'DE'),
        createTrip('2025-09-01', '2025-09-15', 'ES'),
      ];
      const config = createConfig();

      const startTime = Date.now();
      const results = computeYearCompliance(trips, 2025, config);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(365);
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });

  describe('edge cases', () => {
    it('handles year with no trips', () => {
      const trips: Trip[] = [];
      const config = createConfig();

      const results = computeYearCompliance(trips, 2025, config);

      expect(results).toHaveLength(365);
      for (const result of results) {
        expect(result.daysUsed).toBe(0);
        expect(result.riskLevel).toBe('green');
      }
    });

    it('handles trips spanning multiple years', () => {
      // Trip spanning Dec 2024 - Jan 2025
      const trips = [createTrip('2024-12-15', '2025-01-15')];
      const config = createConfig({
        complianceStartDate: new Date('2024-01-01T00:00:00.000Z'),
      });

      const results = computeYearCompliance(trips, 2025, config);

      // January 2025 should see Dec 15-31 (17 days) + Jan 1-14 (for Jan 15 ref)
      const jan16 = findByDate(results, '2025-01-16');
      // Window for Jan 16 is [Jul 20 2024, Jan 15], trip Dec 15 - Jan 15 = 32 days
      expect(jan16?.daysUsed).toBe(32);
    });
  });
});

describe('integration scenarios', () => {
  describe('oracle comparison', () => {
    it('matches oracle for complex trip patterns', () => {
      const trips = [
        createTrip('2025-02-01', '2025-02-15', 'FR'),
        createTrip('2025-03-10', '2025-03-20', 'DE'),
        createTrip('2025-04-01', '2025-04-10', 'ES'),
        createTrip('2025-05-15', '2025-05-25', 'IT'),
      ];
      const config = createConfig({
        complianceStartDate: new Date('2025-01-01T00:00:00.000Z'),
      });

      const testDates = [
        new Date('2025-06-01T00:00:00.000Z'),
        new Date('2025-09-01T00:00:00.000Z'),
        new Date('2025-12-01T00:00:00.000Z'),
      ];

      for (const testDate of testDates) {
        const vectorResults = computeComplianceVector(trips, testDate, testDate, config);
        const oracleResult = oracleCalculateDaysUsed(trips, testDate, config.complianceStartDate!);

        expect(vectorResults[0].daysUsed).toBe(oracleResult);
      }
    });

    it('matches oracle for overlapping trips', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-10', 'FR'),
        createTrip('2025-11-05', '2025-11-15', 'DE'),
        createTrip('2025-11-12', '2025-11-20', 'ES'),
      ];
      const testDate = new Date('2025-12-15T00:00:00.000Z');
      const config = createConfig();

      const vectorResults = computeComplianceVector(trips, testDate, testDate, config);
      const oracleResult = oracleCalculateDaysUsed(trips, testDate, config.complianceStartDate!);

      // Nov 1-20 = 20 unique days
      expect(vectorResults[0].daysUsed).toBe(oracleResult);
      expect(vectorResults[0].daysUsed).toBe(20);
    });
  });

  describe('custom thresholds', () => {
    it('respects custom limit', () => {
      const trips = [createTrip('2025-11-01', '2025-11-30')]; // 30 days
      const startDate = new Date('2025-12-15T00:00:00.000Z');
      const endDate = new Date('2025-12-15T00:00:00.000Z');
      const config = createConfig({ limit: 60 }); // Custom 60-day limit

      const results = computeComplianceVector(trips, startDate, endDate, config);

      expect(results[0].daysUsed).toBe(30);
      expect(results[0].daysRemaining).toBe(30); // 60 - 30
    });

    it('respects custom risk thresholds', () => {
      const trips = [createTrip('2025-10-01', '2025-12-09')]; // 70 days
      const startDate = new Date('2026-01-01T00:00:00.000Z');
      const endDate = new Date('2026-01-01T00:00:00.000Z');
      const config = createConfig({
        thresholds: { green: 30, amber: 10 },
      });

      const results = computeComplianceVector(trips, startDate, endDate, config);

      expect(results[0].daysUsed).toBe(70);
      expect(results[0].daysRemaining).toBe(20);
      expect(results[0].riskLevel).toBe('amber'); // 20 days remaining, between 10 and 30
    });
  });

  describe('mixed country handling', () => {
    it('excludes non-Schengen countries from calculations', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-10', 'FR'),  // Schengen
        createTrip('2025-11-15', '2025-11-20', 'IE'),  // Non-Schengen (Ireland)
        createTrip('2025-11-25', '2025-11-30', 'GB'),  // Non-Schengen (UK)
      ];
      const config = createConfig();

      const results = computeMonthCompliance(trips, 2025, 12, config);

      // Only France should count (10 days)
      const dec15 = findByDate(results, '2025-12-15');
      expect(dec15?.daysUsed).toBe(10);
    });

    it('includes Schengen microstates', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-05', 'MC'),  // Monaco
        createTrip('2025-11-10', '2025-11-12', 'SM'),  // San Marino
        createTrip('2025-11-15', '2025-11-17', 'VA'),  // Vatican
        createTrip('2025-11-20', '2025-11-22', 'AD'),  // Andorra
      ];
      const config = createConfig();

      const results = computeMonthCompliance(trips, 2025, 12, config);

      // 5 + 3 + 3 + 3 = 14 days
      const dec1 = findByDate(results, '2025-12-01');
      expect(dec1?.daysUsed).toBe(14);
    });
  });
});
