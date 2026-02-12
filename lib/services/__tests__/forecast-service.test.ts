import { addDays, format, isBefore } from 'date-fns';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_COMPLIANCE_START_DATE,
  SCHENGEN_DAY_LIMIT,
  WINDOW_SIZE_DAYS,
  daysUsedInWindow,
  isSchengenCountry,
  parseDateOnlyAsUTC,
  presenceDays,
} from '@/lib/compliance';
import type { ComplianceConfig, Trip as ComplianceTrip } from '@/lib/compliance';
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
  return date ? format(date, 'yyyy-MM-dd') : null;
}

// Characterization baseline: pre-refactor algorithm.
function baselineCalculateCompliantFromDate(
  allTrips: ForecastTrip[],
  futureTrip: ForecastTrip,
  limit: number = SCHENGEN_DAY_LIMIT
): Date | null {
  const tripEntryDate = parseDateOnlyAsUTC(futureTrip.entryDate);
  const tripExitDate = parseDateOnlyAsUTC(futureTrip.exitDate);
  const tripDuration = calculateTripDuration(tripEntryDate, tripExitDate);

  if (!isSchengenCountry(futureTrip.country)) {
    return null;
  }

  const relevantTrips = allTrips.filter((trip) => {
    if (trip.ghosted) return false;
    if (trip.id === futureTrip.id) return false;
    return isSchengenCountry(trip.country);
  });

  const complianceTrips: ComplianceTrip[] = relevantTrips.map((trip) => ({
    id: trip.id,
    entryDate: parseDateOnlyAsUTC(trip.entryDate),
    exitDate: parseDateOnlyAsUTC(trip.exitDate),
    country: trip.country,
  }));

  const maxCheckDays = WINDOW_SIZE_DAYS;
  let checkDate = tripEntryDate;

  for (let i = 0; i <= maxCheckDays; i++) {
    checkDate = addDays(tripEntryDate, i);

    const tripsBeforeCheck = complianceTrips.filter((trip) =>
      isBefore(trip.entryDate, checkDate)
    );

    const complianceConfig: ComplianceConfig = {
      mode: 'planning',
      referenceDate: checkDate,
      complianceStartDate: DEFAULT_COMPLIANCE_START_DATE,
      limit,
    };

    const presence = presenceDays(tripsBeforeCheck, complianceConfig);
    const daysUsedBefore = daysUsedInWindow(presence, checkDate, complianceConfig);
    const daysAfterTrip = daysUsedBefore + tripDuration;

    if (daysAfterTrip < limit) {
      return checkDate;
    }
  }

  return addDays(tripEntryDate, maxCheckDays);
}

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomFrom<T>(rng: () => number, values: readonly T[]): T {
  return values[randomInt(rng, 0, values.length - 1)];
}

function generateScenario(seed: number): { allTrips: ForecastTrip[]; futureTrip: ForecastTrip } {
  const rng = createSeededRng(seed);
  const baseDate = addDays(new Date('2026-07-01T00:00:00.000Z'), randomInt(rng, 0, 30));

  const futureDuration = randomInt(rng, 1, 21);
  const futureEntryDate = format(baseDate, 'yyyy-MM-dd');
  const futureExitDate = format(addDays(baseDate, futureDuration - 1), 'yyyy-MM-dd');

  const futureTrip = createTrip({
    id: `future-${seed}`,
    country: randomFrom(rng, ['FR', 'DE', 'ES', 'IT', 'PL', 'US', 'GB']),
    entryDate: futureEntryDate,
    exitDate: futureExitDate,
  });

  const allTrips: ForecastTrip[] = [futureTrip];
  const historicalTripCount = randomInt(rng, 0, 80);
  const countries = ['FR', 'DE', 'ES', 'IT', 'PL', 'NL', 'US', 'GB'] as const;

  for (let i = 0; i < historicalTripCount; i++) {
    const startOffsetDays = randomInt(rng, -260, 120);
    const durationDays = randomInt(rng, 1, 28);
    const entryDate = addDays(baseDate, startOffsetDays);
    const exitDate = addDays(entryDate, durationDays - 1);

    allTrips.push(
      createTrip({
        id: `trip-${seed}-${i}`,
        country: randomFrom(rng, countries),
        entryDate: format(entryDate, 'yyyy-MM-dd'),
        exitDate: format(exitDate, 'yyyy-MM-dd'),
        ghosted: rng() < 0.2,
      })
    );
  }

  return { allTrips, futureTrip };
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

  it('matches baseline behavior across deterministic randomized scenarios', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { allTrips, futureTrip } = generateScenario(seed);

      const expected = baselineCalculateCompliantFromDate(allTrips, futureTrip);
      const actual = calculateCompliantFromDate(allTrips, futureTrip);

      expect(dateKey(actual)).toBe(dateKey(expected));
    }
  }, 15_000);
});
