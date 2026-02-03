/**
 * @fileoverview Utility functions for stress test suite.
 */

import { addDays, differenceInDays, parseISO, format, isLeapYear, getYear } from 'date-fns';

/**
 * Creates a seeded random number generator using Linear Congruential Generator (LCG).
 * This ensures reproducible random sequences for testing.
 *
 * @param seed - Initial seed value
 * @returns Function that returns the next random number [0, 1)
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // LCG parameters (same as glibc)
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/**
 * Generates a random integer in [min, max] inclusive.
 *
 * @param random - Seeded random function
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer
 */
export function randomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Picks a random element from an array.
 *
 * @param random - Seeded random function
 * @param array - Array to pick from
 * @returns Random element
 */
export function randomPick<T>(random: () => number, array: readonly T[]): T {
  return array[Math.floor(random() * array.length)];
}

/**
 * Formats a date as YYYY-MM-DD.
 *
 * @param date - Date to format
 * @returns ISO date string
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Calculates the number of days in a trip (inclusive of both entry and exit).
 *
 * @param entryDate - Entry date string (YYYY-MM-DD)
 * @param exitDate - Exit date string (YYYY-MM-DD)
 * @returns Number of days (entry and exit both count)
 */
export function calculateTripDays(entryDate: string, exitDate: string): number {
  const entry = parseISO(entryDate);
  const exit = parseISO(exitDate);
  return differenceInDays(exit, entry) + 1;
}

/**
 * Generates all dates in a range (inclusive).
 *
 * @param startDate - Start date string (YYYY-MM-DD)
 * @param endDate - End date string (YYYY-MM-DD)
 * @returns Array of date strings
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = parseISO(startDate);
  const end = parseISO(endDate);

  while (current <= end) {
    dates.push(formatDate(current));
    current = addDays(current, 1);
  }

  return dates;
}

/**
 * Checks if a trip spans across a year boundary.
 *
 * @param entryDate - Entry date string (YYYY-MM-DD)
 * @param exitDate - Exit date string (YYYY-MM-DD)
 * @returns True if trip crosses year boundary
 */
export function isYearSpanning(entryDate: string, exitDate: string): boolean {
  return getYear(parseISO(entryDate)) !== getYear(parseISO(exitDate));
}

/**
 * Checks if a trip includes any leap year day (Feb 29).
 *
 * @param entryDate - Entry date string (YYYY-MM-DD)
 * @param exitDate - Exit date string (YYYY-MM-DD)
 * @returns True if trip includes Feb 29
 */
export function includesLeapDay(entryDate: string, exitDate: string): boolean {
  const dates = generateDateRange(entryDate, exitDate);
  return dates.some(date => {
    const parsed = parseISO(date);
    return isLeapYear(parsed) && date.endsWith('-02-29');
  });
}

/**
 * Checks if two trips overlap.
 *
 * @param trip1 - First trip {entry_date, exit_date}
 * @param trip2 - Second trip {entry_date, exit_date}
 * @returns True if trips overlap
 */
export function tripsOverlap(
  trip1: { entry_date: string; exit_date: string },
  trip2: { entry_date: string; exit_date: string }
): boolean {
  const start1 = parseISO(trip1.entry_date);
  const end1 = parseISO(trip1.exit_date);
  const start2 = parseISO(trip2.entry_date);
  const end2 = parseISO(trip2.exit_date);

  // Trips overlap if one starts before the other ends
  return start1 <= end2 && start2 <= end1;
}

/**
 * Formats a number with commas for display.
 *
 * @param num - Number to format
 * @returns Formatted string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Formats a duration in milliseconds to human-readable string.
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "1.5s", "2m 30s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Generates a random date within a range.
 *
 * @param random - Seeded random function
 * @param startDate - Start of range (YYYY-MM-DD)
 * @param endDate - End of range (YYYY-MM-DD)
 * @returns Random date string (YYYY-MM-DD)
 */
export function randomDate(
  random: () => number,
  startDate: string,
  endDate: string
): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const daysDiff = differenceInDays(end, start);
  const randomDays = randomInt(random, 0, daysDiff);
  return formatDate(addDays(start, randomDays));
}

/**
 * Chunks an array into smaller arrays of specified size.
 *
 * @param array - Array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Creates a progress logger for long-running operations.
 *
 * @param total - Total items to process
 * @param label - Label for the operation
 * @returns Progress update function
 */
export function createProgressLogger(
  total: number,
  label: string
): (current: number) => void {
  let lastPercent = -1;
  return (current: number) => {
    const percent = Math.floor((current / total) * 100);
    if (percent !== lastPercent && percent % 10 === 0) {
      lastPercent = percent;
      console.log(`  ${label}: ${percent}% (${formatNumber(current)}/${formatNumber(total)})`);
    }
  };
}
