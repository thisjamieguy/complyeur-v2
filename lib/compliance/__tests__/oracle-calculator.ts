/**
 * @fileoverview Oracle (Reference) Implementation for Schengen Compliance
 *
 * This is a deliberately simple, easy-to-verify implementation of the
 * 90/180-day rule. It prioritizes correctness and readability over performance.
 *
 * Use this to validate the production implementation. If the oracle and
 * production implementations disagree, investigate both before trusting either.
 *
 * This implementation directly mirrors the Python reference from rolling90.py.
 *
 * @version 2025-01-07
 */

import { addDays, subDays, isBefore, isAfter, isEqual, differenceInDays } from 'date-fns';

// ============================================================================
// Types (minimal, self-contained)
// ============================================================================

export interface OracleTrip {
  entryDate: Date;
  exitDate: Date | null;
  country: string;
}

export interface OracleConfig {
  mode: 'audit' | 'planning';
  referenceDate: Date;
  complianceStartDate?: Date;
  limit?: number;
}

export interface OracleResult {
  daysUsed: number;
  daysRemaining: number;
  isCompliant: boolean;
  riskLevel: 'green' | 'amber' | 'red';
}

// ============================================================================
// Constants (hardcoded for simplicity)
// ============================================================================

const DEFAULT_COMPLIANCE_START = new Date('2025-10-12');
const DEFAULT_LIMIT = 90;
const WINDOW_SIZE = 180;

// Hardcoded Schengen countries (simple array for clarity)
const SCHENGEN_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE',
  'GR', 'HU', 'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL',
  'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH',
  // Microstates
  'MC', 'VA', 'SM', 'AD',
];

const EXCLUDED_CODES = ['IE', 'CY', 'GB'];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize date to midnight UTC (strips time component).
 * Uses UTC methods to avoid local timezone issues.
 */
function normalizeDate(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
}

/**
 * Convert date to YYYY-MM-DD string key.
 */
function dateToKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Simple Schengen check - uses hardcoded list.
 */
function oracleIsSchengen(country: string): boolean {
  if (!country) return false;
  const code = country.trim().toUpperCase();

  // Explicit exclusions
  if (EXCLUDED_CODES.includes(code)) return false;

  // Check codes
  if (SCHENGEN_CODES.includes(code)) return true;

  return false;
}

// ============================================================================
// Core Oracle Functions
// ============================================================================

/**
 * Oracle implementation of presenceDays.
 *
 * Iterates day-by-day (slow but correct).
 */
