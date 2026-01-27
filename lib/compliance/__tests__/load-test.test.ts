/**
 * @fileoverview Load test for compliance algorithm with 100,000+ days.
 *
 * Tests that the compliance calculator produces correct results (expected vs actual)
 * when processing large volumes of trip data. Uses the oracle implementation as
 * the source of truth for expected values.
 *
 * @version 2025-01-27
 */

import { describe, it, expect } from 'vitest';
import { presenceDays } from '../presence-calculator';
import { daysUsedInWindow } from '../window-calculator';
import { getRiskLevel } from '../risk-calculator';
import { oraclePresenceDays, oracleCalculate, validateAgainstOracle } from './oracle-calculator';
import type { Trip, ComplianceConfig } from '../types';
import type { OracleTrip, OracleConfig } from './oracle-calculator';

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Simple seeded pseudo-random number generator for reproducible tests.
 * Uses a Linear Congruential Generator (LCG) algorithm.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // LCG parameters from Numerical Recipes
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/**
 * Generates a large number of trips spanning years of travel.
 * Uses deterministic pseudo-random generation for reproducible tests.
 *
 * @param totalDays - Target total days of travel to generate
 * @param startYear - Year to start generating trips from
 * @param seed - Random seed for reproducibility
 * @returns Array of trips
 */
