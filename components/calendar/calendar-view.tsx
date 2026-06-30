'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isSchengenCountry } from '@/lib/compliance'
import { addUtcDays, toUTCMidnight } from '@/lib/compliance/date-utils'
import { formatDateForDisplay } from '@/lib/validations/dates'
import { getCountryName } from '@/lib/constants/schengen-countries'
import { serializeHideNoSchengenCookie } from '@/lib/calendar/filter-preferences'
import { buildDateRange, toDateKey } from './calendar-view.utils'
import {
  buildEmployeeProcessingCacheKey,
  getCalendarRiskSummary,
  processCalendarEmployee,
  type EmployeeWithTrips,
  type ProcessedEmployeeCacheEntry,
} from './calendar-view.helpers'
import { useCalendarTripActions } from './use-calendar-trip-actions'
import { CalendarToolbar } from './calendar-toolbar'
import { CalendarEmptyState } from './calendar-empty-state'
import { CALENDAR_ZOOM_WIDTHS, type CalendarZoomLevel } from './zoom-controls'
import { InteractiveTripEditor } from './interactive-trip-editor'
import type { ProcessedEmployee } from './types'

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

interface CalendarViewProps {
  employees: EmployeeWithTrips[]
  initialHideEmployeesWithoutSchengenTrips?: boolean
  interactive?: boolean
}

/**
 * Main calendar view — orchestrates the Gantt chart and mobile list.
 *
 * Trip mutations live in {@link useCalendarTripActions}; compliance processing
 * lives in calendar-view.helpers.ts. This component wires data shaping, the
 * filter/range/zoom controls, and rendering together.
 */
