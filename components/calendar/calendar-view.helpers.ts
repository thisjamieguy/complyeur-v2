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
import type { DbTrip, EmployeeWithTrips, ProcessedEmployee, ProcessedTrip } from './types'

interface ParsedTrip extends DbTrip {
  entryDate: Date
  exitDate: Date
  isSchengen: boolean
}

/**
 * Optimistic, not-yet-server-confirmed change to a trip. Each field is
 * independent: a resize sets only dates, a privacy toggle sets only
 * `is_private`, a delete sets only `deleted`. Cleared once the server's
 * `employees` data confirms the change (or, for `deleted`, once the trip is
 * actually gone) — see the cleanup effect in useCalendarTripActions.
 */
export interface TripOverride {
  entry_date?: string
  exit_date?: string
  is_private?: boolean
  deleted?: boolean
}

export interface ProcessedEmployeeCacheEntry {
  cacheKey: string
  employee: ProcessedEmployee
}

interface CalendarRiskSummary {
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
function toComplianceTrip(trip: ParsedTrip): ComplianceTrip {
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
  tripOverrides,
  startDateKey,
  endDateKey,
  todayKey,
}: {
  employee: EmployeeWithTrips
  tripOverrides: Map<string, TripOverride>
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
    trips: employee.trips
      .filter((trip) => !tripOverrides.get(trip.id)?.deleted)
      .map((trip) => {
        const override = tripOverrides.get(trip.id)

        return [
          trip.id,
          trip.country,
          override?.entry_date ?? trip.entry_date,
          override?.exit_date ?? trip.exit_date,
          trip.purpose,
          trip.job_ref ?? null,
          override?.is_private ?? trip.is_private,
          trip.ghosted,
        ]
      }),
  })
}

export function processCalendarEmployee({
  employee,
  tripOverrides,
  startDate,
  endDate,
  today,
}: {
  employee: EmployeeWithTrips
  tripOverrides: Map<string, TripOverride>
  startDate: Date
  endDate: Date
  today: Date
}): ProcessedEmployee {
  const parsedTrips: ParsedTrip[] = employee.trips
    .filter((trip) => !trip.ghosted && !tripOverrides.get(trip.id)?.deleted)
    .map((trip) => {
      const override = tripOverrides.get(trip.id)
      const entryDateKey = override?.entry_date ?? trip.entry_date
      const exitDateKey = override?.exit_date ?? trip.exit_date
      const entryDate = parseDateOnlyAsUTC(entryDateKey)
      const exitDate = parseDateOnlyAsUTC(exitDateKey)

      return {
        ...trip,
        entry_date: entryDateKey,
        exit_date: exitDateKey,
        is_private: override?.is_private ?? trip.is_private,
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
