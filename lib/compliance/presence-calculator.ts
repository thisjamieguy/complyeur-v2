/**
 * @fileoverview Presence days calculation for Schengen compliance.
 *
 * Calculates all individual days spent in the Schengen Area.
 * Uses a Set to automatically deduplicate overlapping trips.
 *
 * @version 2025-01-07
 * @see EU Regulation 610/2013 (Schengen Borders Code)
 */

import { isAfter, isBefore, isValid, max } from 'date-fns';
import { isSchengenCountry } from './schengen-validator';
import { DEFAULT_COMPLIANCE_START_DATE } from './constants';
import { InvalidTripError, InvalidDateRangeError, InvalidReferenceDateError } from './errors';
import type { Trip, ComplianceConfig } from './types';

/**
 * Normalizes a date to UTC midnight.
 *
 * All compliance calculations use dates (not timestamps).
 * This ensures consistent comparison across timezones.
 *
 * @param date - Date to normalize
 * @returns Date at UTC midnight
 */
export function normalizeToUTCDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Converts a Date to a string key for Set operations.
 *
 * JavaScript Sets use reference equality for objects, so we need
 * to convert dates to strings for deduplication.
 *
 * @param date - Date to convert
 * @returns ISO date string (YYYY-MM-DD)
 */
function dateToKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Converts a string key back to a Date.
 *
 * @param key - ISO date string (YYYY-MM-DD)
 * @returns Date at UTC midnight
 */
function keyToDate(key: string): Date {
  return new Date(key + 'T00:00:00.000Z');
}

/**
 * Validates a single trip's data.
 *
 * @param trip - Trip to validate
 * @param referenceDate - Reference date used for active trips (null exitDate)
 * @throws InvalidTripError if trip data is invalid
 * @throws InvalidDateRangeError if exit is before entry
 */
function validateTrip(trip: Trip, referenceDate: Date): void {
  // Validate entry date
  if (!trip.entryDate) {
    throw new InvalidTripError('entryDate', trip.entryDate, 'Entry date is required');
  }
  if (!(trip.entryDate instanceof Date) || !isValid(trip.entryDate)) {
    throw new InvalidTripError('entryDate', trip.entryDate, 'Entry date must be a valid Date object');
  }

  // Validate exit date (null is allowed for active trips)
  if (trip.exitDate !== null && trip.exitDate !== undefined) {
    if (!(trip.exitDate instanceof Date) || !isValid(trip.exitDate)) {
      throw new InvalidTripError('exitDate', trip.exitDate, 'Exit date must be a valid Date object or null');
    }

    // Validate date range (only if exit date is provided)
    if (isAfter(trip.entryDate, trip.exitDate)) {
      throw new InvalidDateRangeError(trip.entryDate, trip.exitDate);
    }
  }

  // Validate country
  if (!trip.country || typeof trip.country !== 'string' || trip.country.trim() === '') {
    throw new InvalidTripError('country', trip.country, 'Country code is required');
  }
}

/**
 * Calculates all individual days spent in the Schengen Area.
 *
 * This is the foundation of all compliance calculations. It:
 * - Generates every date from entry to exit (inclusive)
 * - Uses a Set to automatically deduplicate overlapping trips
 * - Excludes non-Schengen countries (including Ireland)
 * - Respects the compliance start date
 * - Supports audit mode (past only) and planning mode (past + future)
 *
 * **Important:** Entry and exit dates both count as full days.
 * A same-day entry/exit trip = 1 day consumed.
 *
 * @param trips - Array of trip records with entry/exit dates and country
 * @param config - Compliance configuration (mode, referenceDate, complianceStartDate)
 * @returns Set of date keys (YYYY-MM-DD strings) representing each unique day in Schengen
 *
 * @throws InvalidTripError if any trip has invalid data
 * @throws InvalidDateRangeError if any trip has exit before entry
 * @throws InvalidReferenceDateError if referenceDate is invalid
 *
 * @example
 * const trips = [
 *   { entryDate: new Date('2025-01-01'), exitDate: new Date('2025-01-05'), country: 'FR' },
 *   { entryDate: new Date('2025-01-03'), exitDate: new Date('2025-01-10'), country: 'DE' }
 * ];
 * const days = presenceDays(trips, { mode: 'audit', referenceDate: new Date() });
 * // Returns Set with 10 date keys (Jan 1-10), overlapping days deduplicated
 */
