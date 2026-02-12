/**
 * @fileoverview Safe entry date calculations for Schengen compliance.
 *
 * Calculates when an employee can safely re-enter the Schengen Area
 * after approaching or exceeding the 90-day limit.
 *
 * @version 2025-01-07
 * @see EU Regulation 610/2013 (Schengen Borders Code)
 */

import { isValid } from 'date-fns';
import { normalizeToUTCDate } from './presence-calculator';
import { daysUsedInWindow, canSafelyEnter } from './window-calculator';
import { SCHENGEN_DAY_LIMIT, WINDOW_SIZE_DAYS, DEFAULT_COMPLIANCE_START_DATE } from './constants';
import { InvalidReferenceDateError } from './errors';
import { addUtcDays, differenceInUtcDays } from './date-utils';
import type { ComplianceConfig, SafeEntryResult } from './types';

/**
 * Finds the earliest date when an employee can safely enter Schengen.
 *
 * "Safe entry" means having 89 or fewer days used in the preceding
 * 180-day window. This leaves room for at least one full day of stay.
 *
 * The algorithm:
 * 1. Check if already eligible today
 * 2. If not, search forward day by day
 * 3. Days "expire" from the window as we move forward in time
 *
 * @param presence - Set of date keys representing days in Schengen
 * @param today - Current date (reference point)
 * @param config - Optional configuration
 * @returns The earliest safe entry date, or null if already eligible
 *
 * @throws InvalidReferenceDateError if today is invalid
 *
 * @example
 * // If at 89 days, already eligible
 * earliestSafeEntry(presence, today) // null
 *
 * // If at 95 days, returns future date when old days expire
 * earliestSafeEntry(presence, today) // Date when days fall below 90
 */
export function earliestSafeEntry(
  presence: ReadonlySet<string>,
  today: Date,
  config: Partial<ComplianceConfig> = {}
): Date | null {
  // Validate today
  if (!today || !(today instanceof Date) || !isValid(today)) {
    throw new InvalidReferenceDateError(today, 'Today must be a valid Date object');
  }

  const normalizedToday = normalizeToUTCDate(today);
  const limit = config.limit ?? SCHENGEN_DAY_LIMIT;

  // Check if already eligible today
  if (canSafelyEnter(presence, normalizedToday, config)) {
    return null; // Already eligible
  }

  // Search forward up to 180 days (after which all current days would have expired)
  for (let daysAhead = 1; daysAhead <= WINDOW_SIZE_DAYS; daysAhead++) {
    const checkDate = addUtcDays(normalizedToday, daysAhead);
    const daysUsed = daysUsedInWindow(presence, checkDate, config);

    // Can enter if <= limit - 1 days used (leaving room for entry day)
    if (daysUsed <= limit - 1) {
      return checkDate;
    }
  }

  // This shouldn't happen in practice - after 180 days, all current
  // presence days would have fallen out of the window
  return null;
}

/**
 * Calculates how many days until the employee becomes compliant.
 *
 * @param presence - Set of date keys representing days in Schengen
 * @param today - Current date (reference point)
 * @param config - Optional configuration
 * @returns Number of days until compliant (0 if already compliant)
 *
 * @throws InvalidReferenceDateError if today is invalid
 *
 * @example
 * // If already compliant
 * daysUntilCompliant(presence, today) // 0
 *
 * // If over limit
 * daysUntilCompliant(presence, today) // Number of days to wait
 */
export function daysUntilCompliant(
  presence: ReadonlySet<string>,
  today: Date,
  config: Partial<ComplianceConfig> = {}
): number {
  const safeDate = earliestSafeEntry(presence, today, config);

  if (safeDate === null) {
    return 0; // Already compliant
  }

  const normalizedToday = normalizeToUTCDate(today);
  return differenceInUtcDays(safeDate, normalizedToday);
}

/**
 * Gets comprehensive safe entry information.
 *
 * Returns a complete picture of when entry is possible and what
 * the compliance status will be at that time.
 *
 * @param presence - Set of date keys representing days in Schengen
 * @param today - Current date (reference point)
 * @param config - Optional configuration
 * @returns SafeEntryResult with all relevant information
 *
 * @throws InvalidReferenceDateError if today is invalid
 *
 * @example
 * const result = getSafeEntryInfo(presence, today);
 * // {
 * //   canEnterToday: false,
 * //   earliestSafeDate: Date('2025-02-15'),
 * //   daysUntilCompliant: 14,
 * //   daysUsedOnEntry: 89
 * // }
 */
