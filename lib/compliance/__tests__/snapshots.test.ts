/**
 * Snapshot Tests for the Schengen 90/180-Day Compliance Engine
 *
 * These tests capture the EXACT output of key calculations for a fixed set of
 * deterministic inputs. If a calculation ever changes silently — even by one
 * day — the snapshot diff will catch it immediately.
 *
 * When a change is intentional, update snapshots with:
 *   pnpm test -- --update-snapshots
 *
 * All dates are UTC midnight. Reference date: 2026-01-01.
 * 180-day window: 2025-07-06 to 2026-01-01 inclusive.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCompliance,
  presenceDays,
  getSafeEntryInfo,
  projectExpiringDays,
  computeMonthCompliance,
  batchCalculateCompliance,
  maxStayDays,
} from '../index';
import type { Trip, ComplianceConfig } from '../types';

// ─── Fixed test date constants ────────────────────────────────────────────────

const REF = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const REFERENCE_DATE = REF('2026-01-01');

const BASE_CONFIG: ComplianceConfig = {
  mode: 'audit',
  referenceDate: REFERENCE_DATE,
};

// ─── Trip factory ─────────────────────────────────────────────────────────────

function trip(entry: string, exit: string, country = 'FR'): Trip {
  return {
    entryDate: REF(entry),
    exitDate: REF(exit),
    country,
  };
}

// ─── 1. Baseline: no trips ────────────────────────────────────────────────────

describe('Snapshot: calculateCompliance', () => {

  it('1a. empty trips — zero days used, fully green', () => {
    const result = calculateCompliance([], BASE_CONFIG);
    expect(result).toMatchSnapshot();
  });

  it('1b. single 10-day trip in window (Dec 22–31)', () => {
    // 10 days in window, well clear of amber threshold
    const result = calculateCompliance(
      [trip('2025-12-22', '2025-12-31')],
      BASE_CONFIG
    );
    expect(result).toMatchSnapshot();
  });

  it('1c. 74 days used → green (just below amber threshold)', () => {
    // green threshold: daysRemaining >= 16 → daysUsed <= 74
    // Trip 2025-07-06 to 2025-09-17 = 74 days (26+31+17=74)
    const result = calculateCompliance(
      [trip('2025-07-06', '2025-09-17')],
      BASE_CONFIG
    );
    expect(result.daysUsed).toBe(74);
    expect(result).toMatchSnapshot();
  });

  it('1d. 75 days used → amber (just over threshold)', () => {
    // 15 remaining = amber (1–15 days remaining)
    // Trip 2025-07-06 to 2025-09-18 = 75 days (26+31+18=75)
    const result = calculateCompliance(
      [trip('2025-07-06', '2025-09-18')],
      BASE_CONFIG
    );
    expect(result.daysUsed).toBe(75);
    expect(result.riskLevel).toBe('amber');
    expect(result).toMatchSnapshot();
  });

  it('1e. 89 days used → amber (1 day remaining, still compliant)', () => {
    // Trip 2025-07-06 to 2025-10-02 = 89 days (26+31+30+2=89)
    // getRiskLevel uses amber threshold=1: remaining=1 >= 1 → amber (NOT red)
    const result = calculateCompliance(
      [trip('2025-07-06', '2025-10-02')],
      BASE_CONFIG
    );
    expect(result.daysUsed).toBe(89);
    expect(result.isCompliant).toBe(true);
    expect(result.riskLevel).toBe('amber'); // 1 remaining ≥ amber threshold of 1
    expect(result).toMatchSnapshot();
  });

  it('1f. 90 days used → red (violation, isCompliant=false)', () => {
    // Trip 2025-07-06 to 2025-10-03 = 90 days (26+31+30+3=90)
    // calculateCompliance uses getRiskLevel: remaining=0 < amber threshold of 1 → 'red'
    // Note: 'breach' status comes from getStatusFromDaysUsed, not calculateCompliance
    const result = calculateCompliance(
      [trip('2025-07-06', '2025-10-03')],
      BASE_CONFIG
    );
    expect(result.daysUsed).toBe(90);
    expect(result.isCompliant).toBe(false);
    expect(result.riskLevel).toBe('red'); // 0 remaining < amber threshold of 1
    expect(result).toMatchSnapshot();
  });

  it('1g. multi-trip complex scenario (several countries, gaps)', () => {
    const trips: Trip[] = [
      trip('2025-08-01', '2025-08-14', 'DE'),  // 14 days Germany
      trip('2025-09-05', '2025-09-19', 'IT'),  // 15 days Italy
      trip('2025-10-15', '2025-10-29', 'ES'),  // 15 days Spain
      trip('2025-11-20', '2025-11-29', 'NL'),  // 10 days Netherlands
      trip('2025-12-26', '2025-12-31', 'FR'),  //  6 days France
    ];
    const result = calculateCompliance(trips, BASE_CONFIG);
    expect(result).toMatchSnapshot();
  });

  it('1h. overlapping trips are deduplicated in the count', () => {
    const trips: Trip[] = [
      trip('2025-11-01', '2025-11-20'), // 20 days
      trip('2025-11-10', '2025-11-30'), // overlaps 11 days, adds 10 new
      // union = Nov 1–30 = 30 days total
    ];
    const result = calculateCompliance(trips, BASE_CONFIG);
    expect(result.daysUsed).toBe(30);
    expect(result).toMatchSnapshot();
  });

  it('1i. non-Schengen trips (GB, IE, US) are excluded from count', () => {
    const trips: Trip[] = [
      trip('2025-08-01', '2025-08-31', 'GB'),  // 31 days — excluded
      trip('2025-09-01', '2025-09-15', 'IE'),  // 15 days — excluded
      trip('2025-10-01', '2025-10-05', 'US'),  // 5 days  — excluded
      trip('2025-11-01', '2025-11-10', 'FR'),  // 10 days — counted
    ];
    const result = calculateCompliance(trips, BASE_CONFIG);
    expect(result.daysUsed).toBe(10); // only the FR trip
    expect(result).toMatchSnapshot();
  });

  it('1j. microstates (MC, AD, SM, VA) count toward the 90-day limit', () => {
    const trips: Trip[] = [
      trip('2025-12-01', '2025-12-10', 'MC'),  // Monaco — counts
      trip('2025-12-11', '2025-12-20', 'AD'),  // Andorra — counts
    ];
    const result = calculateCompliance(trips, BASE_CONFIG);
    expect(result.daysUsed).toBe(20);
    expect(result).toMatchSnapshot();
  });

  it('1k. active trip (null exit) counts through the reference date', () => {
    const activeTrip: Trip = {
      entryDate: REF('2025-12-22'),
      exitDate: null, // still traveling
      country: 'FR',
    };
    const result = calculateCompliance([activeTrip], BASE_CONFIG);
    // Dec 22–Jan 1 inclusive = 11 days
    expect(result.daysUsed).toBe(11);
    expect(result).toMatchSnapshot();
  });

  it('1l. compliance start date clips old trips correctly', () => {
    const configWithStart: ComplianceConfig = {
      ...BASE_CONFIG,
      complianceStartDate: REF('2025-10-01'),
    };
    const trips: Trip[] = [
      trip('2025-07-06', '2025-09-30'), // entirely before compliance start → excluded
      trip('2025-10-01', '2025-10-15'), // starts on compliance start → included (15 days)
      trip('2025-11-01', '2025-11-10'), // fully within → included (10 days)
    ];
    const result = calculateCompliance(trips, configWithStart);
    expect(result.daysUsed).toBe(25);
    expect(result).toMatchSnapshot();
  });
});

// ─── 2. Safe Entry Calculations ───────────────────────────────────────────────

describe('Snapshot: getSafeEntryInfo', () => {

  it('2a. no trips — can enter today, no wait needed', () => {
    const presence = presenceDays([], BASE_CONFIG);
    const info = getSafeEntryInfo(presence, REFERENCE_DATE, BASE_CONFIG);
    expect(info).toMatchSnapshot();
  });

  it('2b. 90 days used — cannot enter today, must wait for window to clear', () => {
    // 90 days used → daysUsedInWindow(90) > 89 → canSafelyEnter = false
    const trips = [trip('2025-07-06', '2025-10-03')]; // 90 days
    const presence = presenceDays(trips, BASE_CONFIG);
    const info = getSafeEntryInfo(presence, REFERENCE_DATE, BASE_CONFIG);
    expect(info.canEnterToday).toBe(false);
    expect(info.daysUntilCompliant).toBeGreaterThan(0);
    expect(info).toMatchSnapshot();
  });

  it('2c. 74 days used — can enter today', () => {
    // 74 days used, 16 remaining: can enter today and stay
    const trips = [trip('2025-07-06', '2025-09-17')]; // 74 days
    const presence = presenceDays(trips, BASE_CONFIG);
    const info = getSafeEntryInfo(presence, REFERENCE_DATE, BASE_CONFIG);
    expect(info.canEnterToday).toBe(true);
    expect(info).toMatchSnapshot();
  });

  it('2d. at limit (90 days) — cannot enter, must wait for oldest days to expire', () => {
    const trips = [trip('2025-07-06', '2025-10-03')]; // 90 days
    const presence = presenceDays(trips, BASE_CONFIG);
    const info = getSafeEntryInfo(presence, REFERENCE_DATE, BASE_CONFIG);
    expect(info.canEnterToday).toBe(false);
    expect(info.daysUntilCompliant).toBeGreaterThan(0);
    expect(info).toMatchSnapshot();
  });
});

// ─── 3. Max Stay Days ────────────────────────────────────────────────────────

describe('Snapshot: maxStayDays', () => {

  it('3a. no prior trips — can stay the full 90 days', () => {
    const presence = presenceDays([], BASE_CONFIG);
    const max = maxStayDays(presence, REFERENCE_DATE, BASE_CONFIG);
    expect(max).toBe(90);
  });

  it('3b. 80 days already used — maxStayDays accounts for sliding window expiry', () => {
    // Trip 2025-07-06 to 2025-09-23 = 80 days (26+31+23=80)
    // As days pass from the reference date, the oldest days (Jul 6+) expire from
    // the 180-day window, so the actual max stay > (89 - 80 = 9)
    const trips = [trip('2025-07-06', '2025-09-23')];
    const presence = presenceDays(trips, BASE_CONFIG);
    const max = maxStayDays(presence, REFERENCE_DATE, BASE_CONFIG);
    // Max stay must be at least 1 (there is headroom available)
    expect(max).toBeGreaterThanOrEqual(1);
    expect(max).toMatchSnapshot();
  });
});

// ─── 4. Expiring Days Projection ─────────────────────────────────────────────

describe('Snapshot: projectExpiringDays', () => {

  it('4a. projects day-by-day expiry for next 14 days with a known trip', () => {
    // Trip that entered the window 179 days ago (one of the oldest possible)
    // Some of those days will expire soon, freeing up days
    const trips = [
      trip('2025-07-06', '2025-07-20'), // first 15 days of the window
    ];
    const presence = presenceDays(trips, BASE_CONFIG);
    // Project 14 days forward from ref date
    const projection = projectExpiringDays(presence, REFERENCE_DATE, 14, BASE_CONFIG);
    // projectExpiringDays(fromDate, days) returns days+1 entries (fromDate + N lookahead)
    expect(projection.length).toBeGreaterThanOrEqual(14);
    expect(projection).toMatchSnapshot();
  });
});

// ─── 5. Monthly Compliance Vector ────────────────────────────────────────────

describe('Snapshot: computeMonthCompliance', () => {

  it('5a. January 2026 with a December trip — shows declining days as trip ages', () => {
    // Trip Dec 1–15 adds 15 days to window for Jan 1
    const trips = [trip('2025-12-01', '2025-12-15')];
    const vector = computeMonthCompliance(trips, 1, 2026, BASE_CONFIG);
    // 31 entries (Jan has 31 days)
    expect(vector).toHaveLength(31);
    // Spot-check structure
    expect(vector[0]).toHaveProperty('daysUsed');
    expect(vector[0]).toHaveProperty('daysRemaining');
    expect(vector[0]).toHaveProperty('riskLevel');
    expect(vector[0]).toHaveProperty('date');
    expect(vector).toMatchSnapshot();
  });

  it('5b. clean month with no trips — all days at 0 used', () => {
    const vector = computeMonthCompliance([], 6, 2025, {
      ...BASE_CONFIG,
      referenceDate: REF('2025-06-30'),
    });
    // Every day should show 0 daysUsed
    expect(vector.every((d) => d.daysUsed === 0)).toBe(true);
    expect(vector.every((d) => d.riskLevel === 'green')).toBe(true);
    expect(vector).toMatchSnapshot();
  });

  it('5c. month spanning amber and red — captures risk level transitions', () => {
    // Build up 74 days before November (all green), then add short trips that push to amber
    const longTrip = trip('2025-07-06', '2025-09-17'); // 74 days (26+31+17)
    const novemberTrip = trip('2025-11-01', '2025-11-16'); // 16 more days → 90 total by Nov 16
    const trips = [longTrip, novemberTrip];
    const vector = computeMonthCompliance(trips, 11, 2025, {
      ...BASE_CONFIG,
      referenceDate: REF('2025-11-30'),
    });
    expect(vector).toHaveLength(30);
    // Snapshot captures the actual risk level distribution across the month
    expect(vector).toMatchSnapshot();
  });
});

// ─── 6. Batch Calculations ───────────────────────────────────────────────────

describe('Snapshot: batchCalculateCompliance', () => {

  it('6a. batch of three employees with different compliance levels', () => {
    const employees = [
      {
        id: 'emp-green',
        trips: [trip('2025-12-01', '2025-12-10')], // 10 days — green
      },
      {
        id: 'emp-amber',
        trips: [trip('2025-07-06', '2025-09-18')], // 75 days — amber
      },
      {
        id: 'emp-over-limit',
        trips: [trip('2025-07-06', '2025-10-03')], // 90 days used → red (0 remaining)
      },
    ];

    const results = batchCalculateCompliance(employees, REFERENCE_DATE);

    // Verify structure
    expect(results).toBeInstanceOf(Map);
    expect(results.size).toBe(3);

    // Verify each employee
    expect(results.get('emp-green')?.riskLevel).toBe('green');
    expect(results.get('emp-amber')?.riskLevel).toBe('amber');
    // 90 days used → 0 remaining → 'red' (calculateCompliance uses getRiskLevel, not getStatusFromDaysUsed)
    expect(results.get('emp-over-limit')?.isCompliant).toBe(false);
    expect(results.get('emp-over-limit')?.daysUsed).toBe(90);

    // Snapshot the complete batch output
    // Rename key for snapshot stability
    const snapshotable = Object.fromEntries(
      [...results.entries()].map(([k, v]) => [k, v])
    );
    expect(snapshotable).toMatchSnapshot();
  });
});
