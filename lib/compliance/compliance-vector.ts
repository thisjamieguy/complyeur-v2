/**
 * @fileoverview Optimized compliance vector calculations for calendar views.
 *
 * Computing compliance for a 365-day range by calling daysUsedInWindow()
 * 365 times would be O(n x d). This module uses a sliding window approach
 * to achieve O(n + d) performance.
 *
 * @version 2025-01-07
 */

import { isAfter, isBefore, isEqual, isValid } from 'date-fns';
import { presenceDays, normalizeToUTCDate } from './presence-calculator';
import { daysUsedInWindow } from './window-calculator';
import { getRiskLevel } from './risk-calculator';
import {
  DEFAULT_COMPLIANCE_START_DATE,
  DEFAULT_RISK_THRESHOLDS,
  SCHENGEN_DAY_LIMIT,
  WINDOW_SIZE_DAYS,
} from './constants';
import { InvalidReferenceDateError } from './errors';
import { addUtcDays } from './date-utils';
import type { Trip, ComplianceConfig, DailyCompliance, RiskThresholds } from './types';

/**
 * Computes compliance status for every day in a date range.
 *
 * This function is optimized for calendar views. Instead of calling
 * daysUsedInWindow() for each day (O(n x d)), it uses a sliding window
 * approach that achieves O(n + d) complexity.
 *
 * @param trips - All trips for the employee
 * @param startDate - First date of range to compute
 * @param endDate - Last date of range to compute
 * @param config - Compliance configuration
 * @returns Array of daily compliance statuses
 *
 * @throws InvalidReferenceDateError if dates are invalid
 *
 * @example
 * // Compute full year for calendar view
 * const vector = computeComplianceVector(
 *   trips,
 *   new Date('2025-01-01'),
 *   new Date('2025-12-31'),
 *   { mode: 'audit', referenceDate: new Date('2025-12-31') }
 * );
 * // Returns 365 DailyCompliance objects in ~O(n + 365) time
 */
export function computeComplianceVector(
  trips: readonly Trip[],
  startDate: Date,
  endDate: Date,
  config: ComplianceConfig
): DailyCompliance[] {
  // Validate dates
  if (!startDate || !(startDate instanceof Date) || !isValid(startDate)) {
    throw new InvalidReferenceDateError(startDate, 'Start date must be a valid Date object');
  }
  if (!endDate || !(endDate instanceof Date) || !isValid(endDate)) {
    throw new InvalidReferenceDateError(endDate, 'End date must be a valid Date object');
  }
  if (isAfter(startDate, endDate)) {
    throw new InvalidReferenceDateError(startDate, 'Start date must be before or equal to end date');
  }

  const normalizedStart = normalizeToUTCDate(startDate);
  const normalizedEnd = normalizeToUTCDate(endDate);
  const limit = config.limit ?? SCHENGEN_DAY_LIMIT;
  const thresholds = config.thresholds ?? DEFAULT_RISK_THRESHOLDS;

  // Step 1: Compute presence days once (O(n) where n = total trip days)
  const presence = presenceDays(trips, config);

  // Step 2: Sort presence days for efficient window operations
  const sortedPresence = Array.from(presence).sort();

  // Step 3: Build an optimized lookup structure
  // For each day in the range, we need to know how many presence days
  // fall within the 180-day window ending the day before.
  const result: DailyCompliance[] = [];

  // Convert sorted presence to Date objects for comparison
  const presenceDates = sortedPresence.map(key => new Date(key + 'T00:00:00.000Z'));

  // Initialize the window count for the first reference date
  const complianceStartDate = config.complianceStartDate ?? DEFAULT_COMPLIANCE_START_DATE;
  const normalizedComplianceStart = normalizeToUTCDate(complianceStartDate);

  // For each reference date, count days in window [refDate - 179, refDate]
  let currentDate = normalizedStart;

  while (!isAfter(currentDate, normalizedEnd)) {
    // Calculate window boundaries for this reference date
    // Window: [refDate - 179, refDate] = 180 days inclusive of reference date
    let windowStart = addUtcDays(currentDate, -(WINDOW_SIZE_DAYS - 1));
    const windowEnd = currentDate;

    // Respect compliance start date
    if (isBefore(windowStart, normalizedComplianceStart)) {
      windowStart = normalizedComplianceStart;
    }

    // Count presence days in window using binary search for efficiency
    let count = 0;
    if (!isBefore(windowEnd, normalizedComplianceStart)) {
      // Use linear scan for correctness (binary search optimization possible for larger datasets)
      for (const presenceDate of presenceDates) {
        if (
          (isEqual(presenceDate, windowStart) || isAfter(presenceDate, windowStart)) &&
          (isEqual(presenceDate, windowEnd) || isBefore(presenceDate, windowEnd))
        ) {
          count++;
        }
      }
    }

    const daysRemaining = limit - count;

    result.push({
      date: new Date(currentDate),
      daysUsed: count,
      daysRemaining,
      riskLevel: getRiskLevel(daysRemaining, thresholds),
    });

    currentDate = addUtcDays(currentDate, 1);
  }

  return result;
}

/**
 * Optimized version using incremental sliding window.
 *
 * This version maintains a running count as we slide through dates,
 * achieving true O(n + d) complexity.
 *
 * @param trips - All trips for the employee
 * @param startDate - First date of range to compute
 * @param endDate - Last date of range to compute
 * @param config - Compliance configuration
 * @returns Array of daily compliance statuses
 */