export function oraclePresenceDays(
  trips: readonly OracleTrip[],
  config: OracleConfig
): Set<string> {
  const complianceStart = config.complianceStartDate ?? DEFAULT_COMPLIANCE_START;
  const normalizedComplianceStart = normalizeDate(complianceStart);
  const normalizedRef = normalizeDate(config.referenceDate);

  const days = new Set<string>();

  for (const trip of trips) {
    // Skip non-Schengen
    if (!oracleIsSchengen(trip.country)) {
      continue;
    }

    const normalizedEntry = normalizeDate(trip.entryDate);
    // For active trips (null exitDate), use reference date
    const normalizedExit = trip.exitDate
      ? normalizeDate(trip.exitDate)
      : normalizedRef;

    // Skip if trip ends before compliance start
    if (isBefore(normalizedExit, normalizedComplianceStart)) {
      continue;
    }

    // In audit mode, skip future trips
    if (config.mode === 'audit' && isAfter(normalizedEntry, normalizedRef)) {
      continue;
    }

    // Iterate day by day (simple and correct)
    let current = normalizedEntry;

    // Start from compliance start if entry is before it
    if (isBefore(current, normalizedComplianceStart)) {
      current = normalizedComplianceStart;
    }

    // In audit mode, don't count days after reference date
    let end = normalizedExit;
    if (config.mode === 'audit' && isAfter(normalizedExit, normalizedRef)) {
      end = normalizedRef;
    }

    // Normalize end for consistent comparison
    const normalizedEnd = normalizeDate(end);
    let normalizedCurrent = normalizeDate(current);

    while (normalizedCurrent.getTime() <= normalizedEnd.getTime()) {
      days.add(dateToKey(normalizedCurrent));
      // Add 1 day using UTC arithmetic
      normalizedCurrent = new Date(normalizedCurrent.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  return days;
}

/**
 * Oracle implementation of daysUsedInWindow.
 *
 * Counts presence days in [refDate - 180, refDate - 1].
 */
export function oracleDaysUsedInWindow(
  presence: ReadonlySet<string>,
  refDate: Date,
  config: Partial<OracleConfig> = {}
): number {
  const complianceStart = config.complianceStartDate ?? DEFAULT_COMPLIANCE_START;
  const normalizedRef = normalizeDate(refDate);
  const normalizedComplianceStart = normalizeDate(complianceStart);

  // Window boundaries
  let windowStart = subDays(normalizedRef, WINDOW_SIZE);
  const windowEnd = subDays(normalizedRef, 1);

  // Respect compliance start
  if (isBefore(windowStart, normalizedComplianceStart)) {
    windowStart = normalizedComplianceStart;
  }

  // Count days in window
  let count = 0;
  for (const dayKey of presence) {
    const day = new Date(dayKey + 'T00:00:00.000Z');

    if (
      (isEqual(day, windowStart) || isAfter(day, windowStart)) &&
      (isEqual(day, windowEnd) || isBefore(day, windowEnd))
    ) {
      count++;
    }
  }

  return count;
}

/**
 * Oracle implementation of calculateDaysRemaining.
 */
export function oracleDaysRemaining(
  presence: ReadonlySet<string>,
  refDate: Date,
  config: Partial<OracleConfig> = {}
): number {
  const limit = config.limit ?? DEFAULT_LIMIT;
  const used = oracleDaysUsedInWindow(presence, refDate, config);
  return limit - used;
}

/**
 * Oracle implementation of getRiskLevel.
 * Matches production thresholds: warning at 75+ days used (15 or fewer remaining).
 */
export function oracleRiskLevel(daysRemaining: number): 'green' | 'amber' | 'red' {
  if (daysRemaining >= 16) return 'green';  // 0-74 days used
  if (daysRemaining >= 1) return 'amber';   // 75-89 days used
  return 'red';                              // 90+ days used (violation)
}

/**
 * Oracle implementation of earliestSafeEntry.
 */
export function oracleEarliestSafeEntry(
  presence: ReadonlySet<string>,
  today: Date,
  config: Partial<OracleConfig> = {}
): Date | null {
  const limit = config.limit ?? DEFAULT_LIMIT;
  const normalizedToday = normalizeDate(today);

  // Check if already eligible
  const currentUsed = oracleDaysUsedInWindow(presence, normalizedToday, config);
  if (currentUsed <= limit - 1) {
    return null; // Already eligible
  }

  // Search forward
  for (let daysAhead = 1; daysAhead <= WINDOW_SIZE; daysAhead++) {
    const checkDate = addDays(normalizedToday, daysAhead);
    const used = oracleDaysUsedInWindow(presence, checkDate, config);
    if (used <= limit - 1) {
      return checkDate;
    }
  }

  return null;
}

/**
 * Oracle comprehensive calculation.
 */
export function oracleCalculate(
  trips: readonly OracleTrip[],
  config: OracleConfig
): OracleResult {
  const limit = config.limit ?? DEFAULT_LIMIT;
  const presence = oraclePresenceDays(trips, config);
  const daysUsed = oracleDaysUsedInWindow(presence, config.referenceDate, config);
  const daysRemaining = limit - daysUsed;

  return {
    daysUsed,
    daysRemaining,
    isCompliant: daysUsed < limit,  // 90 days = violation, 89 or fewer = compliant
    riskLevel: oracleRiskLevel(daysRemaining),
  };
}

// ============================================================================
// Validation Helper
// ============================================================================

/**
 * Compare production result with oracle result.
 * Throws if they disagree.
 */
export function validateAgainstOracle(
  productionResult: {
    daysUsed: number;
    daysRemaining: number;
    riskLevel: string;
  },
  oracleResult: OracleResult,
  context: string = ''
): void {
  const prefix = context ? `[${context}] ` : '';

  if (productionResult.daysUsed !== oracleResult.daysUsed) {
    throw new Error(
      `${prefix}daysUsed mismatch: production=${productionResult.daysUsed}, oracle=${oracleResult.daysUsed}`
    );
  }

  if (productionResult.daysRemaining !== oracleResult.daysRemaining) {
    throw new Error(
      `${prefix}daysRemaining mismatch: production=${productionResult.daysRemaining}, oracle=${oracleResult.daysRemaining}`
    );
  }

  if (productionResult.riskLevel !== oracleResult.riskLevel) {
    throw new Error(
      `${prefix}riskLevel mismatch: production=${productionResult.riskLevel}, oracle=${oracleResult.riskLevel}`
    );
  }
}
