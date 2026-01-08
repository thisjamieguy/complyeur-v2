/**
 * @fileoverview Rolling 180-day window calculations for Schengen compliance.
 *
 * Implements the core EU Regulation 610/2013 rule:
 * "For any day of intended stay, look back at the preceding 180-day period.
 * The total number of days spent in the Schengen Area within that window
 * must not exceed 90."
 *
 * @version 2025-01-07
 * @see EU Regulation 610/2013 (Schengen Borders Code)
 */

import { subDays, isEqual, isAfter, isBefore, isValid } from 'date-fns';
import { normalizeToUTCDate } from './presence-calculator';
import { SCHENGEN_DAY_LIMIT, WINDOW_SIZE_DAYS, DEFAULT_COMPLIANCE_START_DATE } from './constants';
import { InvalidReferenceDateError } from './errors';
import type { ComplianceConfig } from './types';

/**
 * Converts a Date to a string key for comparison with presence set.
 *
 * @param date - Date to convert
 * @returns ISO date string (YYYY-MM-DD)
 */
function dateToKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Checks if a date falls within the 180-day lookback window.
 *
 * The window is defined as:
 * - window_start = refDate - 180 days (INCLUSIVE)
 * - window_end = refDate - 1 day (INCLUSIVE)
 *
 * This creates exactly 180 calendar dates in the window.
 * The reference date itself is NOT included in the lookback.
 *
 * @param date - The date to check
 * @param refDate - The reference date (usually "today" or the entry date being evaluated)
 * @returns true if date is within the 180-day window
 *
 * @example
 * // Reference date: 2025-07-01
 * isInWindow(new Date('2025-01-02'), new Date('2025-07-01')) // true (exactly 180 days ago)
 * isInWindow(new Date('2025-01-01'), new Date('2025-07-01')) // false (181 days ago)
 * isInWindow(new Date('2025-06-30'), new Date('2025-07-01')) // true (yesterday)
 * isInWindow(new Date('2025-07-01'), new Date('2025-07-01')) // false (reference date excluded)
 */
export function isInWindow(date: Date, refDate: Date): boolean {
  // Normalize all dates to UTC midnight for consistent comparison
  const normalizedDate = normalizeToUTCDate(date);
  const normalizedRef = normalizeToUTCDate(refDate);
  const windowStart = normalizeToUTCDate(subDays(normalizedRef, WINDOW_SIZE_DAYS)); // 180 days back
  const windowEnd = normalizeToUTCDate(subDays(normalizedRef, 1)); // Yesterday

  return (
    (isEqual(normalizedDate, windowStart) || isAfter(normalizedDate, windowStart)) &&
    (isEqual(normalizedDate, windowEnd) || isBefore(normalizedDate, windowEnd))
  );
}

/**
 * Counts the number of presence days within the 180-day window.
 *
 * This is the core calculation for Schengen compliance:
 * - Looks back 180 days from the reference date
 * - Counts how many of those days are in the presence set
 * - Does NOT count the reference date itself
 *
 * The compliance start date is respected: days before that date
 * are not counted even if they fall within the 180-day window.
 *
 * @param presence - Set of date keys (YYYY-MM-DD) representing days in Schengen
 * @param refDate - Reference date for the calculation
 * @param config - Optional configuration (compliance start date)
 * @returns Number of days used in the 180-day window
 *
 * @throws InvalidReferenceDateError if refDate is invalid
 *
 * @example
 * const presence = new Set(['2025-06-01', '2025-06-02', '2025-06-03']);
 * const used = daysUsedInWindow(presence, new Date('2025-07-01'));
 * // Returns 3 (all three days are within the window)
 */