export function getSafeEntryInfo(
  presence: ReadonlySet<string>,
  today: Date,
  config: Partial<ComplianceConfig> = {}
): SafeEntryResult {
  // Validate today
  if (!today || !(today instanceof Date) || !isValid(today)) {
    throw new InvalidReferenceDateError(today, 'Today must be a valid Date object');
  }

  const normalizedToday = normalizeToUTCDate(today);
  const limit = config.limit ?? SCHENGEN_DAY_LIMIT;

  // Check current status
  const currentDaysUsed = daysUsedInWindow(presence, normalizedToday, config);
  const canEnterToday = currentDaysUsed <= limit - 1;

  if (canEnterToday) {
    return {
      canEnterToday: true,
      earliestSafeDate: null,
      daysUntilCompliant: 0,
      daysUsedOnEntry: currentDaysUsed,
    };
  }

  // Find earliest safe entry date
  const safeDate = earliestSafeEntry(presence, normalizedToday, config);
  const daysToWait = safeDate ? differenceInUtcDays(safeDate, normalizedToday) : 0;
  const daysUsedOnEntry = safeDate
    ? daysUsedInWindow(presence, safeDate, config)
    : currentDaysUsed;

  return {
    canEnterToday: false,
    earliestSafeDate: safeDate,
    daysUntilCompliant: daysToWait,
    daysUsedOnEntry,
  };
}

/**
 * Projects which days will "expire" (fall out of the 180-day window) over time.
 *
 * This is useful for showing users when their compliance situation will improve.
 *
 * @param presence - Set of date keys representing days in Schengen
 * @param fromDate - Start date for projection
 * @param days - Number of days to project forward
 * @param config - Optional configuration
 * @returns Array of { date, expiringDays } objects
 */
export function projectExpiringDays(
  presence: ReadonlySet<string>,
  fromDate: Date,
  days: number,
  config: Partial<ComplianceConfig> = {}
): Array<{ date: Date; expiringDays: number; daysUsed: number; daysRemaining: number }> {
  const normalizedFrom = normalizeToUTCDate(fromDate);
  const limit = config.limit ?? SCHENGEN_DAY_LIMIT;
  const result: Array<{ date: Date; expiringDays: number; daysUsed: number; daysRemaining: number }> = [];

  let previousDaysUsed = daysUsedInWindow(presence, normalizedFrom, config);

  for (let i = 0; i <= days; i++) {
    const checkDate = addUtcDays(normalizedFrom, i);
    const daysUsed = daysUsedInWindow(presence, checkDate, config);
    const expiringDays = i === 0 ? 0 : Math.max(0, previousDaysUsed - daysUsed);

    result.push({
      date: checkDate,
      expiringDays,
      daysUsed,
      daysRemaining: limit - daysUsed,
    });

    previousDaysUsed = daysUsed;
  }

  return result;
}

/**
 * Calculates how many days an employee can stay starting from a given entry date.
 *
 * This looks at the current window and determines the maximum consecutive
 * days of stay before hitting the 90-day limit.
 *
 * @param presence - Set of date keys representing days in Schengen
 * @param entryDate - Proposed entry date
 * @param config - Optional configuration
 * @returns Maximum days of stay (0 if cannot enter)
 */
export function maxStayDays(
  presence: ReadonlySet<string>,
  entryDate: Date,
  config: Partial<ComplianceConfig> = {}
): number {
  const normalizedEntry = normalizeToUTCDate(entryDate);
  const limit = config.limit ?? SCHENGEN_DAY_LIMIT;

  // Check if entry is even possible
  if (!canSafelyEnter(presence, normalizedEntry, config)) {
    return 0;
  }

  // Get current days used in window (looking back from entry date)
  const daysUsed = daysUsedInWindow(presence, normalizedEntry, config);

  // Maximum additional days = limit - days already used
  // Entry day counts as day 1, so we can stay for (limit - daysUsed) days
  return limit - daysUsed;
}
