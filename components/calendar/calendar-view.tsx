'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  calculateCompliance,
  computeComplianceVectorOptimized,
  isSchengenCountry,
  parseDateOnlyAsUTC,
  type DailyCompliance,
  type Trip as ComplianceTrip,
} from '@/lib/compliance'
import {
  addUtcDays,
  differenceInUtcDays,
  toUTCMidnight,
} from '@/lib/compliance/date-utils'
import { RangeSelector } from './range-selector'
import {
  buildDateRange,
  buildDayMap,
  overlapsVisibleRange,
  toDateKey,
} from './calendar-view.utils'
import type { ProcessedTrip, ProcessedEmployee } from './types'

const GanttChart = dynamic(
  () => import('./gantt-chart').then(m => m.GanttChart),
  { ssr: false, loading: () => <div className="h-96 animate-pulse bg-slate-100 rounded-lg" /> }
)

const MobileCalendarView = dynamic(
  () => import('./mobile-calendar-view').then(m => m.MobileCalendarView),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-slate-100 rounded-lg" /> }
)

/** Days to look back from today */
const DAYS_BACK = 200

/** Default weeks forward */
const DEFAULT_WEEKS_FORWARD = 6

interface DbTrip {
  id: string
  country: string
  entry_date: string
  exit_date: string
  purpose: string | null
  is_private: boolean
  ghosted: boolean
}

interface EmployeeWithTrips {
  id: string
  name: string
  trips: DbTrip[]
}

interface CalendarViewProps {
  employees: EmployeeWithTrips[]
}

interface ParsedTrip extends DbTrip {
  entryDate: Date
  exitDate: Date
  isSchengen: boolean
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

/**
 * Main calendar view component - orchestrates Gantt chart and mobile view
 */
export function CalendarView({ employees }: CalendarViewProps) {
  const [weeksForward, setWeeksForward] = useState(DEFAULT_WEEKS_FORWARD)

  // Calculate date range
  const { startDate, endDate, dates } = useMemo(() => {
    const today = toUTCMidnight(new Date())
    const start = addUtcDays(today, -DAYS_BACK)
    const end = addUtcDays(today, weeksForward * 7)

    return {
      startDate: start,
      endDate: end,
      dates: buildDateRange(start, end),
    }
  }, [weeksForward])

  // Process employees and their trips with per-employee batched compliance work.
  const processedEmployees = useMemo((): ProcessedEmployee[] => {
    const today = toUTCMidnight(new Date())

    return employees.map((employee) => {
      const parsedTrips: ParsedTrip[] = employee.trips
        .filter((trip) => !trip.ghosted)
        .map((trip) => {
          const entryDate = parseDateOnlyAsUTC(trip.entry_date)
          const exitDate = parseDateOnlyAsUTC(trip.exit_date)
          return {
            ...trip,
            entryDate,
            exitDate,
            isSchengen: isSchengenCountry(trip.country),
          }
        })

      const complianceTrips = parsedTrips
        .filter((trip) => trip.isSchengen)
        .map(toComplianceTrip)

      const currentCompliance = calculateCompliance(complianceTrips, {
        mode: 'audit',
        referenceDate: today,
      })

      const tripsInRange = parsedTrips.filter((trip) =>
        overlapsVisibleRange(trip.entryDate, trip.exitDate, startDate, endDate)
      )

      const processedTrips: ProcessedTrip[] = tripsInRange.map((trip) => {
        const duration = differenceInUtcDays(trip.exitDate, trip.entryDate) + 1

        return {
          id: trip.id,
          country: trip.is_private ? 'XX' : trip.country,
          entryDate: trip.entryDate,
          exitDate: trip.exitDate,
          duration,
          purpose: trip.purpose,
          isPrivate: trip.is_private,
          isSchengen: trip.isSchengen,
        }
      })

      const complianceByDate: Map<string, DailyCompliance> = complianceTrips.length > 0
        ? new Map(
            computeComplianceVectorOptimized(complianceTrips, startDate, endDate, {
              mode: 'audit',
              referenceDate: endDate,
            }).map((result) => [toDateKey(result.date), result])
          )
        : new Map()

      const dayMap = buildDayMap(processedTrips, startDate, endDate, complianceByDate)

      return {
        id: employee.id,
        name: employee.name,
        trips: processedTrips,
        dayMap,
        currentDaysRemaining: currentCompliance.daysRemaining,
        currentRiskLevel: currentCompliance.riskLevel,
        tripsInRange: tripsInRange.length,
      }
    })
  }, [employees, startDate, endDate])

  return (
    <>
      {/* Desktop view - Gantt chart */}
      <div className="hidden md:block">
        <Card className="rounded-xl overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-4 bg-slate-50/70 border-b border-slate-100">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
                Travel Timeline
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-sky-300 bg-sky-50/70" />
                  180-day window
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-slate-100" />
                  weekend
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-blue-300 bg-blue-50" />
                  today
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-px bg-slate-400" />
                  month boundary
                </span>
              </div>
            </div>
            <RangeSelector value={weeksForward} onChange={setWeeksForward} />
          </CardHeader>
          <CardContent className="p-0">
            <GanttChart
              employees={processedEmployees}
              dates={dates}
            />
          </CardContent>
        </Card>
      </div>

      {/* Mobile view - simplified list */}
      <div className="md:hidden">
        <MobileCalendarView employees={processedEmployees} />
      </div>
    </>
  )
}