export function CalendarView({
  employees,
  initialHideEmployeesWithoutSchengenTrips = false,
  interactive = false,
}: CalendarViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [weeksForward, setWeeksForward] = useState(DEFAULT_WEEKS_FORWARD)
  const [zoomLevel, setZoomLevel] = useState<CalendarZoomLevel>('month')
  const [hideEmployeesWithoutSchengenTrips, setHideEmployeesWithoutSchengenTrips] =
    useState(initialHideEmployeesWithoutSchengenTrips)
  const processedEmployeeCacheRef = useRef(
    new Map<string, ProcessedEmployeeCacheEntry>()
  )

  const tripActions = useCalendarTripActions(employees)

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
    const todayKey = toDateKey(today)
    const visibleEmployeeIds = new Set<string>()
    /* eslint-disable react-hooks/refs --
       Intentional per-employee memoization cache keyed by cacheKey. Reading and
       writing this ref during render is a pure recompute-skip: it never changes
       what is rendered, only avoids reprocessing unchanged employees. */
    const cache = processedEmployeeCacheRef.current

    const nextEmployees = filteredEmployees.map((employee) => {
      visibleEmployeeIds.add(employee.id)

      const cacheKey = buildEmployeeProcessingCacheKey({
        employee,
        tripDateOverrides: tripActions.tripDateOverrides,
        startDateKey,
        endDateKey,
        todayKey,
      })
      const cached = cache.get(employee.id)

      if (cached?.cacheKey === cacheKey) {
        return cached.employee
      }

      const processedEmployee = processCalendarEmployee({
        employee,
        tripDateOverrides: tripActions.tripDateOverrides,
        startDate,
        endDate,
        today,
      })

      cache.set(employee.id, {
        cacheKey,
        employee: processedEmployee,
      })

      return processedEmployee
    })

    for (const employeeId of cache.keys()) {
      if (!visibleEmployeeIds.has(employeeId)) {
        cache.delete(employeeId)
      }
    }
    /* eslint-enable react-hooks/refs */

    return nextEmployees
  }, [filteredEmployees, startDate, endDate, startDateKey, endDateKey, tripActions.tripDateOverrides])

  const riskSummary = useMemo(
    () => getCalendarRiskSummary(processedEmployees),
    [processedEmployees]
  )
  const visibleEmployeeLabel = `${processedEmployees.length} ${
    processedEmployees.length === 1 ? 'employee' : 'employees'
  }`

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
    <div className="min-w-0 space-y-3">
      {interactive && (
        <>
          <InteractiveTripEditor
            draft={tripActions.tripEditorDraft}
            onOpenChange={(open) => {
              if (!open) {
                tripActions.closeTripEditor()
              }
            }}
          />

          <Dialog
            open={tripActions.tripMoveDraft !== null}
            onOpenChange={(open) => {
              if (!open && !tripActions.isMovingTrip) {
                tripActions.closeTripMove()
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Move trip?</DialogTitle>
                <DialogDescription>
                  {tripActions.tripMoveDraft
                    ? `Move ${tripActions.tripMoveDraft.country} trip (${tripActions.tripMoveDraft.entryDateKey} to ${tripActions.tripMoveDraft.exitDateKey}) from ${tripActions.tripMoveDraft.sourceEmployeeName} to ${tripActions.tripMoveDraft.targetEmployeeName}?`
                    : 'Move this trip to another employee?'}
                </DialogDescription>
                {tripActions.tripMoveError && (
                  <p className="text-sm font-medium text-red-600">
                    {tripActions.tripMoveError}
                  </p>
                )}
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={tripActions.closeTripMove}
                  disabled={tripActions.isMovingTrip}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={tripActions.confirmMoveTrip}
                  disabled={tripActions.isMovingTrip}
                >
                  {tripActions.isMovingTrip ? 'Moving...' : 'Move Trip'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={tripActions.tripDeleteDraft !== null}
            onOpenChange={(open) => {
              if (!open && !tripActions.isDeletingTrip) {
                tripActions.closeTripDelete()
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete trip?</AlertDialogTitle>
                <AlertDialogDescription>
                  {tripActions.tripDeleteDraft
                    ? `Delete ${getCountryName(tripActions.tripDeleteDraft.trip.rawCountry)} trip (${formatDateForDisplay(toDateKey(tripActions.tripDeleteDraft.trip.entryDate))} - ${formatDateForDisplay(toDateKey(tripActions.tripDeleteDraft.trip.exitDate))}) for ${tripActions.tripDeleteDraft.employeeName}? This cannot be undone.`
                    : 'Delete this trip?'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={tripActions.isDeletingTrip}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={tripActions.confirmDeleteTrip}
                  disabled={tripActions.isDeletingTrip}
                >
                  {tripActions.isDeletingTrip ? 'Deleting...' : 'Delete Trip'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Desktop view - Gantt chart */}
      <div className="hidden min-w-0 md:block">
        <Card className="h-[calc(100vh-13rem)] min-h-[560px] min-w-0 gap-0 overflow-hidden rounded-xl border-slate-200 py-0 shadow-sm">
          <CalendarToolbar
            visibleEmployeeLabel={visibleEmployeeLabel}
            isPending={isPending}
            weeksForward={weeksForward}
            onWeeksForwardChange={setWeeksForward}
            interactive={interactive}
            zoomLevel={zoomLevel}
            onZoomLevelChange={setZoomLevel}
            hideEmployeesWithoutSchengenTrips={hideEmployeesWithoutSchengenTrips}
            onHideChange={updateHideEmployeesWithoutSchengenTrips}
          />
          <CardContent className="min-h-0 min-w-0 flex-1 p-0">
            <GanttChart
              employees={processedEmployees}
              dates={dates}
              dayWidth={CALENDAR_ZOOM_WIDTHS[zoomLevel]}
              className="h-full"
              interactive={interactive}
              onCreateTrip={interactive ? tripActions.openCreateTrip : undefined}
              onEditTrip={interactive ? tripActions.openEditTrip : undefined}
              onDeleteTrip={interactive ? tripActions.requestDeleteTrip : undefined}
              onResizeTrip={interactive ? tripActions.resizeTrip : undefined}
              onShiftTripDates={interactive ? tripActions.shiftTripDates : undefined}
              onMoveTrip={interactive ? tripActions.requestMoveTrip : undefined}
              copiedTrip={interactive ? tripActions.copiedTrip : null}
              onCopyTrip={interactive ? tripActions.copyTrip : undefined}
              onPasteTrip={interactive ? tripActions.pasteTrip : undefined}
              onToggleTripPrivacy={interactive ? tripActions.toggleTripPrivacy : undefined}
              onOpenEmployeeProfile={
                interactive
                  ? (employeeId) => router.push(`/employee/${employeeId}`)
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Mobile view - simplified list */}
      <div className="space-y-3 md:hidden">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">
                Showing {visibleEmployeeLabel}
              </p>
              <p className="text-xs text-slate-500">
                {riskSummary.warning + riskSummary.critical + riskSummary.breach} employees need review
                {isPending ? ' · refreshing…' : ' · saved for your next visit'}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="calendar-hide-no-schengen-mobile"
                className="cursor-pointer text-sm text-slate-700"
              >
                Schengen trips only
              </Label>
              <Switch
                id="calendar-hide-no-schengen-mobile"
                checked={hideEmployeesWithoutSchengenTrips}
                onCheckedChange={updateHideEmployeesWithoutSchengenTrips}
                disabled={isPending}
              />
            </div>
          </div>
        </div>
        <MobileCalendarView employees={processedEmployees} />
      </div>
    </div>
  )
}
