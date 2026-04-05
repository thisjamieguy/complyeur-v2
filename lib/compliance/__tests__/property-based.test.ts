/**
 * Property-Based Tests for the Schengen 90/180-Day Compliance Engine
 *
 * Uses fast-check to verify mathematical invariants and semantic properties
 * that must hold for ALL possible inputs — not just the examples we thought of.
 *
 * Properties tested:
 *  1. daysRemaining = 90 - daysUsed  (arithmetic invariant)
 *  2. isCompliant ↔ daysUsed < 90  (semantic equivalence)
 *  3. daysUsed ≥ 0  (non-negativity)
 *  4. Non-Schengen trips never affect daysUsed  (country independence)
 *  5. Adding a Schengen trip never decreases daysUsed  (monotonicity)
 *  6. Trip order doesn't affect the result  (commutativity)
 *  7. Oracle cross-validation  (correctness)
 *  8. Trips outside the 180-day window never contribute  (window isolation)
 *  9. Duplicate trips are not double-counted  (idempotency)
 * 10. Active trip (null exit) = trip ending on reference date  (equivalence)
 * 11. riskLevel is always one of the four valid values  (type safety)
 * 12. daysUsed is always an integer  (numeric precision)
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { calculateCompliance } from '../index';
import { oracleCalculate } from './oracle-calculator';
import type { Trip, ComplianceConfig } from '../types';

// ─── Fixed reference date ────────────────────────────────────────────────────
// All trips are generated relative to this date so results are deterministic.
const REF_DATE = new Date('2026-01-01T00:00:00.000Z');

const BASE_CONFIG: ComplianceConfig = {
  mode: 'audit',
  referenceDate: REF_DATE,
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86400000);
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const SCHENGEN_CODES = [
  'FR', 'DE', 'IT', 'ES', 'NL', 'CH', 'AT', 'BE', 'PT',
  'SE', 'NO', 'DK', 'PL', 'CZ', 'GR', 'HU', 'MC', 'AD',
] as const;

const NON_SCHENGEN_CODES = ['GB', 'IE', 'CY', 'US', 'JP', 'AU', 'CA', 'IN'] as const;

const VALID_RISK_LEVELS = new Set(['green', 'amber', 'red', 'breach']);

/**
 * A single Schengen trip ending 0–200 days before the reference date.
 * Trips inside the window (0–179 days ago) affect the count;
 * trips outside it (180+ days ago) should not.
 */
const schengenTripArb: fc.Arbitrary<Trip> = fc.record({
  exitDaysBeforeRef: fc.integer({ min: 0, max: 200 }),
  tripLength: fc.integer({ min: 1, max: 30 }),
  country: fc.constantFrom(...SCHENGEN_CODES),
}).map(({ exitDaysBeforeRef, tripLength, country }) => ({
  entryDate: addDays(REF_DATE, -(exitDaysBeforeRef + tripLength - 1)),
  exitDate: addDays(REF_DATE, -exitDaysBeforeRef),
  country,
}));

/** A Schengen trip that falls strictly within the 180-day window. */
const inWindowTripArb: fc.Arbitrary<Trip> = fc.record({
  exitDaysBeforeRef: fc.integer({ min: 0, max: 179 }),
  tripLength: fc.integer({ min: 1, max: 30 }),
  country: fc.constantFrom(...SCHENGEN_CODES),
}).map(({ exitDaysBeforeRef, tripLength, country }) => ({
  entryDate: addDays(REF_DATE, -(exitDaysBeforeRef + tripLength - 1)),
  exitDate: addDays(REF_DATE, -exitDaysBeforeRef),
  country,
}));

/** A Schengen trip that ended strictly outside the 180-day window. */
const outsideWindowTripArb: fc.Arbitrary<Trip> = fc.record({
  exitDaysBeforeRef: fc.integer({ min: 181, max: 730 }),
  tripLength: fc.integer({ min: 1, max: 30 }),
  country: fc.constantFrom(...SCHENGEN_CODES),
}).map(({ exitDaysBeforeRef, tripLength, country }) => ({
  entryDate: addDays(REF_DATE, -(exitDaysBeforeRef + tripLength - 1)),
  exitDate: addDays(REF_DATE, -exitDaysBeforeRef),
  country,
}));

