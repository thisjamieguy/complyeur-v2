import type { DailyCompliance } from '@/lib/compliance'
import type { ProcessedTrip, ProcessedTripDay } from './types'

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

interface DayMapContext {
  today: Date
}

/**
 * Build day map for O(1) day-cell lookups.
 */
export function buildDayMap(
  trips: ProcessedTrip[],
  startDate: Date,
  endDate: Date,
  complianceByDate: Map<string, DailyCompliance>,
  context: DayMapContext
): Map<string, ProcessedTripDay> {
  const dayMap = new Map<string, ProcessedTripDay>()
  const startTime = startDate.getTime()
  const endTime = endDate.getTime()
  const todayTime = context.today.getTime()

  for (const trip of trips) {
    const visibleStart = Math.max(trip.entryDate.getTime(), startTime)
    const visibleEnd = Math.min(trip.exitDate.getTime(), endTime)

    if (visibleStart > visibleEnd) {
      continue
    }

    for (let ts = visibleStart; ts <= visibleEnd; ts += MS_PER_DAY) {
      const referenceDate = new Date(ts)
      const key = toDateKey(referenceDate)
      if (!dayMap.has(key)) {
        const dayCompliance = trip.isSchengen
          ? complianceByDate.get(key)
          : undefined
        const displayMode = referenceDate.getTime() < todayTime
          ? 'historical'
          : 'planning'

        dayMap.set(key, {
          trip,
          referenceDate,
          displayMode,
          daysUsed: dayCompliance?.daysUsed ?? 0,
          daysRemaining: dayCompliance?.daysRemaining ?? 90,
          riskLevel: dayCompliance?.riskLevel ?? 'green',
          isBreachDay: (dayCompliance?.daysUsed ?? 0) >= 90,
        })
      }
    }
  }

  return dayMap
}
