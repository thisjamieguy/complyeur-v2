import { describe, expect, it } from 'vitest';

import {
  parseDateOnlyAsUTC,
} from '@/lib/compliance';
import type { ForecastTrip } from '@/types/forecast';

import {
  calculateCompliantFromDate,
  calculateFutureJobCompliance,
  calculateTripDuration,
} from '../forecast-service';

function createTrip(
  trip: Pick<ForecastTrip, 'id' | 'country' | 'entryDate' | 'exitDate'> &
    Partial<Pick<ForecastTrip, 'employeeId' | 'companyId' | 'ghosted'>>
): ForecastTrip {
  return {
    id: trip.id,
    employeeId: trip.employeeId ?? 'emp-1',
    companyId: trip.companyId ?? 'co-1',
    country: trip.country,
    entryDate: trip.entryDate,
    exitDate: trip.exitDate,
    purpose: null,
    jobRef: null,
    isPrivate: false,
    ghosted: trip.ghosted ?? false,
    travelDays: calculateTripDuration(
      parseDateOnlyAsUTC(trip.entryDate),
      parseDateOnlyAsUTC(trip.exitDate)
    ),
  };
}

function dateKey(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}


describe('calculateCompliantFromDate', () => {
  it('treats exactly 90 days after trip as non-compliant', () => {
    const base = {
      employeeId: 'emp-1',
      companyId: 'co-1',
      purpose: null,
      jobRef: null,
      isPrivate: false,
      ghosted: false,
    };

    const futureTrip = createTrip({
      id: 'future-90',
      country: 'FR',
      entryDate: '2026-07-01',
      exitDate: '2026-07-01',
      ...base,
    });

    const historicalTrip = createTrip({
      id: 'hist-89',
      country: 'FR',
      entryDate: '2026-04-03',
      exitDate: '2026-06-30',
      ...base,
    });

    const result = calculateFutureJobCompliance(
      futureTrip,
      [futureTrip, historicalTrip],
      'Test Employee'
    );

    expect(result.daysUsedBeforeTrip).toBe(89);
    expect(result.daysAfterTrip).toBe(90);
    expect(result.riskLevel).toBe('red');
    expect(result.isCompliant).toBe(false);
    expect(result.compliantFromDate).not.toBeNull();
  });

  it('returns null for non-Schengen future trips', () => {
    const futureTrip = createTrip({
      id: 'future-us',
      country: 'US',
      entryDate: '2026-07-10',
      exitDate: '2026-07-20',
    });

    const allTrips = [
      futureTrip,
      createTrip({
        id: 'fr-1',
        country: 'FR',
        entryDate: '2026-01-10',
        exitDate: '2026-01-20',
      }),
    ];

    expect(calculateCompliantFromDate(allTrips, futureTrip)).toBeNull();
  });

  it('returns the original entry date when day-by-day shows the trip is already compliant', () => {
    // Same scenario as the calculateFutureJobCompliance rolling-window test.
    // Static algo returns 2026-07-02 (one day later than needed).
    // Day-by-day should return 2026-07-01 — the trip was always compliant.
    const futureTrip = createTrip({
      id: 'future-cfd-rolling',
      country: 'FR',
      entryDate: '2026-07-01',
      exitDate: '2026-07-08',
    });

    const tripA = createTrip({
      id: 'cfd-hist-a',
      country: 'FR',
      entryDate: '2026-04-17',
      exitDate: '2026-06-30',
    });

    const tripB = createTrip({
      id: 'cfd-hist-b',
      country: 'DE',
      entryDate: '2026-01-03',
      exitDate: '2026-01-09',
    });

    const result = calculateCompliantFromDate(
      [futureTrip, tripA, tripB],
      futureTrip
    );

    // Should return 2026-07-01, not 2026-07-02
    expect(dateKey(result)).toBe('2026-07-01');
  });

});

describe('day-by-day rolling window — regression', () => {
  it('treats a trip as compliant when old days drop off during the trip', () => {
    // Planned trip: 2026-07-01 → 2026-07-08 (8 days, Schengen)
    // Window for 2026-07-01 starts 2026-01-03 (179 days prior)
    const futureTrip = createTrip({
      id: 'future-rolling',
      country: 'FR',
      entryDate: '2026-07-01',
      exitDate: '2026-07-08',
    });

    // Trip A: 75 days, entirely within the window for the full planned trip duration
    // 2026-04-17 to 2026-06-30 = 75 days
    const tripA = createTrip({
      id: 'hist-a',
      country: 'FR',
      entryDate: '2026-04-17',
      exitDate: '2026-06-30',
    });

    // Trip B: 7 days at the near edge of the window — they drop off one-per-day
    // during the planned trip as the window slides forward.
    // Window start on entry date = 2026-01-03, so 2026-01-03 to 2026-01-09 are in-window.
    const tripB = createTrip({
      id: 'hist-b',
      country: 'DE',
      entryDate: '2026-01-03',
      exitDate: '2026-01-09',
    });

    // Historical at entry: 75 + 7 = 82 days.
    // Static algo (buggy): 82 + 8 = 90 → non-compliant.
    // Day-by-day (correct): peak = 83 on every day → compliant.
    const result = calculateFutureJobCompliance(
      futureTrip,
      [futureTrip, tripA, tripB],
      'Test Employee'
    );

    expect(result.daysUsedBeforeTrip).toBe(82);
    expect(result.daysAfterTrip).toBe(83); // peak, not 82 + 8 = 90
    expect(result.isCompliant).toBe(true);
    expect(result.riskLevel).toBe('yellow'); // 83 >= 80 warning threshold
    expect(result.firstViolationDay).toBeUndefined();
  });

  it('correctly identifies the first violation day when a trip breaches the limit', () => {
    // Planned trip: 2026-07-01 → 2026-07-08 (8 days)
    // 89 recent historical days, none drop off during the trip.
    // Day 1: 89 + 1 = 90 → violation on day 1.
    const futureTrip = createTrip({
      id: 'future-violation',
      country: 'FR',
      entryDate: '2026-07-01',
      exitDate: '2026-07-08',
    });

    // 89 days, all recent — none fall out of the window during the trip
    // 2026-04-03 to 2026-06-30 = 89 days
    const historicalTrip = createTrip({
      id: 'hist-89',
      country: 'FR',
      entryDate: '2026-04-03',
      exitDate: '2026-06-30',
    });

    const result = calculateFutureJobCompliance(
      futureTrip,
      [futureTrip, historicalTrip],
      'Test Employee'
    );

    expect(result.daysUsedBeforeTrip).toBe(89);
    expect(result.isCompliant).toBe(false);
    expect(result.firstViolationDay).toBe(1); // violates on day 1
  });
});