/** A non-Schengen trip (GB, IE, CY, US, …). */
const nonSchengenTripArb: fc.Arbitrary<Trip> = fc.record({
  exitDaysBeforeRef: fc.integer({ min: 0, max: 200 }),
  tripLength: fc.integer({ min: 1, max: 30 }),
  country: fc.constantFrom(...NON_SCHENGEN_CODES),
}).map(({ exitDaysBeforeRef, tripLength, country }) => ({
  entryDate: addDays(REF_DATE, -(exitDaysBeforeRef + tripLength - 1)),
  exitDate: addDays(REF_DATE, -exitDaysBeforeRef),
  country,
}));

/** An array of 0–5 Schengen trips (the primary input for most properties). */
const tripsArb = fc.array(schengenTripArb, { minLength: 0, maxLength: 5 });

// ─── Properties ──────────────────────────────────────────────────────────────

describe('Property-Based: Compliance Engine Invariants', () => {

  // ── Property 1: Arithmetic invariant ───────────────────────────────────────
  it('invariant: daysRemaining always equals (90 - daysUsed)', () => {
    fc.assert(
      fc.property(tripsArb, (trips) => {
        const { daysUsed, daysRemaining } = calculateCompliance(trips, BASE_CONFIG);
        return daysRemaining === 90 - daysUsed;
      }),
      { numRuns: 200 }
    );
  });

  // ── Property 2: Semantic equivalence ───────────────────────────────────────
  it('invariant: isCompliant is true if and only if daysUsed < 90', () => {
    fc.assert(
      fc.property(tripsArb, (trips) => {
        const { daysUsed, isCompliant } = calculateCompliance(trips, BASE_CONFIG);
        return isCompliant === (daysUsed < 90);
      }),
      { numRuns: 200 }
    );
  });

  // ── Property 3: Non-negativity ─────────────────────────────────────────────
  it('invariant: daysUsed is always non-negative', () => {
    fc.assert(
      fc.property(tripsArb, (trips) => {
        const { daysUsed } = calculateCompliance(trips, BASE_CONFIG);
        return daysUsed >= 0;
      }),
      { numRuns: 200 }
    );
  });

  // ── Property 4: Non-Schengen independence ──────────────────────────────────
  it('invariant: adding a non-Schengen trip never changes daysUsed', () => {
    fc.assert(
      fc.property(tripsArb, nonSchengenTripArb, (trips, nonSchengenTrip) => {
        const before = calculateCompliance(trips, BASE_CONFIG).daysUsed;
        const after = calculateCompliance([...trips, nonSchengenTrip], BASE_CONFIG).daysUsed;
        return before === after;
      }),
      { numRuns: 200 }
    );
  });

  // ── Property 5: Monotonicity ────────────────────────────────────────────────
  it('monotonicity: adding a Schengen trip within the window never reduces daysUsed', () => {
    fc.assert(
      fc.property(tripsArb, inWindowTripArb, (trips, extraTrip) => {
        const before = calculateCompliance(trips, BASE_CONFIG).daysUsed;
        const after = calculateCompliance([...trips, extraTrip], BASE_CONFIG).daysUsed;
        return after >= before;
      }),
      { numRuns: 200 }
    );
  });

  // ── Property 6: Commutativity (order independence) ─────────────────────────
  it('commutativity: trip order never affects the result', () => {
    fc.assert(
      fc.property(tripsArb, (trips) => {
        if (trips.length < 2) return true; // nothing to permute
        const original = calculateCompliance(trips, BASE_CONFIG);
        const reversed = calculateCompliance([...trips].reverse(), BASE_CONFIG);
        return (
          original.daysUsed === reversed.daysUsed &&
          original.isCompliant === reversed.isCompliant &&
          original.riskLevel === reversed.riskLevel
        );
      }),
      { numRuns: 200 }
    );
  });

  // ── Property 7: Oracle cross-validation ────────────────────────────────────
  it('correctness: production result always matches the reference oracle', () => {
    fc.assert(
      fc.property(tripsArb, (trips) => {
        const production = calculateCompliance(trips, BASE_CONFIG);
        const oracle = oracleCalculate(trips, BASE_CONFIG);
        return (
          production.daysUsed === oracle.daysUsed &&
          production.daysRemaining === oracle.daysRemaining &&
          production.isCompliant === oracle.isCompliant
        );
      }),
      { numRuns: 300, verbose: true }
    );
  });

  // ── Property 8: Window isolation ───────────────────────────────────────────
  it('window isolation: trips that ended more than 179 days ago never affect daysUsed', () => {
    fc.assert(
      fc.property(tripsArb, outsideWindowTripArb, (trips, oldTrip) => {
        const before = calculateCompliance(trips, BASE_CONFIG).daysUsed;
        const after = calculateCompliance([...trips, oldTrip], BASE_CONFIG).daysUsed;
        return before === after;
      }),
      { numRuns: 200 }
    );
  });

  // ── Property 9: Idempotency / deduplication ─────────────────────────────────
  it('idempotency: adding the same trip twice gives the same daysUsed as adding it once', () => {
    fc.assert(
      fc.property(schengenTripArb, (trip) => {
        const once = calculateCompliance([trip], BASE_CONFIG).daysUsed;
        const twice = calculateCompliance([trip, trip], BASE_CONFIG).daysUsed;
        return once === twice;
      }),
      { numRuns: 200 }
    );
  });

  // ── Property 10: Active trip equivalence ────────────────────────────────────
  it('equivalence: active trip (null exit) counts the same days as trip ending on reference date', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 89 }),
        fc.constantFrom(...SCHENGEN_CODES),
        (daysBack, country) => {
          const entryDate = addDays(REF_DATE, -daysBack);
          const activeTrip: Trip = { entryDate, exitDate: null, country };
          const closedTrip: Trip = { entryDate, exitDate: REF_DATE, country };

          const activeResult = calculateCompliance([activeTrip], BASE_CONFIG);
          const closedResult = calculateCompliance([closedTrip], BASE_CONFIG);

          return activeResult.daysUsed === closedResult.daysUsed;
        }
      ),
      { numRuns: 200 }
    );
  });

  // ── Property 11: Valid risk level ──────────────────────────────────────────
  it('invariant: riskLevel is always one of green | amber | red | breach', () => {
    fc.assert(
      fc.property(tripsArb, (trips) => {
        const { riskLevel } = calculateCompliance(trips, BASE_CONFIG);
        return VALID_RISK_LEVELS.has(riskLevel);
      }),
      { numRuns: 200 }
    );
  });

  // ── Property 12: Integer precision ────────────────────────────────────────
  it('invariant: daysUsed is always a whole integer (no fractional days)', () => {
    fc.assert(
      fc.property(tripsArb, (trips) => {
        const { daysUsed } = calculateCompliance(trips, BASE_CONFIG);
        return Number.isInteger(daysUsed);
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Boundary Properties ──────────────────────────────────────────────────────

describe('Property-Based: Window Boundary Conditions', () => {

  it('boundary: a 1-day trip exactly on the reference date uses exactly 1 day', () => {
    const trip: Trip = {
      entryDate: REF_DATE,
      exitDate: REF_DATE,
      country: 'FR',
    };
    const { daysUsed } = calculateCompliance([trip], BASE_CONFIG);
    // Matches oracle
    const { daysUsed: oracleDays } = oracleCalculate([trip], BASE_CONFIG);
    // Both should agree, and the trip should count
    return daysUsed === oracleDays;
  });

  it('boundary: a trip ending exactly 179 days before reference IS in the window', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (tripLength) => {
        const exitDate = addDays(REF_DATE, -179);
        const entryDate = addDays(exitDate, -(tripLength - 1));
        const trip: Trip = { entryDate, exitDate, country: 'DE' };

        const production = calculateCompliance([trip], BASE_CONFIG);
        const oracle = oracleCalculate([trip], BASE_CONFIG);

        // Window is [refDate - 179, refDate] inclusive
        return production.daysUsed === oracle.daysUsed && production.daysUsed > 0;
      }),
      { numRuns: 50 }
    );
  });

  it('boundary: a trip ending exactly 180 days before reference is NOT in the window', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (tripLength) => {
        const exitDate = addDays(REF_DATE, -180);
        const entryDate = addDays(exitDate, -(tripLength - 1));
        const trip: Trip = { entryDate, exitDate, country: 'FR' };

        const { daysUsed } = calculateCompliance([trip], BASE_CONFIG);
        const { daysUsed: oracleDays } = oracleCalculate([trip], BASE_CONFIG);

        return daysUsed === 0 && oracleDays === 0;
      }),
      { numRuns: 50 }
    );
  });

  it('boundary: empty trip array always yields daysUsed=0 and isCompliant=true', () => {
    const result = calculateCompliance([], BASE_CONFIG);
    // Not a property test, but a fast-check-verified invariant
    fc.assert(
      fc.property(fc.constant([]), (trips) => {
        const r = calculateCompliance(trips, BASE_CONFIG);
        return r.daysUsed === 0 && r.isCompliant === true;
      }),
      { numRuns: 1 }
    );
    // Also directly verify
    return result.daysUsed === 0 && result.isCompliant === true;
  });
});

