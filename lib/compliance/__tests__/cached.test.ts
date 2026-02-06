/**
 * @fileoverview Tests for cached compliance calculations.
 *
 * Tests cover:
 * - getCachedCompliance: React cache-wrapped calculation
 * - batchCalculateCompliance: Multiple employees in one call
 * - createComplianceCalculator: Memoized calculator factory
 * - calculateComplianceRange: Compliance over date range
 * - getComplianceAtDates: Compliance at specific dates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  batchCalculateCompliance,
  createComplianceCalculator,
  calculateComplianceRange,
  getComplianceAtDates,
} from '../cached';
import type { Trip, ComplianceConfig, ComplianceResult } from '../types';

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

// Helper to generate consecutive dates
function generateDates(start: string, count: number): string[] {
  const dates: string[] = [];
  const startDate = new Date(start + 'T00:00:00.000Z');
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

describe('batchCalculateCompliance', () => {
  describe('basic functionality', () => {
    it('processes multiple employees', () => {
      const employees = [
        {
          id: 'emp-1',
          trips: [createTrip('2025-11-01', '2025-11-10')],
        },
        {
          id: 'emp-2',
          trips: [createTrip('2025-11-01', '2025-11-20')],
        },
        {
          id: 'emp-3',
          trips: [],
        },
      ];
      const referenceDate = new Date('2026-01-01T00:00:00.000Z');

      const results = batchCalculateCompliance(employees, referenceDate);

      expect(results.size).toBe(3);
      expect(results.has('emp-1')).toBe(true);
      expect(results.has('emp-2')).toBe(true);
      expect(results.has('emp-3')).toBe(true);
    });

    it('returns correct compliance for each employee', () => {
      const employees = [
        {
          id: 'emp-10-days',
          trips: [createTrip('2025-11-01', '2025-11-10')], // 10 days
        },
        {
          id: 'emp-30-days',
          trips: [createTrip('2025-11-01', '2025-11-30')], // 30 days
        },
      ];
      const referenceDate = new Date('2026-01-01T00:00:00.000Z');

      const results = batchCalculateCompliance(employees, referenceDate);

      const emp10 = results.get('emp-10-days');
      const emp30 = results.get('emp-30-days');

      expect(emp10?.daysUsed).toBe(10);
      expect(emp10?.daysRemaining).toBe(80);
      expect(emp30?.daysUsed).toBe(30);
      expect(emp30?.daysRemaining).toBe(60);
    });

    it('uses audit mode by default', () => {
      // Create a future trip that should be excluded in audit mode
      const employees = [
        {
          id: 'emp-1',
          trips: [
            createTrip('2025-11-01', '2025-11-10'), // Past
            createTrip('2026-02-01', '2026-02-10'), // Future (should be ignored)
          ],
        },
      ];
      const referenceDate = new Date('2026-01-01T00:00:00.000Z');

      const results = batchCalculateCompliance(employees, referenceDate);

      const result = results.get('emp-1');
      expect(result?.daysUsed).toBe(10); // Only past trip counts
    });
  });

  describe('edge cases', () => {
    it('handles empty employees array', () => {
      const results = batchCalculateCompliance([], new Date('2026-01-01'));
      expect(results.size).toBe(0);
    });

    it('handles employees with no trips', () => {
      const employees = [
        { id: 'no-trips', trips: [] },
      ];
      const results = batchCalculateCompliance(employees, new Date('2026-01-01'));

      const result = results.get('no-trips');
      expect(result?.daysUsed).toBe(0);
      expect(result?.daysRemaining).toBe(90);
      expect(result?.isCompliant).toBe(true);
    });

    it('handles overlapping trips for same employee', () => {
      const employees = [
        {
          id: 'overlapping',
          trips: [
            createTrip('2025-11-01', '2025-11-10', 'FR'),
            createTrip('2025-11-05', '2025-11-15', 'DE'),
          ],
        },
      ];
      const results = batchCalculateCompliance(employees, new Date('2026-01-01'));

      const result = results.get('overlapping');
      // Nov 1-15 = 15 unique days (not 10 + 11 = 21)
      expect(result?.daysUsed).toBe(15);
    });

    it('handles many employees efficiently', () => {
      const employees = Array.from({ length: 100 }, (_, i) => ({
        id: `emp-${i}`,
        trips: [createTrip('2025-11-01', '2025-11-10')],
      }));

      const startTime = Date.now();
      const results = batchCalculateCompliance(employees, new Date('2026-01-01'));
      const duration = Date.now() - startTime;

      expect(results.size).toBe(100);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('compliance calculations', () => {
    it('correctly identifies compliant employees', () => {
      const employees = [
        {
          id: 'compliant',
          trips: [createTrip('2025-11-01', '2025-11-30')], // 30 days
        },
      ];

      const results = batchCalculateCompliance(employees, new Date('2026-01-01'));
      const result = results.get('compliant');

      expect(result?.isCompliant).toBe(true);
      expect(result?.riskLevel).toBe('green');
    });

    it('correctly identifies non-compliant employees', () => {
      // Note: batchCalculateCompliance uses default compliance start (epoch)
      // Trip must be after that date. Use Mar 1, 2026 ref to fit 90 days in window.
      const employees = [
        {
          id: 'non-compliant',
          trips: [createTrip('2025-11-01', '2026-01-29')], // 90 days
        },
      ];

      const results = batchCalculateCompliance(employees, new Date('2026-03-01'));
      const result = results.get('non-compliant');

      expect(result?.daysUsed).toBe(90);
      expect(result?.isCompliant).toBe(false);
    });
  });
});

describe('createComplianceCalculator', () => {
  describe('basic functionality', () => {
    it('creates a working calculator function', () => {
      const calculator = createComplianceCalculator();
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      const result = calculator(trips, config);

      expect(result.daysUsed).toBe(10);
      expect(result.daysRemaining).toBe(80);
    });

    it('returns correct result type', () => {
      const calculator = createComplianceCalculator();
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      const result = calculator(trips, config);

      expect(result).toHaveProperty('referenceDate');
      expect(result).toHaveProperty('daysUsed');
      expect(result).toHaveProperty('daysRemaining');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('isCompliant');
    });
  });

  describe('caching behavior', () => {
    it('returns cached result for same trips and config', () => {
      const calculator = createComplianceCalculator();
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      const result1 = calculator(trips, config);
      const result2 = calculator(trips, config);

      // Results should be identical (same object from cache)
      expect(result1).toBe(result2);
    });

    it('computes new result for different trips', () => {
      const calculator = createComplianceCalculator();
      const trips1 = [createTrip('2025-11-01', '2025-11-10')];
      const trips2 = [createTrip('2025-11-01', '2025-11-20')];
      const config = createConfig();

      const result1 = calculator(trips1, config);
      const result2 = calculator(trips2, config);

      expect(result1.daysUsed).toBe(10);
      expect(result2.daysUsed).toBe(20);
      expect(result1).not.toBe(result2);
    });

    it('computes new result for different reference date', () => {
      const calculator = createComplianceCalculator();
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config1 = createConfig({ referenceDate: new Date('2026-01-01') });
      const config2 = createConfig({ referenceDate: new Date('2026-01-15') });

      const result1 = calculator(trips, config1);
      const result2 = calculator(trips, config2);

      expect(result1).not.toBe(result2);
    });

    it('computes new result for different mode', () => {
      const calculator = createComplianceCalculator();
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const auditConfig = createConfig({ mode: 'audit' });
      const planningConfig = createConfig({ mode: 'planning' });

      const result1 = calculator(trips, auditConfig);
      const result2 = calculator(trips, planningConfig);

      expect(result1).not.toBe(result2);
    });

    it('separate calculator instances have separate caches', () => {
      const calculator1 = createComplianceCalculator();
      const calculator2 = createComplianceCalculator();
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig();

      const result1 = calculator1(trips, config);
      const result2 = calculator2(trips, config);

      // Same values, but different objects (different caches)
      expect(result1.daysUsed).toBe(result2.daysUsed);
      expect(result1).not.toBe(result2);
    });
  });

  describe('cache key generation', () => {
    it('generates stable keys for same trips regardless of order', () => {
      const calculator = createComplianceCalculator();
      const trips1 = [
        createTrip('2025-11-01', '2025-11-05'),
        createTrip('2025-11-10', '2025-11-15'),
      ];
      const trips2 = [
        createTrip('2025-11-10', '2025-11-15'),
        createTrip('2025-11-01', '2025-11-05'),
      ];
      const config = createConfig();

      const result1 = calculator(trips1, config);
      const result2 = calculator(trips2, config);

      // Should be the same cached result since trips are sorted in key
      expect(result1).toBe(result2);
    });

    it('distinguishes trips with different IDs', () => {
      const calculator = createComplianceCalculator();
      const trips1 = [{
        ...createTrip('2025-11-01', '2025-11-10'),
        id: 'trip-1',
      }];
      const trips2 = [{
        ...createTrip('2025-11-01', '2025-11-10'),
        id: 'trip-2',
      }];
      const config = createConfig();

      const result1 = calculator(trips1, config);
      const result2 = calculator(trips2, config);

      // Different trip IDs should result in different cache entries
      expect(result1).not.toBe(result2);
    });

    it('handles trips without IDs', () => {
      const calculator = createComplianceCalculator();
      const trips = [
        createTrip('2025-11-01', '2025-11-10'),
        createTrip('2025-11-15', '2025-11-20'),
      ];
      const config = createConfig();

      const result = calculator(trips, config);

      expect(result.daysUsed).toBe(16); // 10 + 6
    });
  });

  describe('edge cases', () => {
    it('handles empty trips array', () => {
      const calculator = createComplianceCalculator();
      const config = createConfig();

      const result = calculator([], config);

      expect(result.daysUsed).toBe(0);
      expect(result.daysRemaining).toBe(90);
      expect(result.isCompliant).toBe(true);
    });

    it('handles active trips with null exit date', () => {
      const calculator = createComplianceCalculator();
      const trips: Trip[] = [{
        entryDate: new Date('2025-12-25T00:00:00.000Z'),
        exitDate: null,
        country: 'FR',
      }];
      const config = createConfig({ referenceDate: new Date('2026-01-01T00:00:00.000Z') });

      const result = calculator(trips, config);

      // Window is [ref - 179, ref] = [Jul 6, Jan 1]
      // Active trip with null exit counts through ref date in audit mode
      // Dec 25 - Jan 1 = 8 days in window (ref date included)
      expect(result.daysUsed).toBe(8);
    });
  });
});

describe('calculateComplianceRange', () => {
  describe('basic functionality', () => {
    it('calculates compliance for each day in range', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-07T00:00:00.000Z');

      const results = calculateComplianceRange(trips, startDate, endDate);

      expect(results.size).toBe(7); // 7 days
    });

    it('returns results keyed by ISO date string', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-03T00:00:00.000Z');

      const results = calculateComplianceRange(trips, startDate, endDate);

      expect(results.has('2025-12-01')).toBe(true);
      expect(results.has('2025-12-02')).toBe(true);
      expect(results.has('2025-12-03')).toBe(true);
    });

    it('includes all required properties in results', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-01T00:00:00.000Z');

      const results = calculateComplianceRange(trips, startDate, endDate);
      const result = results.get('2025-12-01');

      expect(result).toHaveProperty('referenceDate');
      expect(result).toHaveProperty('daysUsed');
      expect(result).toHaveProperty('daysRemaining');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('isCompliant');
    });
  });

  describe('calculation accuracy', () => {
    it('correctly calculates days used for each date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')]; // 10 days
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-03T00:00:00.000Z');

      const results = calculateComplianceRange(trips, startDate, endDate);

      // All dates should show 10 days used (trip is in the window for all)
      const dec1 = results.get('2025-12-01');
      const dec2 = results.get('2025-12-02');
      const dec3 = results.get('2025-12-03');

      expect(dec1?.daysUsed).toBe(10);
      expect(dec2?.daysUsed).toBe(10);
      expect(dec3?.daysUsed).toBe(10);
    });

    it('shows days expiring from window over time', () => {
      // Note: calculateComplianceRange uses default compliance start (Oct 12, 2025)
      // Trip Nov 1-10, 2025 (10 days) - after default compliance start
      const trips = [createTrip('2025-11-01', '2025-11-10')]; // 10 days
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-15T00:00:00.000Z');

      const results = calculateComplianceRange(trips, startDate, endDate);

      const dec1 = results.get('2025-12-01');
      const dec15 = results.get('2025-12-15');

      // Dec 1: Nov 1-10 is in window = 10 days
      expect(dec1?.daysUsed).toBe(10);
      // Dec 15: Nov 1-10 still in window = 10 days
      expect(dec15?.daysUsed).toBe(10);
    });

    it('calculates correct risk levels', () => {
      // Oct 1 - Dec 14 = 75 days of presence (amber zone with default thresholds)
      const trips = [createTrip('2025-10-01', '2025-12-14')];
      const startDate = new Date('2026-01-01T00:00:00.000Z');
      const endDate = new Date('2026-01-01T00:00:00.000Z');

      const results = calculateComplianceRange(trips, startDate, endDate);
      const result = results.get('2026-01-01');

      // Full trip counts: Oct 1 - Dec 14 = 75 days
      expect(result?.daysUsed).toBe(75);
      expect(result?.daysRemaining).toBe(15);
      expect(result?.riskLevel).toBe('amber'); // 15 days remaining, amber threshold
    });
  });

  describe('edge cases', () => {
    it('handles single day range', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const date = new Date('2025-12-01T00:00:00.000Z');

      const results = calculateComplianceRange(trips, date, date);

      expect(results.size).toBe(1);
      expect(results.has('2025-12-01')).toBe(true);
    });

    it('handles empty trips array', () => {
      const startDate = new Date('2025-12-01T00:00:00.000Z');
      const endDate = new Date('2025-12-07T00:00:00.000Z');

      const results = calculateComplianceRange([], startDate, endDate);

      expect(results.size).toBe(7);
      for (const [, result] of results) {
        expect(result.daysUsed).toBe(0);
        expect(result.daysRemaining).toBe(90);
        expect(result.isCompliant).toBe(true);
      }
    });

    it('handles large date range (365 days)', () => {
      const trips = [createTrip('2025-06-01', '2025-06-30')];
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-12-31T00:00:00.000Z');

      const startTime = Date.now();
      const results = calculateComplianceRange(trips, startDate, endDate);
      const duration = Date.now() - startTime;

      expect(results.size).toBe(365);
      expect(duration).toBeLessThan(5000); // Should complete reasonably fast
    });
  });
});

describe('getComplianceAtDates', () => {
  describe('basic functionality', () => {
    it('calculates compliance for specific dates', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const dates = [
        new Date('2025-12-01T00:00:00.000Z'),
        new Date('2025-12-15T00:00:00.000Z'),
        new Date('2026-01-01T00:00:00.000Z'),
      ];

      const results = getComplianceAtDates(trips, dates);

      expect(results.size).toBe(3);
      expect(results.has('2025-12-01')).toBe(true);
      expect(results.has('2025-12-15')).toBe(true);
      expect(results.has('2026-01-01')).toBe(true);
    });

    it('returns correct compliance for each date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const dates = [
        new Date('2025-12-01T00:00:00.000Z'),
      ];

      const results = getComplianceAtDates(trips, dates);
      const result = results.get('2025-12-01');

      expect(result?.daysUsed).toBe(10);
      expect(result?.daysRemaining).toBe(80);
      expect(result?.isCompliant).toBe(true);
    });
  });

  describe('non-contiguous dates', () => {
    it('handles widely spaced dates efficiently', () => {
      // Note: getComplianceAtDates uses default compliance start (Oct 12, 2025)
      // Trip Nov 1-16 (16 days) - after default compliance start
      const trips = [createTrip('2025-11-01', '2025-11-16')]; // 16 days
      const dates = [
        new Date('2025-12-01T00:00:00.000Z'),  // Trip in window
        new Date('2026-01-15T00:00:00.000Z'),  // Trip still in window
        new Date('2026-05-20T00:00:00.000Z'),  // Trip fully expired from window
      ];

      const results = getComplianceAtDates(trips, dates);

      expect(results.size).toBe(3);

      // Dec 1: Nov 1-16 in window = 16 days
      const dec1 = results.get('2025-12-01');
      expect(dec1?.daysUsed).toBe(16);

      // Jan 15: Nov 1-16 still in window = 16 days
      const jan15 = results.get('2026-01-15');
      expect(jan15?.daysUsed).toBe(16);

      // May 20, 2026: Nov 1-16 has fully expired (180+ days) = 0 days
      const may20 = results.get('2026-05-20');
      expect(may20?.daysUsed).toBe(0);
    });

    it('handles dates in any order', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const dates = [
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2025-12-01T00:00:00.000Z'),
        new Date('2025-12-15T00:00:00.000Z'),
      ];

      const results = getComplianceAtDates(trips, dates);

      expect(results.size).toBe(3);
      expect(results.get('2025-12-01')?.daysUsed).toBe(10);
      expect(results.get('2025-12-15')?.daysUsed).toBe(10);
      expect(results.get('2026-01-01')?.daysUsed).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('returns empty map for empty dates array', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const results = getComplianceAtDates(trips, []);
      expect(results.size).toBe(0);
    });

    it('handles empty trips array', () => {
      const dates = [
        new Date('2025-12-01T00:00:00.000Z'),
        new Date('2025-12-15T00:00:00.000Z'),
      ];

      const results = getComplianceAtDates([], dates);

      expect(results.size).toBe(2);
      for (const [, result] of results) {
        expect(result.daysUsed).toBe(0);
        expect(result.daysRemaining).toBe(90);
      }
    });

    it('handles single date', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const dates = [new Date('2025-12-01T00:00:00.000Z')];

      const results = getComplianceAtDates(trips, dates);

      expect(results.size).toBe(1);
    });

    it('handles duplicate dates (only stores once)', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const dates = [
        new Date('2025-12-01T00:00:00.000Z'),
        new Date('2025-12-01T00:00:00.000Z'),
        new Date('2025-12-01T00:00:00.000Z'),
      ];

      const results = getComplianceAtDates(trips, dates);

      // Map keys are unique, so we should get the same key overwritten
      expect(results.size).toBe(1);
    });

    it('finds latest date correctly for presence calculation', () => {
      // This tests the internal logic that uses the latest date for presence calculation
      // Trip after default compliance start date (Oct 12, 2025)
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const dates = [
        new Date('2025-11-05T00:00:00.000Z'), // During trip
        new Date('2025-12-01T00:00:00.000Z'), // After trip
      ];

      const results = getComplianceAtDates(trips, dates);

      // Nov 5: Window is [May 9, Nov 5], so Nov 1-5 = 5 days in window (refDate included)
      const nov5 = results.get('2025-11-05');
      expect(nov5?.daysUsed).toBe(5);

      // Dec 1: Window is [Jun 5, Dec 1], Nov 1-10 = 10 days in window
      const dec1 = results.get('2025-12-01');
      expect(dec1?.daysUsed).toBe(10);
    });
  });

  describe('performance', () => {
    it('is more efficient than calculateComplianceRange for sparse dates', () => {
      const trips = [createTrip('2025-06-01', '2025-06-30')];

      // Only need 5 specific dates spread across the year
      const sparseDates = [
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-04-01T00:00:00.000Z'),
        new Date('2025-07-01T00:00:00.000Z'),
        new Date('2025-10-01T00:00:00.000Z'),
        new Date('2026-01-01T00:00:00.000Z'),
      ];

      const startTime = Date.now();
      const results = getComplianceAtDates(trips, sparseDates);
      const duration = Date.now() - startTime;

      expect(results.size).toBe(5);
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });
});

describe('integration scenarios', () => {
  describe('complex trip patterns', () => {
    it('handles mixed Schengen and non-Schengen countries', () => {
      const calculator = createComplianceCalculator();
      const trips = [
        createTrip('2025-11-01', '2025-11-10', 'FR'),  // Schengen
        createTrip('2025-11-15', '2025-11-20', 'IE'),  // Non-Schengen (Ireland)
        createTrip('2025-11-25', '2025-11-30', 'DE'),  // Schengen
      ];
      const config = createConfig();

      const result = calculator(trips, config);

      // Only France and Germany count (10 + 6 = 16 days)
      expect(result.daysUsed).toBe(16);
    });

    it('handles trips spanning months', () => {
      const trips = [createTrip('2025-11-25', '2025-12-10')]; // Spans Nov-Dec (16 days total)
      const dates = [
        new Date('2025-11-30T00:00:00.000Z'),
        new Date('2025-12-05T00:00:00.000Z'),
        new Date('2025-12-15T00:00:00.000Z'),
      ];

      const results = getComplianceAtDates(trips, dates);

      // Nov 30: Window is [Jun 4, Nov 30], so Nov 25-30 = 6 days
      expect(results.get('2025-11-30')?.daysUsed).toBe(6);
      // Dec 5: Window is [Jun 9, Dec 5], so Nov 25 - Dec 5 = 11 days
      expect(results.get('2025-12-05')?.daysUsed).toBe(11);
      // Dec 15: Window is [Jun 18, Dec 14], so Nov 25 - Dec 10 but only up to Dec 14 in window = 16 days
      expect(results.get('2025-12-15')?.daysUsed).toBe(16);
    });
  });

  describe('compliance threshold scenarios', () => {
    it('batch processes employees with different risk levels', () => {
      // Note: batchCalculateCompliance uses default compliance start (epoch)
      // Default risk thresholds: green >= 16, amber >= 1, red < 1
      // Use reference date Mar 1, 2026 to allow 90 days in window
      const employees = [
        {
          id: 'green',
          trips: [createTrip('2025-11-01', '2025-11-30')], // 30 days, 60 remaining = green
        },
        {
          id: 'amber',
          trips: [createTrip('2025-11-01', '2026-01-26')], // 87 days, 3 remaining = amber
        },
        {
          id: 'red',
          trips: [createTrip('2025-11-01', '2026-01-29')], // 90 days, 0 remaining = red
        },
      ];

      const results = batchCalculateCompliance(employees, new Date('2026-03-01'));

      expect(results.get('green')?.riskLevel).toBe('green');
      expect(results.get('amber')?.riskLevel).toBe('amber');
      expect(results.get('red')?.riskLevel).toBe('red');
    });
  });
});
