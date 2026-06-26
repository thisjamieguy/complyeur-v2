'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  deleteTripAction,
  reassignTripAction,
  updateTripAssignmentAction,
  updateTripAction,
} from '@/app/(dashboard)/actions'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { showError, showSuccess } from '@/lib/toast'
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
import {
  checkTripOverlap,
  type TripOverlapResult,
} from '@/lib/validations/trip-overlap'
import { formatDateForDisplay } from '@/lib/validations/dates'
import { getCountryName } from '@/lib/constants/schengen-countries'
import { RangeSelector } from './range-selector'
import {
  buildDateRange,
  overlapsVisibleRange,
  toDateKey,
} from './calendar-view.utils'
import { CalendarEmptyState } from './calendar-empty-state'
import { serializeHideNoSchengenCookie } from '@/lib/calendar/filter-preferences'
import {
  CALENDAR_ZOOM_WIDTHS,
  ZoomControls,
  type CalendarZoomLevel,
} from './zoom-controls'
import {
  InteractiveTripEditor,
  type TripEditorDraft,
} from './interactive-trip-editor'
import type {
  ProcessedTrip,
  ProcessedEmployee,
  TripDateShiftRequest,
  TripDeleteRequest,
  TripEditRequest,
  TripMoveRequest,
  TripResizeRequest,
} from './types'

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
  job_ref?: string | null
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
  interactive?: boolean
}

interface ParsedTrip extends DbTrip {
  entryDate: Date
  exitDate: Date
  isSchengen: boolean
}

type TripDateOverride = { entry_date: string; exit_date: string }