export function presenceDays(
  trips: readonly Trip[],
  config: ComplianceConfig
): ReadonlySet<string> {
  // Validate config
  if (!config.referenceDate || !(config.referenceDate instanceof Date) || !isValid(config.referenceDate)) {
    throw new InvalidReferenceDateError(config.referenceDate, 'Reference date is required and must be valid');
  }

  const complianceStartDate = config.complianceStartDate ?? DEFAULT_COMPLIANCE_START_DATE;
  const referenceDate = normalizeToUTCDate(config.referenceDate);
  const normalizedComplianceStart = normalizeToUTCDate(complianceStartDate);

  // Use string keys for Set deduplication (JS Sets use reference equality for objects)
  const days = new Set<string>();

  for (const trip of trips) {
    // Validate trip data
    validateTrip(trip, referenceDate);

    // Skip non-Schengen countries (including Ireland, Cyprus)
    if (!isSchengenCountry(trip.country)) {
      continue;
    }

    const normalizedEntry = normalizeToUTCDate(trip.entryDate);
    // For active trips (null exitDate), use reference date as the end
    const normalizedExit = trip.exitDate
      ? normalizeToUTCDate(trip.exitDate)
      : referenceDate;

    // Skip if trip ends before compliance tracking started
    if (isBefore(normalizedExit, normalizedComplianceStart)) {
      continue;
    }

    // MODE FILTER: In audit mode, skip future trips
    // A trip is "future" if it starts after the reference date
    if (config.mode === 'audit' && isAfter(normalizedEntry, referenceDate)) {
      continue;
    }

    // Calculate the effective start date (can't be before compliance start)
    const effectiveStart = max([normalizedEntry, normalizedComplianceStart]);

    // In audit mode, don't count days after the reference date
    // (for trips that span across the reference date)
    let effectiveEnd = normalizedExit;
    // In audit mode, clip active/spanning trips to the reference date.
    // This counts presence "as of" the reference date, including that day itself.
    // Note: The rolling window includes the reference date itself.
    if (config.mode === 'audit' && isAfter(normalizedExit, referenceDate)) {
      // Clip to reference date - but only for the day generation
      // We count up to and including the reference date
      effectiveEnd = referenceDate;
    }

    // Generate all dates from effective start to effective end (inclusive)
    // Use UTC arithmetic to avoid timezone issues with date-fns's eachDayOfInterval
    let current = normalizeToUTCDate(effectiveStart);
    const endNormalized = normalizeToUTCDate(effectiveEnd);

    while (current.getTime() <= endNormalized.getTime()) {
      days.add(dateToKey(current));
      // Add 1 day in milliseconds
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  return days;
}

/**
 * Converts a set of date keys back to Date objects.
 *
 * Useful when you need to work with actual Date objects
 * rather than string keys.
 *
 * @param dateKeys - Set of date keys (YYYY-MM-DD strings)
 * @returns Array of Date objects sorted chronologically
 */
export function dateKeysToArray(dateKeys: ReadonlySet<string>): Date[] {
  return Array.from(dateKeys)
    .map(keyToDate)
    .sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Gets the date boundaries of presence days.
 *
 * @param dateKeys - Set of date keys
 * @returns Object with earliest and latest dates, or null if empty
 */
export function getPresenceBounds(
  dateKeys: ReadonlySet<string>
): { earliest: Date; latest: Date } | null {
  if (dateKeys.size === 0) {
    return null;
  }

  const dates = dateKeysToArray(dateKeys);
  return {
    earliest: dates[0],
    latest: dates[dates.length - 1],
  };
}