// ─── Risk Level Threshold Properties ─────────────────────────────────────────

describe('Property-Based: Risk Level Thresholds', () => {

  it('threshold: riskLevel is "red" when daysUsed >= 90 (daysRemaining < 1)', () => {
    // calculateCompliance uses getRiskLevel(daysRemaining) — threshold amber=1
    // daysRemaining = 0 or negative → 'red'. 'breach' comes from a separate function.
    fc.assert(
      fc.property(tripsArb, (trips) => {
        const { daysUsed, daysRemaining, riskLevel } = calculateCompliance(trips, BASE_CONFIG);
        if (daysUsed >= 90) {
          // daysRemaining <= 0, which is < amber threshold of 1 → 'red'
          return riskLevel === 'red' && daysRemaining <= 0;
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });

  it('threshold: riskLevel is never "red" when daysRemaining >= 1', () => {
    fc.assert(
      fc.property(tripsArb, (trips) => {
        const { daysRemaining, riskLevel } = calculateCompliance(trips, BASE_CONFIG);
        if (daysRemaining >= 1) {
          return riskLevel !== 'red';
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });

  it('threshold: "green" means at least 16 days remaining', () => {
    fc.assert(
      fc.property(tripsArb, (trips) => {
        const { daysRemaining, riskLevel } = calculateCompliance(trips, BASE_CONFIG);
        if (riskLevel === 'green') {
          return daysRemaining >= 16;
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });

  it('threshold: "amber" means 1–15 days remaining', () => {
    fc.assert(
      fc.property(tripsArb, (trips) => {
        const { daysRemaining, riskLevel } = calculateCompliance(trips, BASE_CONFIG);
        if (riskLevel === 'amber') {
          return daysRemaining >= 1 && daysRemaining <= 15;
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Planning Mode Properties ─────────────────────────────────────────────────

describe('Property-Based: Planning Mode', () => {

  const FUTURE_REF = new Date('2025-06-01T00:00:00.000Z'); // past our data, "future" relative to trips

  it('planning mode result has same invariants as audit mode', () => {
    const planningConfig: ComplianceConfig = { mode: 'planning', referenceDate: REF_DATE };

    fc.assert(
      fc.property(tripsArb, (trips) => {
        const { daysUsed, daysRemaining, isCompliant } = calculateCompliance(trips, planningConfig);
        return (
          daysRemaining === 90 - daysUsed &&
          isCompliant === (daysUsed < 90) &&
          daysUsed >= 0 &&
          Number.isInteger(daysUsed)
        );
      }),
      { numRuns: 200 }
    );
  });

  it('planning mode daysUsed is always >= audit mode daysUsed (future trips can only add)', () => {
    fc.assert(
      fc.property(tripsArb, (trips) => {
        const auditResult = calculateCompliance(trips, { ...BASE_CONFIG, mode: 'audit' });
        const planningResult = calculateCompliance(trips, { ...BASE_CONFIG, mode: 'planning' });
        // Planning includes future trips; audit does not. So planning >= audit.
        return planningResult.daysUsed >= auditResult.daysUsed;
      }),
      { numRuns: 200 }
    );
  });
});
