/**
 * @fileoverview Date parsing utilities for compliance calculations.
 *
 * Compliance math operates on calendar dates, not local timestamps.
 * Date-only strings (YYYY-MM-DD) are parsed as UTC midnight to avoid
 * timezone-dependent day shifts.
 */

import { parseISO } from 'date-fns';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Parses a date string for compliance calculations.
 *
 * - YYYY-MM-DD is parsed as UTC midnight.
 * - Other ISO-like inputs fall back to parseISO.
 */
export function parseDateOnlyAsUTC(input: string): Date {
  const value = input.trim();

  if (DATE_ONLY_PATTERN.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  return parseISO(value);
}

/**
 * Returns a Date pinned to UTC midnight for the given calendar day.
 */
export function toUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Adds whole calendar days using UTC math (DST-safe).
 */
export function addUtcDays(date: Date, days: number): Date {
  return new Date(toUTCMidnight(date).getTime() + days * MS_PER_DAY);
}

/**
 * Day difference between two dates using UTC calendar days (DST-safe).
 */
export function differenceInUtcDays(laterDate: Date, earlierDate: Date): number {
  const later = toUTCMidnight(laterDate).getTime();
  const earlier = toUTCMidnight(earlierDate).getTime();
  return Math.round((later - earlier) / MS_PER_DAY);
}