function generateTrips(
  totalDays: number,
  startYear: number = 2020,
  seed: number = 42
): Trip[] {
  const random = createSeededRandom(seed);
  const trips: Trip[] = [];
  let currentDate = new Date(`${startYear}-01-01T00:00:00.000Z`);
  let daysGenerated = 0;

  // Schengen countries to cycle through
  const countries = ['FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'GR', 'PL'];
  let countryIndex = 0;

  while (daysGenerated < totalDays) {
    // Trip length: 3-14 days (realistic pattern)
    const tripLength = 3 + Math.floor(random() * 12);
    const actualLength = Math.min(tripLength, totalDays - daysGenerated);

    if (actualLength <= 0) break;

    const entryDate = new Date(currentDate);
    const exitDate = new Date(currentDate.getTime() + (actualLength - 1) * 24 * 60 * 60 * 1000);

    trips.push({
      entryDate,
      exitDate,
      country: countries[countryIndex % countries.length],
    });

    daysGenerated += actualLength;
    countryIndex++;

    // Gap between trips: 5-30 days (simulate breaks)
    const gap = 5 + Math.floor(random() * 26);
    currentDate = new Date(exitDate.getTime() + gap * 24 * 60 * 60 * 1000);
  }

  return trips;
}

/**
 * Converts Trip[] to OracleTrip[] for oracle comparison.
 */
function toOracleTrips(trips: readonly Trip[]): OracleTrip[] {
  return trips.map(t => ({
    entryDate: t.entryDate,
    exitDate: t.exitDate,
    country: t.country,
  }));
}

/**
 * Generates test scenarios with expected results.
 * Each scenario has a specific pattern and known expected outcome.
 */
interface TestScenario {
  name: string;
  trips: Trip[];
  referenceDate: Date;
  complianceStartDate: Date;
  expectedDaysUsed: number;
  expectedPresenceDays: number;
}

function generateKnownScenarios(): TestScenario[] {
  return [
    {
      name: 'Continuous 30-day trip',
      trips: [
        {
          entryDate: new Date('2025-11-01T00:00:00.000Z'),
          exitDate: new Date('2025-11-30T00:00:00.000Z'),
          country: 'FR',
        },
      ],
      referenceDate: new Date('2025-12-15T00:00:00.000Z'),
      complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      expectedPresenceDays: 30,
      expectedDaysUsed: 30, // All 30 days in window
    },
    {
      name: 'Multiple short trips totaling 24 days',
      trips: [
        // 4 trips of 6 days each = 24 days
        {
          entryDate: new Date('2025-10-15T00:00:00.000Z'),
          exitDate: new Date('2025-10-20T00:00:00.000Z'),
          country: 'DE',
        },
        {
          entryDate: new Date('2025-10-25T00:00:00.000Z'),
          exitDate: new Date('2025-10-30T00:00:00.000Z'),
          country: 'DE',
        },
        {
          entryDate: new Date('2025-11-05T00:00:00.000Z'),
          exitDate: new Date('2025-11-10T00:00:00.000Z'),
          country: 'DE',
        },
        {
          entryDate: new Date('2025-11-15T00:00:00.000Z'),
          exitDate: new Date('2025-11-20T00:00:00.000Z'),
          country: 'DE',
        },
      ],
      referenceDate: new Date('2025-12-01T00:00:00.000Z'),
      complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      expectedPresenceDays: 24, // 4 trips * 6 days
      expectedDaysUsed: 24,
    },
    {
      name: 'Trip spanning multiple months',
      trips: [
        {
          entryDate: new Date('2025-10-20T00:00:00.000Z'),
          exitDate: new Date('2025-12-10T00:00:00.000Z'),
          country: 'ES',
        },
      ],
      referenceDate: new Date('2025-12-15T00:00:00.000Z'),
      complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      expectedPresenceDays: 52, // Oct 20 - Dec 10 = 52 days
      expectedDaysUsed: 52,
    },
    {
      name: 'Near-limit scenario (89 days)',
      trips: [
        {
          entryDate: new Date('2025-10-12T00:00:00.000Z'),
          exitDate: new Date('2026-01-08T00:00:00.000Z'),
          country: 'IT',
        },
      ],
      referenceDate: new Date('2026-01-15T00:00:00.000Z'),
      complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      expectedPresenceDays: 89, // Oct 12 - Jan 8 = 89 days
      expectedDaysUsed: 89,
    },
    {
      name: 'Exactly at limit (90 days)',
      trips: [
        {
          entryDate: new Date('2025-10-12T00:00:00.000Z'),
          exitDate: new Date('2026-01-09T00:00:00.000Z'),
          country: 'NL',
        },
      ],
      referenceDate: new Date('2026-01-15T00:00:00.000Z'),
      complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      expectedPresenceDays: 90, // Oct 12 - Jan 9 = 90 days
      expectedDaysUsed: 90,
    },
  ];
}

// ============================================================================
// Load Tests
// ============================================================================

describe('Compliance Algorithm Load Tests', () => {
  describe('Large Volume Correctness (Expected vs Actual)', () => {
    it('processes 100,000+ days correctly against oracle', () => {
      // Generate 100,000+ days of trips starting from 2020
      const startYear = 2020;
      const trips = generateTrips(100_000, startYear);
      const totalGeneratedDays = trips.reduce((sum, t) => {
        const days = Math.floor(
          (t.exitDate!.getTime() - t.entryDate.getTime()) / (24 * 60 * 60 * 1000)
        ) + 1;
        return sum + days;
      }, 0);

      expect(totalGeneratedDays).toBeGreaterThanOrEqual(100_000);

      // Use a reference date well after all trips
      // Find the last trip end date + some buffer
      const lastTripEnd = trips[trips.length - 1].exitDate!;
      const referenceDate = new Date(lastTripEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
      const complianceStartDate = new Date(`${startYear}-01-01T00:00:00.000Z`);

      const config: ComplianceConfig = {
        mode: 'audit',
        referenceDate,
        complianceStartDate,
      };

      const oracleConfig: OracleConfig = {
        mode: 'audit',
        referenceDate,
        complianceStartDate,
      };

      // Calculate using production code
      const productionPresence = presenceDays(trips, config);
      const productionDaysUsed = daysUsedInWindow(productionPresence, referenceDate, config);
      const productionDaysRemaining = 90 - productionDaysUsed;
      const productionRiskLevel = getRiskLevel(productionDaysRemaining);

      // Calculate using oracle
      const oraclePresence = oraclePresenceDays(toOracleTrips(trips), oracleConfig);
      const oracleResult = oracleCalculate(toOracleTrips(trips), oracleConfig);

      // First check presence days match
      expect(productionPresence.size).toBe(oraclePresence.size);

      // Validate production matches oracle
      validateAgainstOracle(
        {
          daysUsed: productionDaysUsed,
          daysRemaining: productionDaysRemaining,
          riskLevel: productionRiskLevel,
        },
        oracleResult,
        '100k days load test'
      );
    });

    it('processes 500,000+ days correctly against oracle', () => {
      // Generate 500,000+ days of trips for extreme load
      const startYear = 2010;
      const trips = generateTrips(500_000, startYear);
      const totalGeneratedDays = trips.reduce((sum, t) => {
        const days = Math.floor(
          (t.exitDate!.getTime() - t.entryDate.getTime()) / (24 * 60 * 60 * 1000)
        ) + 1;
        return sum + days;
      }, 0);

      expect(totalGeneratedDays).toBeGreaterThanOrEqual(500_000);

      // Use a reference date well after all trips
      const lastTripEnd = trips[trips.length - 1].exitDate!;
      const referenceDate = new Date(lastTripEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
      const complianceStartDate = new Date(`${startYear}-01-01T00:00:00.000Z`);

      const config: ComplianceConfig = {
        mode: 'audit',
        referenceDate,
        complianceStartDate,
      };

      const oracleConfig: OracleConfig = {
        mode: 'audit',
        referenceDate,
        complianceStartDate,
      };

      // Calculate using production code
      const productionPresence = presenceDays(trips, config);
      const productionDaysUsed = daysUsedInWindow(productionPresence, referenceDate, config);
      const productionDaysRemaining = 90 - productionDaysUsed;
      const productionRiskLevel = getRiskLevel(productionDaysRemaining);

      // Calculate using oracle
      const oraclePresence = oraclePresenceDays(toOracleTrips(trips), oracleConfig);
      const oracleResult = oracleCalculate(toOracleTrips(trips), oracleConfig);

      // First check presence days match
      expect(productionPresence.size).toBe(oraclePresence.size);

      // Validate production matches oracle
      validateAgainstOracle(
        {
          daysUsed: productionDaysUsed,
          daysRemaining: productionDaysRemaining,
          riskLevel: productionRiskLevel,
        },
        oracleResult,
        '500k days load test'
      );
    });

    it.each(generateKnownScenarios())(
      'scenario: $name - expected $expectedDaysUsed days used',
      (scenario) => {
        const config: ComplianceConfig = {
          mode: 'audit',
          referenceDate: scenario.referenceDate,
          complianceStartDate: scenario.complianceStartDate,
        };

        const oracleConfig: OracleConfig = {
          mode: 'audit',
          referenceDate: scenario.referenceDate,
          complianceStartDate: scenario.complianceStartDate,
        };

        // Production calculation
        const productionPresence = presenceDays(scenario.trips, config);
        const productionDaysUsed = daysUsedInWindow(
          productionPresence,
          scenario.referenceDate,
          config
        );

        // Oracle calculation
        const oraclePresence = oraclePresenceDays(
          toOracleTrips(scenario.trips),
          oracleConfig
        );

        // Verify presence days count
        expect(productionPresence.size).toBe(scenario.expectedPresenceDays);
        expect(oraclePresence.size).toBe(scenario.expectedPresenceDays);

        // Verify days used matches expected
        expect(productionDaysUsed).toBe(scenario.expectedDaysUsed);
      }
    );
  });

  describe('Performance Benchmarks', () => {
    it('processes 10,000 trips under 1 second', () => {
      // Generate trips that create ~10,000 trips (not days)
      const trips: Trip[] = [];
      const startDate = new Date('2015-01-01T00:00:00.000Z');
      const countries = ['FR', 'DE', 'ES', 'IT', 'NL'];

      for (let i = 0; i < 10_000; i++) {
        const entryDate = new Date(startDate.getTime() + i * 10 * 24 * 60 * 60 * 1000);
        const exitDate = new Date(entryDate.getTime() + 5 * 24 * 60 * 60 * 1000);
        trips.push({
          entryDate,
          exitDate,
          country: countries[i % countries.length],
        });
      }

      const referenceDate = new Date('2026-01-15T00:00:00.000Z');
      const config: ComplianceConfig = {
        mode: 'audit',
        referenceDate,
        complianceStartDate: new Date('2015-01-01T00:00:00.000Z'),
      };

      const startTime = performance.now();
      const presence = presenceDays(trips, config);
      daysUsedInWindow(presence, referenceDate, config);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`10,000 trips processed in ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(1000); // Under 1 second
    });

    it('processes 100,000 days under 2 seconds', () => {
      const trips = generateTrips(100_000);

      const referenceDate = new Date('2026-01-15T00:00:00.000Z');
      const config: ComplianceConfig = {
        mode: 'audit',
        referenceDate,
        complianceStartDate: new Date('2015-01-01T00:00:00.000Z'),
      };

      const startTime = performance.now();
      const presence = presenceDays(trips, config);
      daysUsedInWindow(presence, referenceDate, config);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`100,000 days processed in ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(2000); // Under 2 seconds
    });
  });

  describe('Edge Cases at Scale', () => {
    it('handles many overlapping trips correctly', () => {
      // Create 1000 trips that all overlap on the same days
      const trips: Trip[] = [];
      const baseDate = new Date('2025-11-01T00:00:00.000Z');
      const countries = ['FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'GR', 'PL'];

      for (let i = 0; i < 1000; i++) {
        trips.push({
          entryDate: baseDate,
          exitDate: new Date('2025-11-30T00:00:00.000Z'),
          country: countries[i % countries.length],
        });
      }

      const referenceDate = new Date('2025-12-15T00:00:00.000Z');
      const config: ComplianceConfig = {
        mode: 'audit',
        referenceDate,
        complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      };

      const presence = presenceDays(trips, config);

      // Should deduplicate to exactly 30 days (Nov 1-30)
      expect(presence.size).toBe(30);
    });

    it('handles mix of Schengen and non-Schengen trips', () => {
      const trips: Trip[] = [];
      const baseDate = new Date('2025-10-15T00:00:00.000Z');
      const schengenCountries = ['FR', 'DE', 'ES'];
      const nonSchengenCountries = ['GB', 'IE', 'CY', 'US', 'CA'];

      // Alternate between Schengen and non-Schengen
      for (let i = 0; i < 1000; i++) {
        const entryDate = new Date(baseDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
        const exitDate = new Date(entryDate.getTime() + 3 * 24 * 60 * 60 * 1000);
        const country = i % 2 === 0
          ? schengenCountries[i % schengenCountries.length]
          : nonSchengenCountries[i % nonSchengenCountries.length];

        trips.push({ entryDate, exitDate, country });
      }

      const referenceDate = new Date('2045-01-15T00:00:00.000Z'); // Far future to include all
      const config: ComplianceConfig = {
        mode: 'audit',
        referenceDate,
        complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      };

      const oracleConfig: OracleConfig = {
        mode: 'audit',
        referenceDate,
        complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      };

      const productionPresence = presenceDays(trips, config);
      const oraclePresence = oraclePresenceDays(toOracleTrips(trips), oracleConfig);

      // Production and oracle should match
      expect(productionPresence.size).toBe(oraclePresence.size);
    });

    it('handles rapid consecutive same-day trips', () => {
      // 5000 same-day trips on different days
      const trips: Trip[] = [];
      const startDate = new Date('2025-10-15T00:00:00.000Z');

      for (let i = 0; i < 5000; i++) {
        const tripDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        trips.push({
          entryDate: tripDate,
          exitDate: tripDate, // Same-day trip
          country: 'FR',
        });
      }

      const referenceDate = new Date('2045-01-15T00:00:00.000Z');
      const config: ComplianceConfig = {
        mode: 'audit',
        referenceDate,
        complianceStartDate: new Date('2025-10-12T00:00:00.000Z'),
      };

      const presence = presenceDays(trips, config);

      // Should have 5000 unique days (starting from Oct 15)
      expect(presence.size).toBe(5000);
    });
  });

  describe('Memory Efficiency', () => {
    it('does not crash with 1 million days of data', () => {
      // This tests that we don't run out of memory
      const trips = generateTrips(1_000_000);

      const referenceDate = new Date('2026-01-15T00:00:00.000Z');
      const config: ComplianceConfig = {
        mode: 'audit',
        referenceDate,
        complianceStartDate: new Date('2000-01-01T00:00:00.000Z'),
      };

      // This should complete without throwing OOM
      const presence = presenceDays(trips, config);
      const daysUsed = daysUsedInWindow(presence, referenceDate, config);

      // Basic sanity checks
      expect(presence.size).toBeGreaterThan(0);
      expect(daysUsed).toBeGreaterThanOrEqual(0);
      expect(daysUsed).toBeLessThanOrEqual(90);
    });
  });
});