export function daysUsedInWindow(
  presence: ReadonlySet<string>,
  refDate: Date,
  config: Partial<ComplianceConfig> = {}
): number {
  // Validate reference date
  if (!refDate || !(refDate instanceof Date) || !isValid(refDate)) {
    throw new InvalidReferenceDateError(refDate, 'Reference date must be a valid Date object');
  }

  const normalizedRef = normalizeToUTCDate(refDate);
  const complianceStartDate = config.complianceStartDate ?? DEFAULT_COMPLIANCE_START_DATE;
  const normalizedComplianceStart = normalizeToUTCDate(complianceStartDate);

  // Calculate window boundaries (normalize to ensure consistent UTC midnight)
  let windowStart = normalizeToUTCDate(subDays(normalizedRef, WINDOW_SIZE_DAYS));
  const windowEnd = normalizeToUTCDate(subDays(normalizedRef, 1));

  // Don't count days before compliance tracking started
  if (isBefore(windowStart, normalizedComplianceStart)) {
    windowStart = normalizedComplianceStart;
  }

  // If window end is before compliance start, no days can be counted
  if (isBefore(windowEnd, normalizedComplianceStart)) {
    return 0;
  }

  // Count presence days within the window
  let count = 0;
  for (const dayKey of presence) {
    const day = new Date(dayKey + 'T00:00:00.000Z');

    // Check if day is within window (inclusive on both ends)
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
 * Calculates the number of days remaining before hitting the 90-day limit.
 *
 * @param presence - Set of date keys representing days in Schengen
 * @param refDate - Reference date for the calculation
 * @param config - Optional configuration (compliance start date, limit)
 * @returns Days remaining (90 - days used). Negative if over limit.
 *
 * @throws InvalidReferenceDateError if refDate is invalid
 *
 * @example
 * // If 45 days used
 * calculateDaysRemaining(presence, refDate) // Returns 45
 *
 * // If 95 days used (over limit)
 * calculateDaysRemaining(presence, refDate) // Returns -5
 */
export function calculateDaysRemaining(
  presence: ReadonlySet<string>,
  refDate: Date,
  config: Partial<ComplianceConfig> = {}
): number {
  const limit = config.limit ?? SCHENGEN_DAY_LIMIT;
  const daysUsed = daysUsedInWindow(presence, refDate, config);
  return limit - daysUsed;
}

/**
 * Determines if an employee is currently compliant (can legally be in Schengen).
 *
 * An employee is compliant if they have used fewer than 90 days in the
 * preceding 180-day window. At exactly 90 days, they are still compliant
 * for that day but cannot stay another day.
 *
 * @param presence - Set of date keys representing days in Schengen
 * @param refDate - Reference date for the calculation
 * @param config - Optional configuration
 * @returns true if compliant (days used <= limit)
 *
 * @example
 * isCompliant(presence, new Date()) // true if 90 or fewer days used
 */
export function isCompliant(
  presence: ReadonlySet<string>,
  refDate: Date,
  config: Partial<ComplianceConfig> = {}
): boolean {
  const limit = config.limit ?? SCHENGEN_DAY_LIMIT;
  const daysUsed = daysUsedInWindow(presence, refDate, config);
  return daysUsed <= limit;
}

/**
 * Determines if an employee can safely enter Schengen on the reference date.
 *
 * Entry is safe if the employee would have 89 or fewer days used AFTER
 * counting the entry day. This means they can stay at least one full day.
 *
 * Note: Entry on a day where you'd have exactly 90 days means you must
 * leave the same day, which is risky. We consider 89 days the safe threshold.
 *
 * @param presence - Set of date keys representing days in Schengen
 * @param refDate - Reference date (intended entry date)
 * @param config - Optional configuration
 * @returns true if safe to enter (would have <= 89 days in window)
 */
export function canSafelyEnter(
  presence: ReadonlySet<string>,
  refDate: Date,
  config: Partial<ComplianceConfig> = {}
): boolean {
  const limit = config.limit ?? SCHENGEN_DAY_LIMIT;
  const daysUsed = daysUsedInWindow(presence, refDate, config);
  // Can enter if <= 89 days used (leaving room for the entry day)
  return daysUsed <= limit - 1;
}

/**
 * Gets the window boundaries for a reference date.
 *
 * Useful for displaying the current calculation window to users.
 *
 * @param refDate - Reference date
 * @param config - Optional configuration (compliance start date)
 * @returns Object with windowStart and windowEnd dates
 */
export function getWindowBounds(
  refDate: Date,
  config: Partial<ComplianceConfig> = {}
): { windowStart: Date; windowEnd: Date } {
  const normalizedRef = normalizeToUTCDate(refDate);
  const complianceStartDate = config.complianceStartDate ?? DEFAULT_COMPLIANCE_START_DATE;
  const normalizedComplianceStart = normalizeToUTCDate(complianceStartDate);

  let windowStart = normalizeToUTCDate(subDays(normalizedRef, WINDOW_SIZE_DAYS));
  const windowEnd = normalizeToUTCDate(subDays(normalizedRef, 1));

  // Respect compliance start date
  if (isBefore(windowStart, normalizedComplianceStart)) {
    windowStart = normalizedComplianceStart;
  }

  return { windowStart, windowEnd };
}
