/**
 * @fileoverview Comprehensive test suite for 90/180-day compliance requirements.
 *
 * Tests all business requirements captured during the requirements interview:
 * - Both entry and exit dates count as full days
 * - 180-day lookback window
 * - 90 days = VIOLATION (max is 89)
 * - Warning at 75+ days used (15 or fewer remaining)
 * - Active trips (null end date) count through today
 * - Only count days within the 180-day window
 * - Complex real-world scenarios
 *
 * @version 2026-01-26
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCompliance,
  presenceDays,
  daysUsedInWindow,
  getRiskLevel,
  isCompliant,
  earliestSafeEntry,
  isSchengenCountry,
} from '../index';
import type { Trip, ComplianceConfig } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

function createTrip(
  entry: string,
  exit: string | null,
  country: string = 'FR'
): Trip {
  return {
    entryDate: new Date(entry + 'T00:00:00.000Z'),
    exitDate: exit ? new Date(exit + 'T00:00:00.000Z') : null,
    country,
  };
}

function createConfig(overrides: Partial<ComplianceConfig> = {}): ComplianceConfig {
  return {
    mode: 'audit',
    referenceDate: new Date('2026-01-15T00:00:00.000Z'),
    complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
    ...overrides,
  };
}

function generateConsecutiveDays(start: string, count: number): string[] {
  const dates: string[] = [];
  const startDate = new Date(start + 'T00:00:00.000Z');
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// ============================================================================
// REQUIREMENT 1: Both Entry and Exit Dates Count as Full Days
// ============================================================================

describe('Requirement 1: Entry and Exit Dates Both Count', () => {
  it('same-day trip (enter and exit same day) = 1 day', () => {
    const trips = [createTrip('2025-11-15', '2025-11-15')];
    const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

    const result = calculateCompliance(trips, config);

    expect(result.daysUsed).toBe(1);
  });

  it('two-day trip (overnight stay) = 2 days', () => {
    // Enter Nov 15, exit Nov 16 = Nov 15 + Nov 16 = 2 days
    const trips = [createTrip('2025-11-15', '2025-11-16')];
    const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

    const result = calculateCompliance(trips, config);

    expect(result.daysUsed).toBe(2);
  });

  it('week-long trip (7 calendar days) = 7 days', () => {
    // Nov 1-7 inclusive = 7 days
    const trips = [createTrip('2025-11-01', '2025-11-07')];
    const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

    const result = calculateCompliance(trips, config);

    expect(result.daysUsed).toBe(7);
  });

  it('flying out at 23:59 still counts as full day', () => {
    // If you enter on Nov 15 at 23:59, Nov 15 counts as a full day
    const trips = [createTrip('2025-11-15', '2025-11-15')];
    const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

    const result = calculateCompliance(trips, config);

    expect(result.daysUsed).toBe(1);
  });
});

// ============================================================================
// REQUIREMENT 2: 180-Day Rolling Window
// ============================================================================

describe('Requirement 2: 180-Day Rolling Window', () => {
  it('trip at window start (179 days before ref) is INCLUDED', () => {
    // Reference: Jul 2, 2026
    // Window: [Jan 4, Jul 2] (refDate - 179 to refDate, 180 days inclusive)
    const trips = [createTrip('2026-01-04', '2026-01-04')];
    const config = createConfig({
      referenceDate: new Date('2026-07-02T00:00:00.000Z'),
      complianceStartDate: new Date('2025-01-01T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    expect(result.daysUsed).toBe(1);
  });

  it('trip 180 days before ref is EXCLUDED', () => {
    // Reference: Jul 2, 2026
    // Window: [Jan 4, Jul 2]. Jan 3 is 180 days before = outside window.
    const trips = [createTrip('2026-01-03', '2026-01-03')];
    const config = createConfig({
      referenceDate: new Date('2026-07-02T00:00:00.000Z'),
      complianceStartDate: new Date('2025-01-01T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    expect(result.daysUsed).toBe(0);
  });

  it('days expire as they fall out of the 180-day window', () => {
    // Trip from Oct 12-21 (10 days)
    // Window is [refDate - 179, refDate] (includes refDate)
    const trips = [createTrip('2025-10-12', '2025-10-21')];

    // On Apr 9 - window is [Oct 12, Apr 9], all 10 days in window
    const configApril9 = createConfig({
      referenceDate: new Date('2026-04-09T00:00:00.000Z'),
    });
    expect(calculateCompliance(trips, configApril9).daysUsed).toBe(10);

    // On Apr 12 - window is [Oct 15, Apr 12], Oct 12-14 fall out, 7 days remain
    const configApril12 = createConfig({
      referenceDate: new Date('2026-04-12T00:00:00.000Z'),
    });
    expect(calculateCompliance(trips, configApril12).daysUsed).toBe(7);

    // On Apr 21 - window is [Oct 24, Apr 21], all 10 days have fallen out
    const configApril21 = createConfig({
      referenceDate: new Date('2026-04-21T00:00:00.000Z'),
    });
    expect(calculateCompliance(trips, configApril21).daysUsed).toBe(0);
  });

  it('trip spanning window boundary only counts days in window', () => {
    // Trip: Jan 1-20 (20 days)
    // When reference date is far enough in future, only partial trip days
    // fall within the 180-day window
    const trips = [createTrip('2026-01-01', '2026-01-20')];
    const config = createConfig({
      referenceDate: new Date('2026-07-12T00:00:00.000Z'),
      complianceStartDate: new Date('2025-01-01T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    // Window: [Jan 14, Jul 12]. Only Jan 14-20 = 7 days in window
    expect(result.daysUsed).toBe(7);
    expect(result.daysUsed).toBeLessThan(20); // Confirms partial counting
  });
});

// ============================================================================
// REQUIREMENT 3: 90 Days = VIOLATION
// ============================================================================

describe('Requirement 3: 90 Days = Violation (Max is 89)', () => {
  it('89 days used = COMPLIANT', () => {
    const dates = generateConsecutiveDays('2025-10-12', 89);
    const presence = new Set(dates);
    const refDate = new Date('2026-01-10T00:00:00.000Z');

    expect(isCompliant(presence, refDate, {
      complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
    })).toBe(true);
  });

  it('90 days used = VIOLATION', () => {
    const dates = generateConsecutiveDays('2025-10-12', 90);
    const presence = new Set(dates);
    const refDate = new Date('2026-01-11T00:00:00.000Z');

    expect(isCompliant(presence, refDate, {
      complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
    })).toBe(false);
  });

  it('91 days used = VIOLATION', () => {
    const dates = generateConsecutiveDays('2025-10-12', 91);
    const presence = new Set(dates);
    const refDate = new Date('2026-01-12T00:00:00.000Z');

    expect(isCompliant(presence, refDate, {
      complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
    })).toBe(false);
  });

  it('calculateCompliance returns isCompliant=false at 90 days', () => {
    // Create a 90-day trip
    const trips = [createTrip('2025-10-12', '2026-01-09')]; // 90 days
    const config = createConfig({
      referenceDate: new Date('2026-01-10T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    expect(result.daysUsed).toBe(90);
    expect(result.daysRemaining).toBe(0);
    expect(result.isCompliant).toBe(false);
    expect(result.riskLevel).toBe('red');
  });
});

// ============================================================================
// REQUIREMENT 4: Warning at 75+ Days Used (15 or Fewer Remaining)
// ============================================================================

describe('Requirement 4: Warning Thresholds (75+ days used)', () => {
  it('74 days used (16 remaining) = GREEN', () => {
    expect(getRiskLevel(16)).toBe('green');
  });

  it('75 days used (15 remaining) = AMBER/WARNING', () => {
    expect(getRiskLevel(15)).toBe('amber');
  });

  it('85 days used (5 remaining) = AMBER/WARNING', () => {
    expect(getRiskLevel(5)).toBe('amber');
  });

  it('89 days used (1 remaining) = AMBER/WARNING', () => {
    expect(getRiskLevel(1)).toBe('amber');
  });

  it('90 days used (0 remaining) = RED/VIOLATION', () => {
    expect(getRiskLevel(0)).toBe('red');
  });

  it('threshold boundaries are correct', () => {
    // Green boundary
    expect(getRiskLevel(16)).toBe('green');
    expect(getRiskLevel(15)).toBe('amber');

    // Amber/Red boundary
    expect(getRiskLevel(1)).toBe('amber');
    expect(getRiskLevel(0)).toBe('red');
  });

  it('full compliance calculation shows correct risk levels', () => {
    // 74 days used = green
    const trips74 = [createTrip('2025-10-12', '2025-12-24')]; // 74 days
    const config = createConfig({ referenceDate: new Date('2025-12-25T00:00:00.000Z') });

    const result74 = calculateCompliance(trips74, config);
    expect(result74.daysUsed).toBe(74);
    expect(result74.riskLevel).toBe('green');

    // 75 days used = amber
    const trips75 = [createTrip('2025-10-12', '2025-12-25')]; // 75 days
    const config75 = createConfig({ referenceDate: new Date('2025-12-26T00:00:00.000Z') });

    const result75 = calculateCompliance(trips75, config75);
    expect(result75.daysUsed).toBe(75);
    expect(result75.riskLevel).toBe('amber');
  });
});

// ============================================================================
// REQUIREMENT 5: Active Trips (Null End Date) Count Through Today
// ============================================================================

describe('Requirement 5: Active Trips (Currently Traveling)', () => {
  // Note: The 180-day window is [refDate - 179, refDate], including the reference date.
  // Per EU regulation, the 180-day period includes the day of intended stay.
  // Active trips count through the reference date.

  it('active trip with null exit date counts through reference date', () => {
    // Trip started Nov 1, reference date is Nov 10
    // Window for Nov 10 is [May 15, Nov 10]
    // Days counted: Nov 1-10 = 10 days (Nov 10 included)
    const trips = [createTrip('2025-11-01', null)];
    const config = createConfig({
      referenceDate: new Date('2025-11-10T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    // Nov 1-10 = 10 days in the window (Nov 10 included)
    expect(result.daysUsed).toBe(10);
  });

  it('active trip in planning mode extends to future reference date', () => {
    // Trip started Nov 1, projecting to Nov 20
    // Window for Nov 20 is [May 25, Nov 20]
    // Days counted: Nov 1-20 = 20 days
    const trips = [createTrip('2025-11-01', null)];
    const config = createConfig({
      mode: 'planning',
      referenceDate: new Date('2025-11-20T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    // Nov 1-20 = 20 days in the window
    expect(result.daysUsed).toBe(20);
  });

  it('multiple trips with one active', () => {
    const trips = [
      createTrip('2025-10-15', '2025-10-20'), // 6 days completed
      createTrip('2025-11-01', null),          // Active, started Nov 1
    ];
    const config = createConfig({
      referenceDate: new Date('2025-11-05T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    // Oct 15-20 (6 days) + Nov 1-5 (5 days, Nov 5 included) = 11 days
    expect(result.daysUsed).toBe(11);
  });

  it('active trip overlapping with past trip deduplicates correctly', () => {
    // Past trip: Oct 25 - Nov 5 (12 days)
    // Active trip: Nov 1 - (reference is Nov 10, so Nov 1-10 counted)
    // Total unique days: Oct 25 - Nov 10 = 17 days (deduplicated)
    const trips = [
      createTrip('2025-10-25', '2025-11-05'),
      createTrip('2025-11-01', null),
    ];
    const config = createConfig({
      referenceDate: new Date('2025-11-10T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    // Oct 25 - Nov 10 = 17 unique days
    expect(result.daysUsed).toBe(17);
  });
});

// ============================================================================
// REQUIREMENT 6: Complex Real-World Scenarios
// ============================================================================

describe('Requirement 6: Complex Real-World Scenarios', () => {
  describe('Frequent Travelers (10+ trips per year)', () => {
    it('handles multiple short business trips correctly', () => {
      const trips = [
        createTrip('2025-10-15', '2025-10-17'), // 3 days
        createTrip('2025-10-25', '2025-10-27'), // 3 days
        createTrip('2025-11-05', '2025-11-07'), // 3 days
        createTrip('2025-11-15', '2025-11-17'), // 3 days
        createTrip('2025-11-25', '2025-11-27'), // 3 days
        createTrip('2025-12-05', '2025-12-07'), // 3 days
        createTrip('2025-12-15', '2025-12-17'), // 3 days
        createTrip('2025-12-25', '2025-12-27'), // 3 days
        createTrip('2026-01-05', '2026-01-07'), // 3 days
        createTrip('2026-01-10', '2026-01-12'), // 3 days
      ];
      const config = createConfig({
        referenceDate: new Date('2026-01-15T00:00:00.000Z'),
      });

      const result = calculateCompliance(trips, config);

      // 10 trips x 3 days = 30 days total
      expect(result.daysUsed).toBe(30);
      expect(result.isCompliant).toBe(true);
      expect(result.riskLevel).toBe('green');
    });
  });

  describe('Long Stays (60-80 day assignments)', () => {
    it('70-day assignment shows correct warning', () => {
      const trips = [createTrip('2025-10-12', '2025-12-20')]; // 70 days
      const config = createConfig({
        referenceDate: new Date('2025-12-21T00:00:00.000Z'),
      });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(70);
      expect(result.daysRemaining).toBe(20);
      expect(result.isCompliant).toBe(true);
      expect(result.riskLevel).toBe('green'); // 20 > 15 remaining
    });

    it('80-day assignment shows amber warning', () => {
      const trips = [createTrip('2025-10-12', '2025-12-30')]; // 80 days
      const config = createConfig({
        referenceDate: new Date('2025-12-31T00:00:00.000Z'),
      });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(80);
      expect(result.daysRemaining).toBe(10);
      expect(result.isCompliant).toBe(true);
      expect(result.riskLevel).toBe('amber'); // 10 <= 15 remaining
    });
  });

  describe('Edge at Limits (Employees pushing close to 90 days)', () => {
    it('at 88 days can safely add 1 more day', () => {
      const trips = [createTrip('2025-10-12', '2026-01-07')]; // 88 days
      const config = createConfig({
        referenceDate: new Date('2026-01-08T00:00:00.000Z'),
      });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(88);
      expect(result.daysRemaining).toBe(2);
      expect(result.isCompliant).toBe(true);
    });

    it('at 89 days cannot add any more days', () => {
      const trips = [createTrip('2025-10-12', '2026-01-08')]; // 89 days
      const config = createConfig({
        referenceDate: new Date('2026-01-09T00:00:00.000Z'),
      });

      const result = calculateCompliance(trips, config);

      expect(result.daysUsed).toBe(89);
      expect(result.daysRemaining).toBe(1);
      expect(result.isCompliant).toBe(true);
      expect(result.riskLevel).toBe('amber');
    });

    it('safe entry calculation for over-limit employee', () => {
      // 95 days used
      const dates = generateConsecutiveDays('2025-10-12', 95);
      const presence = new Set(dates);
      const today = new Date('2026-01-16T00:00:00.000Z');

      const earliestSafe = earliestSafeEntry(presence, today, {
        complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      });

      expect(earliestSafe).not.toBeNull();
      // Should wait for days to expire
    });
  });

  describe('Mixed Patterns (High variance in travel frequency)', () => {
    it('handles alternating heavy and light months', () => {
      const trips = [
        // Heavy October: 20 days
        createTrip('2025-10-12', '2025-10-31'),
        // Light November: 5 days
        createTrip('2025-11-10', '2025-11-14'),
        // Heavy December: 20 days
        createTrip('2025-12-01', '2025-12-20'),
        // Light January: 5 days
        createTrip('2026-01-05', '2026-01-09'),
      ];
      const config = createConfig({
        referenceDate: new Date('2026-01-15T00:00:00.000Z'),
      });

      const result = calculateCompliance(trips, config);

      // 20 + 5 + 20 + 5 = 50 days
      expect(result.daysUsed).toBe(50);
      expect(result.isCompliant).toBe(true);
    });
  });

  describe('The "No Reset" Misconception', () => {
    it('leaving Schengen does NOT reset the counter', () => {
      // User thinks: "I was out for 30 days, my counter resets"
      // Reality: Days only expire when they fall out of 180-day window
      const trips = [
        createTrip('2025-10-12', '2025-11-10'), // 30 days in Schengen
        // Gap of 30 days outside Schengen
        createTrip('2025-12-10', '2025-12-20'), // Back in Schengen
      ];
      const config = createConfig({
        referenceDate: new Date('2025-12-21T00:00:00.000Z'),
      });

      const result = calculateCompliance(trips, config);

      // Both trips count - leaving doesn't reset anything
      expect(result.daysUsed).toBe(41); // 30 + 11
    });
  });
});

// ============================================================================
// REQUIREMENT 7: Country Handling
// ============================================================================

describe('Requirement 7: Country Handling', () => {
  it('Ireland (IE) does NOT count toward Schengen', () => {
    expect(isSchengenCountry('IE')).toBe(false);
    expect(isSchengenCountry('Ireland')).toBe(false);

    const trips = [
      createTrip('2025-11-01', '2025-11-10', 'FR'), // 10 days - counts
      createTrip('2025-11-15', '2025-11-25', 'IE'), // 11 days - doesn't count
    ];
    const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

    const result = calculateCompliance(trips, config);

    expect(result.daysUsed).toBe(10); // Only France counts
  });

  it('Cyprus (CY) does NOT count toward Schengen', () => {
    expect(isSchengenCountry('CY')).toBe(false);
    expect(isSchengenCountry('Cyprus')).toBe(false);
  });

  it('UK (GB) does NOT count toward Schengen', () => {
    expect(isSchengenCountry('GB')).toBe(false);
    expect(isSchengenCountry('United Kingdom')).toBe(false);
  });

  it('Monaco, Vatican, San Marino, Andorra DO count (microstates)', () => {
    expect(isSchengenCountry('MC')).toBe(true);
    expect(isSchengenCountry('VA')).toBe(true);
    expect(isSchengenCountry('SM')).toBe(true);
    expect(isSchengenCountry('AD')).toBe(true);

    const trips = [
      createTrip('2025-11-01', '2025-11-03', 'MC'), // Monaco
      createTrip('2025-11-05', '2025-11-07', 'VA'), // Vatican
      createTrip('2025-11-10', '2025-11-12', 'SM'), // San Marino
      createTrip('2025-11-15', '2025-11-17', 'AD'), // Andorra
    ];
    const config = createConfig({ referenceDate: new Date('2025-12-01T00:00:00.000Z') });

    const result = calculateCompliance(trips, config);

    expect(result.daysUsed).toBe(12); // All 4 microstates count
  });

  it('Bulgaria and Romania count (joined Jan 2025)', () => {
    expect(isSchengenCountry('BG')).toBe(true);
    expect(isSchengenCountry('RO')).toBe(true);
  });
});

// ============================================================================
// REQUIREMENT 8: Forecasting When Days Expire
// ============================================================================

describe('Requirement 8: Day Expiry Forecasting', () => {
  it('can calculate when specific days will expire', () => {
    // Trip from Oct 12-21 (10 days)
    // Window is [refDate - 179, refDate] (includes refDate)
    // A day "expires" when refDate - 179 > day
    const trips = [createTrip('2025-10-12', '2025-10-21')];

    // On Apr 9 - window is [Oct 12, Apr 9], all 10 days in window
    const configBefore = createConfig({
      referenceDate: new Date('2026-04-09T00:00:00.000Z'),
    });
    expect(calculateCompliance(trips, configBefore).daysUsed).toBe(10);

    // On Apr 15 - window is [Oct 18, Apr 15], Oct 12-17 have expired (6 days), 4 remain
    const configMid = createConfig({
      referenceDate: new Date('2026-04-15T00:00:00.000Z'),
    });
    expect(calculateCompliance(trips, configMid).daysUsed).toBe(4);

    // On Apr 21 - window is [Oct 24, Apr 21], all 10 days have expired
    const configAfter = createConfig({
      referenceDate: new Date('2026-04-21T00:00:00.000Z'),
    });
    expect(calculateCompliance(trips, configAfter).daysUsed).toBe(0);
  });
});

// ============================================================================
// REQUIREMENT 9: Leap Year Handling
// ============================================================================

describe('Requirement 9: Leap Year Handling', () => {
  it('correctly counts Feb 29 in leap year (2024)', () => {
    const trips = [createTrip('2024-02-28', '2024-03-01')];
    const config = createConfig({
      referenceDate: new Date('2024-04-01T00:00:00.000Z'),
      complianceStartDate: new Date('2024-01-01T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    // Feb 28, Feb 29, Mar 1 = 3 days
    expect(result.daysUsed).toBe(3);
  });

  it('correctly handles Feb 28-Mar 1 in non-leap year (2025)', () => {
    const trips = [createTrip('2025-02-28', '2025-03-01')];
    const config = createConfig({
      referenceDate: new Date('2025-04-01T00:00:00.000Z'),
      complianceStartDate: new Date('2025-01-01T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    // Feb 28, Mar 1 = 2 days (no Feb 29)
    expect(result.daysUsed).toBe(2);
  });
});

// ============================================================================
// REQUIREMENT 10: Compliance Start Date
// ============================================================================

describe('Requirement 10: Compliance Start Date (Oct 12, 2025)', () => {
  it('trips before Oct 12, 2025 are excluded', () => {
    const trips = [
      createTrip('2025-09-01', '2025-09-10'), // Before compliance start
      createTrip('2025-10-15', '2025-10-20'), // After compliance start
    ];
    const config = createConfig({
      referenceDate: new Date('2025-11-01T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    // Only Oct 15-20 (6 days) should count
    expect(result.daysUsed).toBe(6);
  });

  it('trip spanning compliance start date is clipped', () => {
    // Trip from Oct 1-20, compliance starts Oct 12
    const trips = [createTrip('2025-10-01', '2025-10-20')];
    const config = createConfig({
      referenceDate: new Date('2025-11-01T00:00:00.000Z'),
    });

    const result = calculateCompliance(trips, config);

    // Only Oct 12-20 should count (9 days)
    expect(result.daysUsed).toBe(9);
  });
});
