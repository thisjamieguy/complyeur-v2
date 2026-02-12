/**
 * @fileoverview High-confidence scenario tests for core 90/180 calculations.
 *
 * This suite adds:
 * 1) Explicit golden scenarios with fixed expected outputs
 * 2) Window-boundary behavior checks for day-by-day rollovers
 * 3) Seeded differential tests against a strict UTC reference model
 */

import { describe, expect, it } from 'vitest';
import {
  calculateCompliance,
  calculateDaysRemaining,
  daysUsedInWindow,
  earliestSafeEntry,
  getWindowBounds,
  presenceDays,
} from '../index';
import type { ComplianceConfig, Trip } from '../types';
import { addUtcDays } from '../date-utils';

type ExpectedResult = {
  daysUsed: number;
  daysRemaining: number;
  riskLevel: 'green' | 'amber' | 'red';
  isCompliant: boolean;
};

type GoldenScenario = {
  name: string;
  trips: Trip[];
  config: ComplianceConfig;
  expected: ExpectedResult;
};

function toDate(value: string): Date {
  if (value.includes('T')) {
    return new Date(value);
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function createTrip(entry: string, exit: string | null, country: string = 'FR'): Trip {
  return {
    entryDate: toDate(entry),
    exitDate: exit ? toDate(exit) : null,
    country,
  };
}

function createConfig(overrides: Partial<ComplianceConfig> = {}): ComplianceConfig {
  return {
    mode: 'audit',
    referenceDate: toDate('2026-01-01'),
    ...overrides,
  };
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function randomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function dateOnlyKey(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

const SCHENGEN_CODES = [
  'AT', 'BE', 'BG', 'CH', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GR', 'HR', 'HU', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV',
  'MC', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
  'SM', 'VA', 'AD',
] as const;

const NON_SCHENGEN_CODES = ['IE', 'CY', 'GB', 'US', 'CA', 'TR'] as const;
const SCHENGEN_SET = new Set<string>(SCHENGEN_CODES);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EPOCH_START = toDate('1970-01-01');

function toUtcDayIndex(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY
  );
}

function utcDayIndexToDate(dayIndex: number): Date {
  return new Date(dayIndex * MS_PER_DAY);
}

function isSchengenForReference(country: string): boolean {
  return SCHENGEN_SET.has(country.trim().toUpperCase());
}

function strictUtcPresenceDays(trips: readonly Trip[], config: ComplianceConfig): ReadonlySet<number> {
  const referenceDay = toUtcDayIndex(config.referenceDate);
  const complianceStartDay = toUtcDayIndex(config.complianceStartDate ?? EPOCH_START);
  const days = new Set<number>();

  for (const trip of trips) {
    if (!isSchengenForReference(trip.country)) {
      continue;
    }

    const entryDay = toUtcDayIndex(trip.entryDate);
    const exitDay = trip.exitDate ? toUtcDayIndex(trip.exitDate) : referenceDay;

    if (exitDay < complianceStartDay) {
      continue;
    }
    if (config.mode === 'audit' && entryDay > referenceDay) {
      continue;
    }

    const startDay = Math.max(entryDay, complianceStartDay);
    const endDay = config.mode === 'audit' ? Math.min(exitDay, referenceDay) : exitDay;

    if (endDay < startDay) {
      continue;
    }

    for (let day = startDay; day <= endDay; day++) {
      days.add(day);
    }
  }

  return days;
}

function strictUtcDaysUsedInWindow(
  presence: ReadonlySet<number>,
  referenceDate: Date,
  complianceStartDate?: Date
): number {
  const referenceDay = toUtcDayIndex(referenceDate);
  const complianceStartDay = toUtcDayIndex(complianceStartDate ?? EPOCH_START);
  const windowStart = Math.max(referenceDay - 179, complianceStartDay);

  let count = 0;
  for (const day of presence) {
    if (day >= windowStart && day <= referenceDay) {
      count++;
    }
  }

  return count;
}

function strictUtcDaysRemaining(
  presence: ReadonlySet<number>,
  referenceDate: Date,
  limit: number,
  complianceStartDate?: Date
): number {
  return limit - strictUtcDaysUsedInWindow(presence, referenceDate, complianceStartDate);
}

function strictUtcRiskLevel(daysRemaining: number): 'green' | 'amber' | 'red' {
  if (daysRemaining >= 16) {
    return 'green';
  }
  if (daysRemaining >= 1) {
    return 'amber';
  }
  return 'red';
}

function strictUtcEarliestSafeEntry(
  presence: ReadonlySet<number>,
  referenceDate: Date,
  limit: number,
  complianceStartDate?: Date
): Date | null {
  const referenceDay = toUtcDayIndex(referenceDate);
  const todayUsed = strictUtcDaysUsedInWindow(presence, referenceDate, complianceStartDate);

  if (todayUsed <= limit - 1) {
    return null;
  }

  for (let daysAhead = 1; daysAhead <= 180; daysAhead++) {
    const checkDay = referenceDay + daysAhead;
    const checkDate = utcDayIndexToDate(checkDay);
    const used = strictUtcDaysUsedInWindow(presence, checkDate, complianceStartDate);
    if (used <= limit - 1) {
      return checkDate;
    }
  }

  return null;
}

function strictUtcCalculate(trips: readonly Trip[], config: ComplianceConfig): ExpectedResult {
  const presence = strictUtcPresenceDays(trips, config);
  const limit = config.limit ?? 90;
  const daysUsed = strictUtcDaysUsedInWindow(presence, config.referenceDate, config.complianceStartDate);
  const daysRemaining = limit - daysUsed;

  return {
    daysUsed,
    daysRemaining,
    riskLevel: strictUtcRiskLevel(daysRemaining),
    isCompliant: daysUsed <= limit - 1,
  };
}

describe('90/180 Accuracy Scenarios', () => {
  describe('golden scenarios with fixed expected outputs', () => {
    const scenarios: GoldenScenario[] = [
      {
        name: 'empty history returns full allowance',
        trips: [],
        config: createConfig({ referenceDate: toDate('2026-01-01') }),
        expected: { daysUsed: 0, daysRemaining: 90, riskLevel: 'green', isCompliant: true },
      },
      {
        name: 'single ten-day trip',
        trips: [createTrip('2025-11-01', '2025-11-10', 'FR')],
        config: createConfig({ referenceDate: toDate('2025-12-01') }),
        expected: { daysUsed: 10, daysRemaining: 80, riskLevel: 'green', isCompliant: true },
      },
      {
        name: 'overlapping trips are deduplicated',
        trips: [
          createTrip('2025-11-01', '2025-11-10', 'FR'),
          createTrip('2025-11-05', '2025-11-15', 'DE'),
        ],
        config: createConfig({ referenceDate: toDate('2025-12-01') }),
        expected: { daysUsed: 15, daysRemaining: 75, riskLevel: 'green', isCompliant: true },
      },
      {
        name: 'non-Schengen trips are ignored',
        trips: [
          createTrip('2025-11-01', '2025-11-05', 'FR'),
          createTrip('2025-11-06', '2025-11-10', 'IE'),
          createTrip('2025-11-11', '2025-11-15', 'CY'),
        ],
        config: createConfig({ referenceDate: toDate('2025-12-01') }),
        expected: { daysUsed: 5, daysRemaining: 85, riskLevel: 'green', isCompliant: true },
      },
      {
        name: 'microstates count toward Schengen',
        trips: [
          createTrip('2026-01-01', '2026-01-02', 'MC'),
          createTrip('2026-01-05', '2026-01-06', 'VA'),
          createTrip('2026-01-10', '2026-01-10', 'SM'),
          createTrip('2026-01-15', '2026-01-16', 'AD'),
        ],
        config: createConfig({ referenceDate: toDate('2026-02-01') }),
        expected: { daysUsed: 7, daysRemaining: 83, riskLevel: 'green', isCompliant: true },
      },
      {
        name: '89 days used remains compliant',
        trips: [createTrip('2025-10-12', '2026-01-08', 'FR')],
        config: createConfig({ referenceDate: toDate('2026-01-08') }),
        expected: { daysUsed: 89, daysRemaining: 1, riskLevel: 'amber', isCompliant: true },
      },
      {
        name: '90 days used is a violation',
        trips: [createTrip('2025-10-12', '2026-01-09', 'FR')],
        config: createConfig({ referenceDate: toDate('2026-01-09') }),
        expected: { daysUsed: 90, daysRemaining: 0, riskLevel: 'red', isCompliant: false },
      },
      {
        name: '91 days used is over limit',
        trips: [createTrip('2025-10-12', '2026-01-10', 'FR')],
        config: createConfig({ referenceDate: toDate('2026-01-10') }),
        expected: { daysUsed: 91, daysRemaining: -1, riskLevel: 'red', isCompliant: false },
      },
      {
        name: 'audit mode excludes future planned trip',
        trips: [
          createTrip('2025-11-01', '2025-11-05', 'FR'),
          createTrip('2025-12-20', '2025-12-24', 'FR'),
        ],
        config: createConfig({
          mode: 'audit',
          referenceDate: toDate('2025-11-30'),
        }),
        expected: { daysUsed: 5, daysRemaining: 85, riskLevel: 'green', isCompliant: true },
      },
      {
        name: 'planning mode includes future trip with future reference date',
        trips: [
          createTrip('2025-11-01', '2025-11-05', 'FR'),
          createTrip('2025-12-20', '2025-12-24', 'FR'),
        ],
        config: createConfig({
          mode: 'planning',
          referenceDate: toDate('2025-12-24'),
        }),
        expected: { daysUsed: 10, daysRemaining: 80, riskLevel: 'green', isCompliant: true },
      },
      {
        name: 'active trip (null exit) is clipped to reference date',
        trips: [createTrip('2026-02-01', null, 'FR')],
        config: createConfig({
          mode: 'audit',
          referenceDate: toDate('2026-02-05'),
        }),
        expected: { daysUsed: 5, daysRemaining: 85, riskLevel: 'green', isCompliant: true },
      },
      {
        name: 'compliance start date clips early travel days',
        trips: [createTrip('2025-09-25', '2025-10-15', 'FR')],
        config: createConfig({
          referenceDate: toDate('2025-10-20'),
          complianceStartDate: toDate('2025-10-12'),
        }),
        expected: { daysUsed: 4, daysRemaining: 86, riskLevel: 'green', isCompliant: true },
      },
      {
        name: 'multiple same-day trips on overlapping dates deduplicate',
        trips: [
          createTrip('2026-03-01', '2026-03-03', 'FR'),
          createTrip('2026-03-02', '2026-03-04', 'fr'),
          createTrip('2026-03-04', '2026-03-04', 'DE'),
        ],
        config: createConfig({ referenceDate: toDate('2026-03-31') }),
        expected: { daysUsed: 4, daysRemaining: 86, riskLevel: 'green', isCompliant: true },
      },
      {
        name: 'full country names are recognized',
        trips: [createTrip('2026-04-01', '2026-04-03', 'France')],
        config: createConfig({ referenceDate: toDate('2026-04-15') }),
        expected: { daysUsed: 3, daysRemaining: 87, riskLevel: 'green', isCompliant: true },
      },
      {
        name: 'timezone-offset timestamps normalize consistently to UTC days',
        trips: [
          createTrip('2026-03-01T23:30:00+14:00', '2026-03-02T00:30:00-12:00', 'FR'),
        ],
        config: createConfig({ referenceDate: toDate('2026-03-10') }),
        expected: { daysUsed: 2, daysRemaining: 88, riskLevel: 'green', isCompliant: true },
      },
    ];

    for (const scenario of scenarios) {
      it(scenario.name, () => {
        const result = calculateCompliance(scenario.trips, scenario.config);

        expect(result.daysUsed).toBe(scenario.expected.daysUsed);
        expect(result.daysRemaining).toBe(scenario.expected.daysRemaining);
        expect(result.riskLevel).toBe(scenario.expected.riskLevel);
        expect(result.isCompliant).toBe(scenario.expected.isCompliant);
      });
    }
  });

  describe('window-boundary behavior', () => {
    it('includes refDate and day-179, excludes day-180', () => {
      const referenceDate = toDate('2026-08-01');
      const exactly179 = addUtcDays(referenceDate, -179);
      const exactly180 = addUtcDays(referenceDate, -180);

      const trips: Trip[] = [
        {
          entryDate: exactly180,
          exitDate: exactly180,
          country: 'FR',
        },
        {
          entryDate: exactly179,
          exitDate: exactly179,
          country: 'FR',
        },
        {
          entryDate: referenceDate,
          exitDate: referenceDate,
          country: 'FR',
        },
      ];

      const result = calculateCompliance(trips, createConfig({ referenceDate }));

      expect(result.daysUsed).toBe(2);
      expect(result.daysRemaining).toBe(88);
    });

    it('drops one day when the rolling window advances by one day', () => {
      const referenceDate = toDate('2026-06-30');
      const oldestIncluded = addUtcDays(referenceDate, -179);
      const trips: Trip[] = [
        {
          entryDate: oldestIncluded,
          exitDate: addUtcDays(oldestIncluded, 9),
          country: 'FR',
        },
      ];

      const day1 = calculateCompliance(trips, createConfig({ referenceDate }));
      const day2 = calculateCompliance(trips, createConfig({ referenceDate: addUtcDays(referenceDate, 1) }));

      expect(day1.daysUsed).toBe(10);
      expect(day2.daysUsed).toBe(9);
      expect(day2.daysRemaining).toBe(day1.daysRemaining + 1);
    });
  });

  describe('seeded differential scenarios against strict UTC reference', () => {
    it('matches strict UTC reference across 250 generated scenarios', () => {
      const random = createSeededRandom(20260212);
      const scenarioCount = 250;
      const baseReference = toDate('2026-01-01');

      for (let i = 0; i < scenarioCount; i++) {
        const referenceDate = addUtcDays(baseReference, randomInt(random, -360, 360));
        const mode: ComplianceConfig['mode'] = random() < 0.5 ? 'audit' : 'planning';
        const complianceStartDate = addUtcDays(referenceDate, -randomInt(random, 60, 720));
        const tripCount = randomInt(random, 0, 14);

        const trips: Trip[] = [];

        for (let j = 0; j < tripCount; j++) {
          const entry = addUtcDays(referenceDate, randomInt(random, -420, 120));
          entry.setUTCHours(randomInt(random, 0, 23), randomInt(random, 0, 59), 0, 0);

          const activeTrip = random() < 0.2 && entry.getTime() <= referenceDate.getTime();
          const duration = randomInt(random, 0, 45);

          let exit: Date | null = null;
          if (!activeTrip) {
            exit = addUtcDays(entry, duration);
            exit.setUTCHours(randomInt(random, 0, 23), randomInt(random, 0, 59), 0, 0);
            // Keep generated data valid for production trip validation.
            if (exit.getTime() < entry.getTime()) {
              exit = new Date(entry);
            }
          }

          const useSchengen = random() < 0.72;
          const schengenCountry = SCHENGEN_CODES[randomInt(random, 0, SCHENGEN_CODES.length - 1)];
          const nonSchengenCountry = NON_SCHENGEN_CODES[randomInt(random, 0, NON_SCHENGEN_CODES.length - 1)];
          const country = useSchengen ? schengenCountry : nonSchengenCountry;

          trips.push({
            entryDate: new Date(entry),
            exitDate: exit ? new Date(exit) : null,
            country,
          });
        }

        const config: ComplianceConfig = {
          mode,
          referenceDate: new Date(referenceDate),
          complianceStartDate: new Date(complianceStartDate),
        };

        const productionResult = calculateCompliance(trips, config);
        const strictResult = strictUtcCalculate(trips, config);

        if (productionResult.daysUsed !== strictResult.daysUsed) {
          const productionWindow = getWindowBounds(config.referenceDate, config);
          const strictRefDay = toUtcDayIndex(config.referenceDate);
          const strictWindowStartDay = Math.max(
            strictRefDay - 179,
            toUtcDayIndex(config.complianceStartDate ?? EPOCH_START)
          );
          const strictWindowStart = utcDayIndexToDate(strictWindowStartDay);

          const serializedTrips = trips.map((trip) => ({
            entryDate: trip.entryDate.toISOString(),
            exitDate: trip.exitDate ? trip.exitDate.toISOString() : null,
            country: trip.country,
          }));

          throw new Error(
            `generated scenario ${i + 1} mismatch\n` +
              `mode=${config.mode}\n` +
              `referenceDate=${config.referenceDate.toISOString()}\n` +
              `complianceStartDate=${config.complianceStartDate?.toISOString()}\n` +
              `productionWindowStart=${productionWindow.windowStart.toISOString()}\n` +
              `strictWindowStart=${strictWindowStart.toISOString()}\n` +
              `production=${JSON.stringify(productionResult)}\n` +
              `strict=${JSON.stringify(strictResult)}\n` +
              `trips=${JSON.stringify(serializedTrips)}`
          );
        }

        expect(productionResult.daysUsed).toBe(strictResult.daysUsed);
        expect(productionResult.daysRemaining).toBe(strictResult.daysRemaining);
        expect(productionResult.riskLevel).toBe(strictResult.riskLevel);
        expect(productionResult.isCompliant).toBe(strictResult.isCompliant);

        const productionPresence = presenceDays(trips, config);
        const strictPresence = strictUtcPresenceDays(trips, config);
        expect(productionPresence.size).toBe(strictPresence.size);

        const productionUsed = daysUsedInWindow(productionPresence, config.referenceDate, config);
        const strictUsed = strictUtcDaysUsedInWindow(
          strictPresence,
          config.referenceDate,
          config.complianceStartDate
        );
        expect(productionUsed).toBe(strictUsed);

        const productionRemaining = calculateDaysRemaining(productionPresence, config.referenceDate, config);
        const strictRemaining = strictUtcDaysRemaining(
          strictPresence,
          config.referenceDate,
          config.limit ?? 90,
          config.complianceStartDate
        );
        expect(productionRemaining).toBe(strictRemaining);

        const productionSafeEntry = earliestSafeEntry(productionPresence, config.referenceDate, config);
        const strictSafeEntry = strictUtcEarliestSafeEntry(
          strictPresence,
          config.referenceDate,
          config.limit ?? 90,
          config.complianceStartDate
        );
        expect(dateOnlyKey(productionSafeEntry)).toBe(dateOnlyKey(strictSafeEntry));

        expect(productionResult.daysRemaining).toBe(90 - productionResult.daysUsed);
        expect(productionResult.isCompliant).toBe(productionResult.daysUsed <= 89);
      }
    });
  });
});
