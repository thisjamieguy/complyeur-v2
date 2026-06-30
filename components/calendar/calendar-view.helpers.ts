/**
 * @fileoverview Pure helpers for the calendar view.
 *
 * Extracted from calendar-view.tsx so the compliance-processing logic can be
 * unit-tested directly (see calendar-view.helpers.test.ts) and the component
 * stays focused on orchestration and rendering. Nothing here touches React.
 */

import {
  calculateCompliance,
  computeComplianceVectorOptimized,
  isSchengenCountry,
  parseDateOnlyAsUTC,
  type Trip as ComplianceTrip,
} from '@/lib/compliance'
import { differenceInUtcDays } from '@/lib/compliance/date-utils'
import { formatDateForDisplay } from '@/lib/validations/dates'
import type { TripOverlapResult } from '@/lib/validations/trip-overlap'
import { overlapsVisibleRange, toDateKey } from './calendar-view.utils'
import type { ProcessedEmployee, ProcessedTrip } from './types'

export interface DbTrip {
  id: string
  country: string
  entry_date: string
  exit_date: string
  purpose: string | null
  job_ref?: string | null
  is_private: boolean
  ghosted: boolean
}

export interface EmployeeWithTrips {
  id: string
  name: string
  trips: DbTrip[]
}

export interface ParsedTrip extends DbTrip {
  entryDate: Date
  exitDate: Date
  isSchengen: boolean
}

export type TripDateOverride = { entry_date: string; exit_date: string }

export interface ProcessedEmployeeCacheEntry {
  cacheKey: string
  employee: ProcessedEmployee
}

export interface CalendarRiskSummary {
  clear: number
  warning: number
  critical: number
  breach: number
}

export function getCalendarRiskSummary(
  employees: ProcessedEmployee[]
): CalendarRiskSummary {
  return employees.reduce<CalendarRiskSummary>(
    (summary, employee) => {
      if (employee.currentDaysRemaining < 0) {
        summary.breach += 1
        return summary
      }

      if (employee.currentRiskLevel === 'red') {
        summary.critical += 1
        return summary
      }

      if (employee.currentRiskLevel === 'amber') {
        summary.warning += 1
        return summary
      }

      summary.clear += 1
      return summary
    },
    { clear: 0, warning: 0, critical: 0, breach: 0 }
  )
}

/**
 * Convert parsed DB trip to compliance engine format
 */
export function toComplianceTrip(trip: ParsedTrip): ComplianceTrip {
  return {
    id: trip.id,
    country: trip.country,
    entryDate: trip.entryDate,
    exitDate: trip.exitDate,
  }
}

export function getOverlapMessage(
  overlapResult: TripOverlapResult,
  employeeName?: string
): string {
  if (overlapResult.conflictingTrip) {
    const { country, entry_date, exit_date } = overlapResult.conflictingTrip
    const owner = employeeName ? `${employeeName}'s ` : ''

    return `This overlaps ${owner}${country} trip (${formatDateForDisplay(entry_date)} - ${formatDateForDisplay(exit_date)}). Please adjust the dates.`
  }

  return overlapResult.message ?? 'This trip overlaps with an existing trip. Please adjust the dates.'
}

export function buildEmployeeProcessingCacheKey({
  employee,
  tripDateOverrides,
  startDateKey,
  endDateKey,
  todayKey,
}: {
  employee: EmployeeWithTrips
  tripDateOverrides: Map<string, TripDateOverride>
  startDateKey: string
  endDateKey: string
  todayKey: string
}): string {
  return JSON.stringify({
    employeeId: employee.id,
    employeeName: employee.name,
    startDateKey,
    endDateKey,
    todayKey,
    trips: employee.trips.map((trip) => {
      const override = tripDateOverrides.get(trip.id)

      return [
        trip.id,
        trip.country,
        override?.entry_date ?? trip.entry_date,
        override?.exit_date ?? trip.exit_date,
        trip.purpose,
        trip.job_ref ?? null,
        trip.is_private,
        trip.ghosted,
      ]
    }),
  })
}

export function processCalendarEmployee({
  employee,
  tripDateOverrides,
  startDate,
  endDate,
  today,
}: {
  employee: EmployeeWithTrips
  tripDateOverrides: Map<string, TripDateOverride>
  startDate: Date
  endDate: Date
  today: Date
}): ProcessedEmployee {
  const parsedTrips: ParsedTrip[] = employee.trips
    .filter((trip) => !trip.ghosted)
    .map((trip) => {
      const override = tripDateOverrides.get(trip.id)
      const entryDateKey = override?.entry_date ?? trip.entry_date
      const exitDateKey = override?.exit_date ?? trip.exit_date
      const entryDate = parseDateOnlyAsUTC(entryDateKey)
      const exitDate = parseDateOnlyAsUTC(exitDateKey)

      return {
        ...trip,
        entry_date: entryDateKey,
        exit_date: exitDateKey,
        entryDate,
        exitDate,
        isSchengen: isSchengenCountry(trip.country),
      }
    })

  const complianceTrips = parsedTrips
    .filter((trip) => trip.isSchengen)
    .map(toComplianceTrip)

  const currentCompliance = complianceTrips.length > 0
    ? calculateCompliance(complianceTrips, {
        mode: 'audit',
        referenceDate: today,
      })
    : null

  const complianceByDate = complianceTrips.length > 0
    ? new Map(
        computeComplianceVectorOptimized(complianceTrips, startDate, endDate, {
          mode: 'audit',
          referenceDate: endDate,
        }).map((result) => [toDateKey(result.date), result])
      )
    : new Map()

  const processedTrips: ProcessedTrip[] = parsedTrips
    .filter((trip) =>
      overlapsVisibleRange(trip.entryDate, trip.exitDate, startDate, endDate)
    )
    .map((trip) => {
      const duration = differenceInUtcDays(trip.exitDate, trip.entryDate) + 1

      return {
        id: trip.id,
        country: trip.is_private ? 'XX' : trip.country,
        rawCountry: trip.country,
        entryDate: trip.entryDate,
        exitDate: trip.exitDate,
        duration,
        purpose: trip.purpose,
        jobRef: trip.job_ref ?? null,
        isPrivate: trip.is_private,
        ghosted: trip.ghosted,
        isSchengen: trip.isSchengen,
      }
    })

  return {
    id: employee.id,
    name: employee.name,
    trips: processedTrips,
    complianceByDate,
    currentDaysRemaining: currentCompliance?.daysRemaining ?? 90,
    currentRiskLevel: currentCompliance?.riskLevel ?? 'green',
    tripsInRange: processedTrips.length,
  }
}