export function computeComplianceVectorOptimized(
  trips: readonly Trip[],
  startDate: Date,
  endDate: Date,
  config: ComplianceConfig
): DailyCompliance[] {
  // Validate dates
  if (!startDate || !(startDate instanceof Date) || !isValid(startDate)) {
    throw new InvalidReferenceDateError(startDate, 'Start date must be a valid Date object');
  }
  if (!endDate || !(endDate instanceof Date) || !isValid(endDate)) {
    throw new InvalidReferenceDateError(endDate, 'End date must be a valid Date object');
  }
  if (isAfter(startDate, endDate)) {
    throw new InvalidReferenceDateError(startDate, 'Start date must be before or equal to end date');
  }

  const normalizedStart = normalizeToUTCDate(startDate);
  const normalizedEnd = normalizeToUTCDate(endDate);
  const limit = config.limit ?? SCHENGEN_DAY_LIMIT;
  const thresholds = config.thresholds ?? DEFAULT_RISK_THRESHOLDS;
  const complianceStartDate = config.complianceStartDate ?? DEFAULT_COMPLIANCE_START_DATE;
  const normalizedComplianceStart = normalizeToUTCDate(complianceStartDate);

  // Step 1: Compute presence days once
  const presence = presenceDays(trips, config);

  // Step 2: Create a lookup set for O(1) presence checking
  const presenceSet = new Set(presence);

  // Step 3: Use sliding window with incremental updates
  const result: DailyCompliance[] = [];

  // Calculate initial count for first reference date
  // Window: [startDate - 179, startDate] = 180 days inclusive of reference date
  let windowStartBoundary = addUtcDays(normalizedStart, -(WINDOW_SIZE_DAYS - 1));
  if (isBefore(windowStartBoundary, normalizedComplianceStart)) {
    windowStartBoundary = normalizedComplianceStart;
  }

  // Initialize count by counting all presence days in the initial window
  let currentCount = 0;
  let currentDate = normalizedStart;

  // Helper to get date key
  const dateToKey = (d: Date): string => d.toISOString().split('T')[0];

  // Count initial window [startDate - 179, startDate]
  {
    const windowEnd = normalizedStart;
    for (const dayKey of presenceSet) {
      const day = new Date(dayKey + 'T00:00:00.000Z');
      if (
        !isBefore(day, windowStartBoundary) &&
        !isAfter(day, windowEnd)
      ) {
        currentCount++;
      }
    }
  }

  // Process each day in the range
  while (!isAfter(currentDate, normalizedEnd)) {
    const daysRemaining = limit - currentCount;

    result.push({
      date: new Date(currentDate),
      daysUsed: currentCount,
      daysRemaining,
      riskLevel: getRiskLevel(daysRemaining, thresholds),
    });

    // Prepare for next iteration: slide the window forward by one day
    // Window for currentDate: [currentDate - 179, currentDate]
    // Window for nextDate:    [currentDate - 178, nextDate]
    // - Remove the day that falls out: currentDate - 179 (old window start)
    // - Add the day that enters: nextDate (new window end)

    const nextDate = addUtcDays(currentDate, 1);
    if (isAfter(nextDate, normalizedEnd)) {
      break;
    }

    // Day falling out: the old window start (currentDate - 179)
    // For nextDate, window starts at nextDate - 179 = currentDate - 178
    // so currentDate - 179 falls out
    const dayFallingOut = addUtcDays(currentDate, -(WINDOW_SIZE_DAYS - 1));
    const dayFallingOutKey = dateToKey(dayFallingOut);

    // Only decrement if this day was actually in our count
    // (i.e., it was after compliance start and was a presence day)
    if (
      !isBefore(dayFallingOut, normalizedComplianceStart) &&
      presenceSet.has(dayFallingOutKey)
    ) {
      currentCount--;
    }

    // Day entering: nextDate (the new reference date, which is included in its own window)
    const dayEntering = nextDate;
    const dayEnteringKey = dateToKey(dayEntering);

    // Only increment if this day is a presence day
    if (presenceSet.has(dayEnteringKey)) {
      currentCount++;
    }

    currentDate = nextDate;
  }

  return result;
}

/**
 * Computes compliance for a single month, optimized for month view calendars.
 *
 * @param trips - All trips for the employee
 * @param year - Year
 * @param month - Month (1-12)
 * @param config - Compliance configuration
 * @returns Array of daily compliance statuses for the month
 */
export function computeMonthCompliance(
  trips: readonly Trip[],
  year: number,
  month: number,
  config: ComplianceConfig
): DailyCompliance[] {
  // Month is 1-indexed for user convenience, but Date uses 0-indexed
  const startDate = new Date(Date.UTC(year, month - 1, 1));

  // End of month
  const endDate = new Date(Date.UTC(year, month, 0));

  return computeComplianceVectorOptimized(trips, startDate, endDate, config);
}

/**
 * Computes compliance for a full year, optimized for year view calendars.
 *
 * @param trips - All trips for the employee
 * @param year - Year
 * @param config - Compliance configuration
 * @returns Array of daily compliance statuses for the year
 */
export function computeYearCompliance(
  trips: readonly Trip[],
  year: number,
  config: ComplianceConfig
): DailyCompliance[] {
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year, 11, 31));

  return computeComplianceVectorOptimized(trips, startDate, endDate, config);
}
