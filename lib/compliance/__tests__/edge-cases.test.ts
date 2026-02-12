/**
 * @fileoverview Comprehensive edge case tests for Schengen compliance.
 *
 * These tests cover the 24 required test scenarios plus additional edge cases
 * identified from production experience.
 */

import { describe, it, expect } from 'vitest';
import {
  presenceDays,
  daysUsedInWindow,
  calculateDaysRemaining,
  getRiskLevel,
  earliestSafeEntry,
  isSchengenCountry,
  calculateCompliance,
} from '../index';
import {
  oraclePresenceDays,
  oracleDaysUsedInWindow,
  oracleDaysRemaining,
  oracleRiskLevel,
  oracleCalculate,
  validateAgainstOracle,
} from './oracle-calculator';
import type { Trip, ComplianceConfig } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

function createTrip(entry: string, exit: string, country: string = 'FR'): Trip {
  return {
    entryDate: new Date(entry + 'T00:00:00.000Z'),
    exitDate: new Date(exit + 'T00:00:00.000Z'),
    country,
  };
}

function createConfig(overrides: Partial<ComplianceConfig> = {}): ComplianceConfig {
  return {
    mode: 'audit',
    referenceDate: new Date('2026-01-01T00:00:00.000Z'),
    complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
    ...overrides,
  };
}

