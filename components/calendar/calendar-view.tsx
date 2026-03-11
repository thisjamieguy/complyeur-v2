'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  calculateCompliance,
  computeComplianceVectorOptimized,
  isSchengenCountry,
  parseDateOnlyAsUTC,
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
  overlapsVisibleRange,
  toDateKey,
} from './calendar-view.utils'
import { CalendarEmptyState } from './calendar-empty-state'
import { serializeHideNoSchengenCookie } from '@/lib/calendar/filter-preferences'
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
  initialHideEmployeesWithoutSchengenTrips?: boolean
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
export function CalendarView({
  employees,
  initialHideEmployeesWithoutSchengenTrips = false,
}: CalendarViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [weeksForward, setWeeksForward] = useState(DEFAULT_WEEKS_FORWARD)
  const [hideEmployeesWithoutSchengenTrips, setHideEmployeesWithoutSchengenTrips] =
    useState(initialHideEmployeesWithoutSchengenTrips)

  useEffect(() => {
    setHideEmployeesWithoutSchengenTrips(initialHideEmployeesWithoutSchengenTrips)
  }, [initialHideEmployeesWithoutSchengenTrips])

  const updateHideEmployeesWithoutSchengenTrips = (enabled: boolean) => {
    setHideEmployeesWithoutSchengenTrips(enabled)

    if (typeof document !== 'undefined') {
      document.cookie = serializeHideNoSchengenCookie(enabled)
    }

    startTransition(() => {
      router.refresh()
    })
  }

  // Calculate date range
  const { startDate, endDate, dates, startDateKey, endDateKey } = useMemo(() => {
    const today = toUTCMidnight(new Date())
    const start = addUtcDays(today, -DAYS_BACK)
    const end = addUtcDays(today, weeksForward * 7)

    return {
      startDate: start,
      endDate: end,
      dates: buildDateRange(start, end),
      startDateKey: toDateKey(start),
      endDateKey: toDateKey(end),
    }
  }, [weeksForward])

  const shouldApplySchengenFilter =
    initialHideEmployeesWithoutSchengenTrips || hideEmployeesWithoutSchengenTrips

  const filteredEmployees = useMemo(() => {
    if (!shouldApplySchengenFilter) {
      return employees
    }

    return employees.filter((employee) =>
      employee.trips.some((trip) => {
        if (trip.ghosted || !isSchengenCountry(trip.country)) {
          return false
        }

        // ISO date-only strings can be compared lexicographically.
        return trip.entry_date <= endDateKey && trip.exit_date >= startDateKey
      })
    )
  }, [employees, endDateKey, shouldApplySchengenFilter, startDateKey])

  // Process employees and their trips with per-employee batched compliance work.
  const processedEmployees = useMemo((): ProcessedEmployee[] => {
    const today = toUTCMidnight(new Date())

    return filteredEmployees.map((employee) => {
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
            entryDate: trip.entryDate,
            exitDate: trip.exitDate,
            duration,
            purpose: trip.purpose,
            isPrivate: trip.is_private,
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
    })
  }, [filteredEmployees, startDate, endDate])

  if (processedEmployees.length === 0) {
    if (!shouldApplySchengenFilter) {
      return <CalendarEmptyState />
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">Calendar filters</p>
              <p className="text-xs text-slate-500">
                Showing 0 employees
                {isPending ? ' · refreshing…' : ' · saved for your next visit'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="calendar-hide-no-schengen"
                checked={hideEmployeesWithoutSchengenTrips}
                onCheckedChange={updateHideEmployeesWithoutSchengenTrips}
                disabled={isPending}
              />
              <Label
                htmlFor="calendar-hide-no-schengen"
                className="cursor-pointer text-sm text-slate-700"
              >
                Only show employees with Schengen trips
              </Label>
            </div>
          </div>
        </div>

        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">
                No employees match this filter
              </h2>
              <p className="max-w-md text-sm text-slate-500">
                Turn the filter off to see every employee, or extend the forward range if
                you&apos;re expecting later Schengen travel.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => updateHideEmployeesWithoutSchengenTrips(false)}
              disabled={isPending}
            >
              Show all employees
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">Calendar filters</p>
            <p className="text-xs text-slate-500">
              Showing {processedEmployees.length}{' '}
              {processedEmployees.length === 1 ? 'employee' : 'employees'}
              {isPending ? ' · refreshing…' : ' · saved for your next visit'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="calendar-hide-no-schengen"
              checked={hideEmployeesWithoutSchengenTrips}
              onCheckedChange={updateHideEmployeesWithoutSchengenTrips}
              disabled={isPending}
            />
            <Label
              htmlFor="calendar-hide-no-schengen"
              className="cursor-pointer text-sm text-slate-700"
            >
              Only show employees with Schengen trips
            </Label>
          </div>
        </div>
      </div>

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
    </div>
  )
}