interface ProcessedEmployeeCacheEntry {
  cacheKey: string
  employee: ProcessedEmployee
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

function getOverlapMessage(
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

function buildEmployeeProcessingCacheKey({
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

function processCalendarEmployee({
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

/**
 * Main calendar view component - orchestrates Gantt chart and mobile view
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
  const [tripEditorDraft, setTripEditorDraft] = useState<TripEditorDraft | null>(null)
  const [tripDeleteDraft, setTripDeleteDraft] = useState<TripDeleteRequest | null>(null)
  const [isDeletingTrip, setIsDeletingTrip] = useState(false)
  const [tripMoveDraft, setTripMoveDraft] = useState<TripMoveRequest | null>(null)
  const [tripMoveError, setTripMoveError] = useState<string | null>(null)
  const [isMovingTrip, setIsMovingTrip] = useState(false)
  const [tripDateOverrides, setTripDateOverrides] = useState(
    () => new Map<string, TripDateOverride>()
  )
  const [hideEmployeesWithoutSchengenTrips, setHideEmployeesWithoutSchengenTrips] =
    useState(initialHideEmployeesWithoutSchengenTrips)
  const processedEmployeeCacheRef = useRef(
    new Map<string, ProcessedEmployeeCacheEntry>()
  )

  useEffect(() => {
    setHideEmployeesWithoutSchengenTrips(initialHideEmployeesWithoutSchengenTrips)
  }, [initialHideEmployeesWithoutSchengenTrips])

  useEffect(() => {
    setTripDateOverrides((current) => {
      if (current.size === 0) {
        return current
      }

      const sourceDatesByTrip = new Map<string, { entry_date: string; exit_date: string }>()
      for (const employee of employees) {
        for (const trip of employee.trips) {
          sourceDatesByTrip.set(trip.id, {
            entry_date: trip.entry_date,
            exit_date: trip.exit_date,
          })
        }
      }

      let changed = false
      const next = new Map(current)
      for (const [tripId, override] of current) {
        const sourceDates = sourceDatesByTrip.get(tripId)
        if (
          !sourceDates ||
          (sourceDates.entry_date === override.entry_date &&
            sourceDates.exit_date === override.exit_date)
        ) {
          next.delete(tripId)
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [employees])

  const updateHideEmployeesWithoutSchengenTrips = (enabled: boolean) => {
    setHideEmployeesWithoutSchengenTrips(enabled)

    if (typeof document !== 'undefined') {
      document.cookie = serializeHideNoSchengenCookie(enabled)
    }

    startTransition(() => {
      router.refresh()
    })
  }

  const openCreateTrip = ({
    employeeId,
    employeeName,
    dateKey,
  }: {
    employeeId: string
    employeeName: string
    dateKey: string
  }) => {
    setTripEditorDraft({
      mode: 'create',
      employeeId,
      employeeName,
      entryDate: dateKey,
      exitDate: dateKey,
    })
  }

  const openEditTrip = ({ employeeId, employeeName, trip }: TripEditRequest) => {
    setTripEditorDraft({
      mode: 'edit',
      employeeId,
      employeeName,
      tripId: trip.id,
      country: trip.rawCountry,
      entryDate: toDateKey(trip.entryDate),
      exitDate: toDateKey(trip.exitDate),
      purpose: trip.purpose,
      jobRef: trip.jobRef,
      isPrivate: trip.isPrivate,
      ghosted: trip.ghosted,
    })
  }

  const requestDeleteTrip = (request: TripDeleteRequest) => {
    setTripDeleteDraft(request)
  }

  const confirmDeleteTrip = async () => {
    if (!tripDeleteDraft) return

    setIsDeletingTrip(true)

    try {
      await deleteTripAction(tripDeleteDraft.trip.id, tripDeleteDraft.employeeId)
      setTripDateOverrides((current) => {
        if (!current.has(tripDeleteDraft.trip.id)) {
          return current
        }

        const next = new Map(current)
        next.delete(tripDeleteDraft.trip.id)
        return next
      })
      showSuccess('Trip deleted successfully')
      setTripDeleteDraft(null)
      router.refresh()
    } catch (error) {
      showError(
        'Failed to delete trip',
        error instanceof Error ? error.message : 'Please try again.'
      )
    } finally {
      setIsDeletingTrip(false)
    }
  }

  const resizeTrip = async ({
    tripId,
    employeeId,
    edge,
    dateKey,
    originalEntryDateKey,
    originalExitDateKey,
  }: TripResizeRequest) => {
    const nextEntryDate = edge === 'start' ? dateKey : originalEntryDateKey
    const nextExitDate = edge === 'end' ? dateKey : originalExitDateKey

    if (nextEntryDate > nextExitDate) {
      showError('Invalid date range', 'Entry date must be on or before exit date.')
      return
    }

    const overlapResult = await checkTripOverlap(
      employeeId,
      nextEntryDate,
      nextExitDate,
      tripId
    )

    if (overlapResult.hasOverlap) {
      showError('Trip overlap detected', `Cannot resize trip. ${getOverlapMessage(overlapResult)}`)
      return
    }

    setTripDateOverrides((current) => {
      const next = new Map(current)
      next.set(tripId, {
        entry_date: nextEntryDate,
        exit_date: nextExitDate,
      })
      return next
    })

    try {
      await updateTripAction(tripId, employeeId, {
        entry_date: edge === 'start' ? dateKey : undefined,
        exit_date: edge === 'end' ? dateKey : undefined,
      })
      showSuccess('Trip dates updated')
      router.refresh()
    } catch (error) {
      setTripDateOverrides((current) => {
        const next = new Map(current)
        next.set(tripId, {
          entry_date: originalEntryDateKey,
          exit_date: originalExitDateKey,
        })
        return next
      })
      showError(
        'Failed to update trip',
        error instanceof Error ? error.message : 'Please try again.'
      )
    }
  }

  const shiftTripDates = async ({
    tripId,
    employeeId,
    entryDateKey,
    exitDateKey,
    originalEntryDateKey,
    originalExitDateKey,
  }: TripDateShiftRequest) => {
    if (
      entryDateKey === originalEntryDateKey &&
      exitDateKey === originalExitDateKey
    ) {
      return
    }

    if (entryDateKey > exitDateKey) {
      showError('Invalid date range', 'Entry date must be on or before exit date.')
      return
    }

    const overlapResult = await checkTripOverlap(
      employeeId,
      entryDateKey,
      exitDateKey,
      tripId
    )

    if (overlapResult.hasOverlap) {
      showError('Trip overlap detected', `Cannot shift trip. ${getOverlapMessage(overlapResult)}`)
      return
    }

    setTripDateOverrides((current) => {
      const next = new Map(current)
      next.set(tripId, {
        entry_date: entryDateKey,
        exit_date: exitDateKey,
      })
      return next
    })

    try {
      await updateTripAction(tripId, employeeId, {
        entry_date: entryDateKey,
        exit_date: exitDateKey,
      })
      showSuccess('Trip dates updated')
      router.refresh()
    } catch (error) {
      setTripDateOverrides((current) => {
        const next = new Map(current)
        next.set(tripId, {
          entry_date: originalEntryDateKey,
          exit_date: originalExitDateKey,
        })
        return next
      })
      showError(
        'Failed to update trip',
        error instanceof Error ? error.message : 'Please try again.'
      )
    }
  }

  const requestMoveTrip = (request: TripMoveRequest) => {
    if (request.sourceEmployeeId === request.targetEmployeeId) {
      if (
        request.entryDateKey !== request.originalEntryDateKey ||
        request.exitDateKey !== request.originalExitDateKey
      ) {
        void shiftTripDates({
          tripId: request.tripId,
          employeeId: request.sourceEmployeeId,
          entryDateKey: request.entryDateKey,
          exitDateKey: request.exitDateKey,
          originalEntryDateKey: request.originalEntryDateKey,
          originalExitDateKey: request.originalExitDateKey,
        })
      }

      return
    }

    setTripMoveError(null)
    setTripMoveDraft(request)
  }

  const confirmMoveTrip = async () => {
    if (!tripMoveDraft) return

    setIsMovingTrip(true)
    setTripMoveError(null)
    try {
      const overlapResult = await checkTripOverlap(
        tripMoveDraft.targetEmployeeId,
        tripMoveDraft.entryDateKey,
        tripMoveDraft.exitDateKey,
        tripMoveDraft.tripId
      )

      if (overlapResult.hasOverlap) {
        const message = `Cannot move trip. ${getOverlapMessage(
          overlapResult,
          tripMoveDraft.targetEmployeeName
        )}`
        setTripMoveError(message)
        showError('Trip overlap detected', message)
        return
      }

      const datesChanged =
        tripMoveDraft.entryDateKey !== tripMoveDraft.originalEntryDateKey ||
        tripMoveDraft.exitDateKey !== tripMoveDraft.originalExitDateKey

      if (datesChanged) {
        await updateTripAssignmentAction(
          tripMoveDraft.tripId,
          tripMoveDraft.sourceEmployeeId,
          tripMoveDraft.targetEmployeeId,
          {
            entry_date: tripMoveDraft.entryDateKey,
            exit_date: tripMoveDraft.exitDateKey,
          }
        )
      } else {
        await reassignTripAction(
          tripMoveDraft.tripId,
          tripMoveDraft.sourceEmployeeId,
          tripMoveDraft.targetEmployeeId
        )
      }

      showSuccess(datesChanged ? 'Trip moved and dates updated' : 'Trip moved successfully')
      setTripMoveDraft(null)
      router.refresh()
    } catch (error) {
      showError(
        'Failed to move trip',
        error instanceof Error ? error.message : 'Please try again.'
      )
    } finally {
      setIsMovingTrip(false)
    }
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
    const cache = processedEmployeeCacheRef.current

    const nextEmployees = filteredEmployees.map((employee) => {
      visibleEmployeeIds.add(employee.id)

      const cacheKey = buildEmployeeProcessingCacheKey({
        employee,
        tripDateOverrides,
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
        tripDateOverrides,
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

    return nextEmployees
  }, [filteredEmployees, startDate, endDate, startDateKey, endDateKey, tripDateOverrides])

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
      {interactive && (
        <>
          <InteractiveTripEditor
            draft={tripEditorDraft}
            onOpenChange={(open) => {
              if (!open) {
                setTripEditorDraft(null)
              }
            }}
          />

          <Dialog
            open={tripMoveDraft !== null}
            onOpenChange={(open) => {
              if (!open && !isMovingTrip) {
                setTripMoveError(null)
                setTripMoveDraft(null)
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Move trip?</DialogTitle>
                <DialogDescription>
                  {tripMoveDraft
                    ? `Move ${tripMoveDraft.country} trip (${tripMoveDraft.entryDateKey} to ${tripMoveDraft.exitDateKey}) from ${tripMoveDraft.sourceEmployeeName} to ${tripMoveDraft.targetEmployeeName}?`
                    : 'Move this trip to another employee?'}
                </DialogDescription>
                {tripMoveError && (
                  <p className="text-sm font-medium text-red-600">
                    {tripMoveError}
                  </p>
                )}
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTripMoveDraft(null)}
                  disabled={isMovingTrip}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmMoveTrip}
                  disabled={isMovingTrip}
                >
                  {isMovingTrip ? 'Moving...' : 'Move Trip'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={tripDeleteDraft !== null}
            onOpenChange={(open) => {
              if (!open && !isDeletingTrip) {
                setTripDeleteDraft(null)
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete trip?</AlertDialogTitle>
                <AlertDialogDescription>
                  {tripDeleteDraft
                    ? `Delete ${getCountryName(tripDeleteDraft.trip.rawCountry)} trip (${formatDateForDisplay(toDateKey(tripDeleteDraft.trip.entryDate))} - ${formatDateForDisplay(toDateKey(tripDeleteDraft.trip.exitDate))}) for ${tripDeleteDraft.employeeName}? This cannot be undone.`
                    : 'Delete this trip?'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingTrip}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmDeleteTrip}
                  disabled={isDeletingTrip}
                >
                  {isDeletingTrip ? 'Deleting...' : 'Delete Trip'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

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
            {interactive && (
              <ZoomControls value={zoomLevel} onChange={setZoomLevel} />
            )}
          </CardHeader>
          <CardContent className="p-0">
            <GanttChart
              employees={processedEmployees}
              dates={dates}
              dayWidth={CALENDAR_ZOOM_WIDTHS[zoomLevel]}
              interactive={interactive}
              onCreateTrip={interactive ? openCreateTrip : undefined}
              onEditTrip={interactive ? openEditTrip : undefined}
              onDeleteTrip={interactive ? requestDeleteTrip : undefined}
              onResizeTrip={interactive ? resizeTrip : undefined}
              onShiftTripDates={interactive ? shiftTripDates : undefined}
              onMoveTrip={interactive ? requestMoveTrip : undefined}
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