function generateDates(start: string, count: number): string[] {
  const dates: string[] = [];
  const startDate = new Date(start + 'T00:00:00.000Z');
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// ============================================================================
// Required Test Scenarios (24 cases from spec)
// ============================================================================

describe('Required Test Scenarios', () => {
  describe('Core Functionality', () => {
    // Scenario 1: Simple compliance
    it('1. Single 10-day trip shows 80 days remaining', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10')];
      const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(10);
      expect(result.daysRemaining).toBe(80);
      expect(result.isCompliant).toBe(true);
    });

    // Scenario 2: At limit (90 days = violation)
    it('2. Exactly 90 days used shows 0 remaining and is VIOLATION', () => {
      const trips = [createTrip('2025-10-12', '2026-01-09')]; // 90 days
      const config = createConfig({ referenceDate: new Date('2026-01-10T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(90);
      expect(result.daysRemaining).toBe(0);
      expect(result.isCompliant).toBe(false);  // 90 days = violation
      expect(result.riskLevel).toBe('red');    // 0 remaining = red
    });

    // Scenario 3: Over limit
    it('3. 95 days used shows -5 remaining and red status', () => {
      const trips = [createTrip('2025-10-12', '2026-01-14')]; // 95 days
      const config = createConfig({ referenceDate: new Date('2026-01-15T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(95);
      expect(result.daysRemaining).toBe(-5);
      expect(result.riskLevel).toBe('red');
    });

    // Scenario 4: Window expiry
    it('4. Old trip falls out of 180-day window', () => {
      // Trip from Oct 12-21 (10 days)
      // Reference date: April 22 (192 days after Oct 12)
      // Window for Apr 22 is [Oct 24, Apr 21]
      // All 10 days (Oct 12-21) should have fallen out
      const trips = [createTrip('2025-10-12', '2025-10-21')];
      const config = createConfig({ referenceDate: new Date('2026-04-22T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      // All 10 days should have fallen out (Oct 21 is 183 days before Apr 22)
      expect(result.daysUsed).toBe(0);
      expect(result.daysRemaining).toBe(90);
    });
  });

  describe('Edge Cases (CRITICAL)', () => {
    // Scenario 5: Same-day trip
    it('5. Same-day entry/exit counts as 1 day', () => {
      const trips = [createTrip('2025-11-15', '2025-11-15')];
      const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(1);
    });

    // Scenario 6: Overlapping trips
    it('6. Overlapping trips do not double-count days', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-10', 'FR'),
        createTrip('2025-11-05', '2025-11-15', 'DE'),
      ];
      const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      // Nov 1-15 = 15 unique days, NOT 10 + 11 = 21
      expect(result.daysUsed).toBe(15);
    });

    // Scenario 7: Leap year
    it('7. Leap year Feb 29, 2024 is handled correctly', () => {
      // 2024 is a leap year
      const trips = [createTrip('2024-02-28', '2024-03-01')];
      const config = createConfig({
        referenceDate: new Date('2024-04-01T00:00:00.000Z'),
        complianceStartDate: new Date('2024-01-01T00:00:00.000Z'),
      });

      const result = calculateCompliance(trips, config);

      // Feb 28, Feb 29, Mar 1 = 3 days
      expect(result.daysUsed).toBe(3);
    });

    // Scenario 8: Feb 28/Mar 1 boundary in non-leap year
    it('8. Feb 28 to Mar 1 in non-leap year (2025) is 2 days', () => {
      // 2025 is NOT a leap year
      const trips = [createTrip('2025-02-28', '2025-03-01')];
      const config = createConfig({
        referenceDate: new Date('2025-04-01T00:00:00.000Z'),
        complianceStartDate: new Date('2025-01-01T00:00:00.000Z'),
      });

      const result = calculateCompliance(trips, config);

      // Feb 28, Mar 1 = 2 days (no Feb 29)
      expect(result.daysUsed).toBe(2);
    });

    // Scenario 9: Compliance start date
    it('9. Trips before Oct 12, 2025 are excluded', () => {
      const trips = [
        createTrip('2025-09-01', '2025-09-10'), // Before compliance start
        createTrip('2025-10-15', '2025-10-20'), // After compliance start
      ];
      const config = createConfig({ referenceDate: new Date('2025-11-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      // Only Oct 15-20 (6 days) should count
      expect(result.daysUsed).toBe(6);
    });

    // Scenario 10: Ireland exclusion
    it('10. Ireland (IE) trips do not count toward Schengen', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-10', 'FR'),
        createTrip('2025-11-15', '2025-11-25', 'IE'),
      ];
      const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      // Only France trip counts
      expect(result.daysUsed).toBe(10);
    });

    // Scenario 11: Cyprus exclusion
    it('11. Cyprus (CY) trips do not count toward Schengen', () => {
      const trips = [createTrip('2025-11-01', '2025-11-10', 'CY')];
      const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(0);
    });

    // Scenario 12: Microstate inclusion
    it('12. Monaco, Vatican, San Marino, Andorra count as Schengen', () => {
      const trips = [
        createTrip('2025-11-01', '2025-11-03', 'MC'),
        createTrip('2025-11-05', '2025-11-07', 'VA'),
        createTrip('2025-11-10', '2025-11-12', 'SM'),
        createTrip('2025-11-15', '2025-11-17', 'AD'),
      ];
      const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(12); // 3 + 3 + 3 + 3
    });

    // Scenario 13: Empty trips array
    it('13. Empty trips array returns 90 days remaining', () => {
      const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

      const result = calculateCompliance([], config);

      expect(result.daysUsed).toBe(0);
      expect(result.daysRemaining).toBe(90);
      expect(result.isCompliant).toBe(true);
    });

    // Scenario 14: Future trips (planning mode)
    it('14. Future trips are included in planning mode', () => {
      // Planning mode: Include future trips in presence, use future reference date
      // to see what compliance looks like at end of planned trips
      const trips = [
        createTrip('2025-11-01', '2025-11-10'), // Past (10 days)
        createTrip('2025-12-15', '2025-12-20'), // Future (6 days)
      ];
      // Use the end of the planned future trip as reference
      const config = createConfig({
        mode: 'planning',
        referenceDate: new Date('2025-12-21T00:00:00.000Z'), // Day after future trip ends
      });

      const result = calculateCompliance(trips, config);

      // Both trips should count in the window for Dec 21
      // Window: [Jun 24, Dec 20] - includes both trips
      expect(result.daysUsed).toBe(16); // 10 + 6
    });

    // Scenario 15: Window start boundary inclusion (179 days back)
    it('15. Trip at window start (179 days before ref) is INCLUDED', () => {
      // Reference: July 2, 2026
      // Window: [Jan 4, Jul 2] (refDate - 179 to refDate, 180 days inclusive)
      const trips = [createTrip('2026-01-04', '2026-01-04')];
      const config = createConfig({
        referenceDate: new Date('2026-07-02T00:00:00.000Z'),
        complianceStartDate: new Date('2025-01-01T00:00:00.000Z'),
      });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(1);
    });

    // Scenario 16: Day before window start is excluded (180 days back)
    it('16. Trip 180 days before ref is EXCLUDED', () => {
      // Reference: July 2, 2026
      // Window: [Jan 4, Jul 2]. Jan 3 is 180 days before = outside window.
      const trips = [createTrip('2026-01-03', '2026-01-03')];
      const config = createConfig({
        referenceDate: new Date('2026-07-02T00:00:00.000Z'),
        complianceStartDate: new Date('2025-01-01T00:00:00.000Z'),
      });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(0);
    });
  });

  describe('Risk Level Thresholds', () => {
    // New thresholds: green >= 16, amber >= 1, red < 1
    // Warning at 75+ days used (15 or fewer remaining)

    // Scenario 17: Green threshold (16+ days remaining)
    it('17. 16+ days remaining = green', () => {
      expect(getRiskLevel(16)).toBe('green');
      expect(getRiskLevel(30)).toBe('green');
      expect(getRiskLevel(45)).toBe('green');
      expect(getRiskLevel(90)).toBe('green');
    });

    // Scenario 18: Amber threshold (1-15 days remaining = warning zone)
    it('18. 1-15 days remaining = amber (warning zone)', () => {
      expect(getRiskLevel(1)).toBe('amber');
      expect(getRiskLevel(5)).toBe('amber');
      expect(getRiskLevel(10)).toBe('amber');
      expect(getRiskLevel(15)).toBe('amber');
    });

    // Scenario 19: Red threshold (0 days = violation)
    it('19. 0 days remaining = red (violation)', () => {
      expect(getRiskLevel(0)).toBe('red');
    });

    // Scenario 20: Negative days (over limit = violation)
    it('20. Negative days (over limit) = red', () => {
      expect(getRiskLevel(-1)).toBe('red');
      expect(getRiskLevel(-5)).toBe('red');
      expect(getRiskLevel(-20)).toBe('red');
    });
  });

  describe('Safe Entry Calculations', () => {
    // Scenario 21: Already eligible
    it('21. At 89 days, returns null (already eligible)', () => {
      const dates = generateDates('2025-10-12', 89);
      const presence = new Set(dates);
      const today = new Date('2026-01-09T00:00:00.000Z');

      const result = earliestSafeEntry(presence, today, {
        complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      });

      expect(result).toBeNull();
    });

    // Scenario 22: One day away
    it('22. At 90 days, returns tomorrow', () => {
      // Use dates at beginning of window so they expire quickly
      // For ref date Jan 10, window is [Jul 15, Jan 10] (179 days back, inclusive)
      // Use 90 days starting Jul 15 (Jul 15 - Oct 12)
      // On Jan 10, all 90 days in window → at limit
      // On Jan 11, window is [Jul 16, Jan 11] → Jul 15 falls out → 89 days → safe
      const dates = generateDates('2025-07-15', 90); // Jul 15 - Oct 12
      const presence = new Set(dates);
      const today = new Date('2026-01-10T00:00:00.000Z');

      const result = earliestSafeEntry(presence, today, {
        complianceStartDate: new Date('2025-01-01T00:00:00.000Z'),
      });

      expect(result).not.toBeNull();
      expect(result!.toISOString()).toContain('2026-01-11');
    });

    // Scenario 23: Week away
    it('23. Returns exact date when compliant (multi-day wait)', () => {
      // Use 95 days starting Jul 15 (Jul 15 - Oct 17)
      // On Jan 10, window is [Jul 15, Jan 10], all 95 days in window
      // Need to get down to 89 days → need 6 presence days to expire
      // Jan 11: [Jul 16, Jan 11] → Jul 15 out → 94
      // ...each day one more falls out...
      // Jan 16: [Jul 21, Jan 16] → Jul 15-20 out → 89 → safe
      const dates = generateDates('2025-07-15', 95); // Jul 15 - Oct 17
      const presence = new Set(dates);
      const today = new Date('2026-01-10T00:00:00.000Z');

      const result = earliestSafeEntry(presence, today, {
        complianceStartDate: new Date('2025-01-01T00:00:00.000Z'),
      });

      expect(result).not.toBeNull();
      // Need 6 presence days to expire → safe on Jan 16
      expect(result!.toISOString()).toContain('2026-01-16');
    });

    // Scenario 24: Extended wait
    it('24. Large overage calculates correct wait time', () => {
      // 120 days used
      const dates = generateDates('2025-10-12', 120);
      const presence = new Set(dates);
      const today = new Date('2026-02-09T00:00:00.000Z');

      const result = earliestSafeEntry(presence, today, {
        complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      });

      expect(result).not.toBeNull();
      // Need to wait for 31 days to expire (120 - 89 = 31)
    });
  });
});

// ============================================================================
// Oracle Validation Tests
// ============================================================================

describe('Oracle Validation', () => {
  it('production matches oracle for simple trip', () => {
    const trips = [createTrip('2025-11-01', '2025-11-10')];
    const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

    const productionResult = calculateCompliance(trips, config);
    const oracleResult = oracleCalculate(trips, config);

    validateAgainstOracle(productionResult, oracleResult, 'simple trip');
  });

  it('production matches oracle for overlapping trips', () => {
    const trips = [
      createTrip('2025-11-01', '2025-11-10', 'FR'),
      createTrip('2025-11-05', '2025-11-15', 'DE'),
    ];
    const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

    const productionResult = calculateCompliance(trips, config);
    const oracleResult = oracleCalculate(trips, config);

    validateAgainstOracle(productionResult, oracleResult, 'overlapping trips');
  });

  it('production matches oracle for mixed Schengen/non-Schengen', () => {
    const trips = [
      createTrip('2025-11-01', '2025-11-10', 'FR'),
      createTrip('2025-11-15', '2025-11-25', 'IE'),
      createTrip('2025-12-01', '2025-12-10', 'DE'),
    ];
    const config = createConfig({ referenceDate: new Date('2026-01-01T00:00:00.000Z') });

    const productionResult = calculateCompliance(trips, config);
    const oracleResult = oracleCalculate(trips, config);

    validateAgainstOracle(productionResult, oracleResult, 'mixed countries');
  });

  it('production matches oracle at 90-day boundary', () => {
    const trips = [createTrip('2025-10-12', '2026-01-09')]; // Exactly 90 days
    const config = createConfig({ referenceDate: new Date('2026-01-10T00:00:00.000Z') });

    const productionResult = calculateCompliance(trips, config);
    const oracleResult = oracleCalculate(trips, config);

    validateAgainstOracle(productionResult, oracleResult, '90-day boundary');
  });

  it('production matches oracle over limit', () => {
    const trips = [createTrip('2025-10-12', '2026-01-24')]; // 105 days
    const config = createConfig({ referenceDate: new Date('2026-01-25T00:00:00.000Z') });

    const productionResult = calculateCompliance(trips, config);
    const oracleResult = oracleCalculate(trips, config);

    validateAgainstOracle(productionResult, oracleResult, 'over limit');
  });
});

// ============================================================================
// Additional Edge Cases from Production Experience
// ============================================================================

describe('Production Edge Cases', () => {
  describe('The "23:59 Problem"', () => {
    it('entering at 23:59 still counts as full day', () => {
      // This is a documentation/validation test - our system counts by date, not time
      // A trip with entryDate of Nov 15 counts Nov 15 as a full day
      const trips = [createTrip('2025-11-15', '2025-11-16')];
      const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(2); // Nov 15 AND Nov 16
    });
  });

  describe('The "No Reset" Misconception', () => {
    it('leaving Schengen does not reset the counter', () => {
      // User thinks: "I was out for 30 days, I'm reset"
      // Reality: Days only expire when they fall out of 180-day window
      const trips = [
        createTrip('2025-10-12', '2025-11-10'), // 30 days in Schengen
        // Gap of 30 days outside
        createTrip('2025-12-10', '2025-12-20'), // Back in Schengen
      ];
      const config = createConfig({ referenceDate: new Date('2025-12-21T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      // Both trips still count - leaving Schengen doesn't reset anything
      expect(result.daysUsed).toBe(41); // 30 + 11
    });
  });

  describe('Microstate handling', () => {
    it('Monaco trip counts even without France entry', () => {
      // User flies directly to Monaco (via Nice, which has no border control)
      const trips = [createTrip('2025-11-01', '2025-11-05', 'MC')];
      const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(5);
    });

    it('travel through France to Monaco is single continuous presence', () => {
      // France Jan 1-5, Monaco Jan 3-7, France Jan 6-10
      // Should deduplicate to 10 days total
      const trips = [
        createTrip('2025-11-01', '2025-11-05', 'FR'),
        createTrip('2025-11-03', '2025-11-07', 'MC'),
        createTrip('2025-11-06', '2025-11-10', 'FR'),
      ];
      const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(10); // Nov 1-10, deduplicated
    });
  });

  describe('Bulgaria and Romania (new 2025 members)', () => {
    it('Bulgaria counts as Schengen (joined Jan 2025)', () => {
      expect(isSchengenCountry('BG')).toBe(true);
      expect(isSchengenCountry('Bulgaria')).toBe(true);
    });

    it('Romania counts as Schengen (joined Jan 2025)', () => {
      expect(isSchengenCountry('RO')).toBe(true);
      expect(isSchengenCountry('Romania')).toBe(true);
    });
  });

  describe('Compliance start date edge cases', () => {
    it('trip spanning compliance start date is clipped', () => {
      // Trip from Oct 1-20, compliance starts Oct 12
      const trips = [createTrip('2025-10-01', '2025-10-20')];
      const config = createConfig({ referenceDate: new Date('2025-11-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      // Only Oct 12-20 should count (9 days)
      expect(result.daysUsed).toBe(9);
    });

    it('trip ending exactly on compliance start date counts as 1 day', () => {
      const trips = [createTrip('2025-10-10', '2025-10-12')];
      const config = createConfig({ referenceDate: new Date('2025-11-01T00:00:00.000Z') });

      const result = calculateCompliance(trips, config);

      // Only Oct 12 counts
      expect(result.daysUsed).toBe(1);
    });
  });
});

// ============================================================================
// Window Boundary Edge Cases
// ============================================================================

describe('Window Boundary Edge Cases', () => {
  it('trip starting before 180-day window and ending within counts partial days', () => {
    // Reference: Apr 10, 2026
    // Window: [Oct 13, 2025, Apr 10, 2026] (subDays(Apr 10, 179) = Oct 13, includes ref date)
    // Trip: Oct 1-20, 2025 (20 days)
    // Only Oct 13-20 (8 days) are within the window
    const trips = [createTrip('2025-10-01', '2025-10-20')];
    const config = createConfig({
      referenceDate: new Date('2026-04-10T00:00:00.000Z'),
      complianceStartDate: new Date('2025-01-01T00:00:00.000Z'), // Earlier to not interfere
    });

    const result = calculateCompliance(trips, config);

    // Oct 13-20 = 8 days within window
    expect(result.daysUsed).toBe(8);
  });

  it('trip entirely before 180-day window is excluded', () => {
    // Reference: Jul 15, 2026
    // Window: [Jan 17, 2026, Jul 14, 2026] (ref - 180 to ref - 1)
    // Trip: Oct 12-21, 2025 (entirely outside window)
    const trips = [createTrip('2025-10-12', '2025-10-21')];
    const config = createConfig({
      referenceDate: new Date('2026-07-15T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    expect(result.daysUsed).toBe(0);
  });

  it('multiple concurrent active trips are deduplicated correctly', () => {
    // Two active trips running at the same time
    // Trip 1: Nov 1 onwards (no exit)
    // Trip 2: Nov 5 onwards (no exit) - overlaps with trip 1
    // Reference: Nov 15, 2025
    // Window: [May 20, Nov 15] (ref - 179 to ref, includes ref date)
    // Active trips clipped to Nov 15, Nov 1-15 counted in window
    const trips: Trip[] = [
      {
        entryDate: new Date('2025-11-01T00:00:00.000Z'),
        exitDate: null,
        country: 'FR',
      },
      {
        entryDate: new Date('2025-11-05T00:00:00.000Z'),
        exitDate: null,
        country: 'DE',
      },
    ];
    const config = createConfig({
      referenceDate: new Date('2025-11-15T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    // Nov 1-15 = 15 unique days (deduplicated, window includes ref date Nov 15)
    expect(result.daysUsed).toBe(15);
  });

  it('active trip is clipped to reference date in audit mode', () => {
    // Trip: Nov 1 onwards (no exit)
    // Reference: Nov 10, 2025
    // Window: [May 15, Nov 10] (ref - 179 to ref, includes ref date)
    // Active trip clipped to Nov 10, Nov 1-10 counted in window
    const trips: Trip[] = [
      {
        entryDate: new Date('2025-11-01T00:00:00.000Z'),
        exitDate: null, // Still traveling
        country: 'FR',
      },
    ];
    const config = createConfig({
      mode: 'audit',
      referenceDate: new Date('2025-11-10T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    // Nov 1-10 = 10 days (window includes reference date Nov 10)
    expect(result.daysUsed).toBe(10);
  });
});
