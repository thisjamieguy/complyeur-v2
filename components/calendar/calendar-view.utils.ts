import type { ProcessedTrip } from './types'

/** Milliseconds in one UTC day */
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Stable ISO date key for map lookups.
 */
export function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Whether trip overlaps the visible timeline.
 */
export function overlapsVisibleRange(
  entryDate: Date,
  exitDate: Date,
  startDate: Date,
  endDate: Date
): boolean {
  return entryDate <= endDate && exitDate >= startDate
}

/**
 * Build calendar columns with UTC-safe day increments.
 */
export function buildDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  for (let ts = startDate.getTime(); ts <= endDate.getTime(); ts += MS_PER_DAY) {
    dates.push(new Date(ts))
  }
  return dates
}

/**
 * Build day map for O(1) day-cell lookups.
 */
export function buildDayMap(trips: ProcessedTrip[]): Map<string, ProcessedTrip> {
  const dayMap = new Map<string, ProcessedTrip>()

  for (const trip of trips) {
    for (let ts = trip.entryDate.getTime(); ts <= trip.exitDate.getTime(); ts += MS_PER_DAY) {
      const key = toDateKey(new Date(ts))
      if (!dayMap.has(key)) {
        dayMap.set(key, trip)
      }
    }
  }

  return dayMap
}

