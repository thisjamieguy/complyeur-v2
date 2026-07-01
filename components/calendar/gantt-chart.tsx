'use client'

import { memo, useMemo, useRef, useEffect, useState } from 'react'
import { useVirtualizer, type Rect, type Virtualizer } from '@tanstack/react-virtual'
import { format, isToday, isWeekend } from 'date-fns'
import {
  Briefcase,
  CalendarPlus,
  Clipboard,
  Copy,
  ExternalLink,
  Lock,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { addUtcDays, toUTCMidnight } from '@/lib/compliance/date-utils'
import { parseDateOnlyAsUTC } from '@/lib/compliance'
import { cn } from '@/lib/utils'
import { DateHeader } from './date-header'
import { EmployeeRow } from './employee-row'
import { GRID_ROW_HEIGHT } from './day-cell'
import { TripPopover } from './trip-popover'
import { buildTripDay } from './calendar-view.utils'
import { emitCalendarMetric } from './calendar-metrics'
import type {
  CalendarEmployeeContextMenuRequest,
  CalendarCopiedTrip,
  CalendarPasteTripRequest,
  CalendarTripDetailsRequest,
  ProcessedEmployee,
  ProcessedTripDay,
  TripDateShiftRequest,
  TripDeleteRequest,
  TripEditRequest,
  TripMoveRequest,
  TripResizeRequest,
} from './types'

/** Pre-computed metadata for each date column — avoids O(employees x dates) calls */
export interface DateMeta {
  date: Date
  key: string        // 'yyyy-MM-dd'
  isWeekend: boolean
  isToday: boolean
  isMonthStart: boolean
  monthLabel: string
  isInRollingWindow: boolean
  isRollingWindowStart: boolean
  isRollingWindowEnd: boolean
  dayOfWeek: string  // single letter (M, T, W, ...)
  dayOfMonth: string // 1-31
}

/** Width of employee name column */
const NAME_COLUMN_WIDTH = 224

/** Height of 180-day window indicator row */
const WINDOW_INDICATOR_HEIGHT = 18

/**
 * Extra rows to render above/below the viewport. Kept small and constant:
 * each row mounts one DayCell per date column, so large or scroll-triggered
 * overscan changes stall frames exactly when the user is flinging the list
 * (measured: escalating overscan mid-scroll produced 600ms+ frames). Four rows
 * balances mount batch size against blank-row flashes when flinging.
 */
const OVERSCAN_ROWS = 4

/** Emit scroll metrics in smaller batches so short-but-real scroll sessions are captured. */
const SCROLL_METRIC_BATCH_SIZE = 10
const FALLBACK_RECT_CHECK_FRAMES = 20
const FALLBACK_RECT_CHECK_INTERVAL_MS = 500

function getElementRect(element: HTMLElement): Rect {
  return {
    width: element.offsetWidth,
    height: element.offsetHeight,
  }
}

export function observeCalendarElementRect(
  instance: Virtualizer<HTMLDivElement, Element>,
  cb: (rect: Rect) => void
): (() => void) | undefined {
  const element = instance.scrollElement
  const targetWindow = instance.targetWindow

  if (!element || !targetWindow) return

  let lastRect: Rect | null = null

  const notifyIfChanged = () => {
    const rect = getElementRect(element)
    if (lastRect?.width === rect.width && lastRect.height === rect.height) {
      return
    }

    lastRect = rect
    cb(rect)
  }

  notifyIfChanged()

  if (targetWindow.ResizeObserver) {
    const observer = new targetWindow.ResizeObserver(() => notifyIfChanged())
    observer.observe(element, { box: 'border-box' })
    const frameId = targetWindow.requestAnimationFrame(notifyIfChanged)

    return () => {
      targetWindow.cancelAnimationFrame(frameId)
      observer.unobserve(element)
    }
  }

  let frameCount = 0
  let frameId: number | null = null

  const checkNextFrame = () => {
    notifyIfChanged()
    frameCount += 1

    if (frameCount < FALLBACK_RECT_CHECK_FRAMES) {
      frameId = targetWindow.requestAnimationFrame(checkNextFrame)
    }
  }

  frameId = targetWindow.requestAnimationFrame(checkNextFrame)
  const intervalId = targetWindow.setInterval(
    notifyIfChanged,
    FALLBACK_RECT_CHECK_INTERVAL_MS
  )

  return () => {
    if (frameId !== null) {
      targetWindow.cancelAnimationFrame(frameId)
    }
    targetWindow.clearInterval(intervalId)
  }
}

const employeeRiskStyles: Record<
  ProcessedEmployee['currentRiskLevel'],
  { avatar: string }
> = {
  green: {
    avatar: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  amber: {
    avatar: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  red: {
    avatar: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  breach: {
    avatar: 'border-rose-700 bg-rose-700 text-white',
  },
}

function getEmployeeInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

interface GanttChartProps {
  employees: ProcessedEmployee[]
  dates: Date[]
  dayWidth: number
  interactive?: boolean
  className?: string
  onCreateTrip?: (params: {
    employeeId: string
    employeeName: string
    dateKey: string
  }) => void
  onEditTrip?: (params: TripEditRequest) => void
  onDeleteTrip?: (params: TripDeleteRequest) => void
  onResizeTrip?: (params: TripResizeRequest) => void
  onShiftTripDates?: (params: TripDateShiftRequest) => void
  onMoveTrip?: (params: TripMoveRequest) => void
  copiedTrip?: CalendarCopiedTrip | null
  onCopyTrip?: (params: TripEditRequest) => void
  onPasteTrip?: (params: CalendarPasteTripRequest) => void
  onToggleTripPrivacy?: (params: TripEditRequest) => void
  onOpenEmployeeProfile?: (employeeId: string) => void
}

interface CalendarGridContextMenuProps {
  contextMenu: CalendarEmployeeContextMenuRequest | null
  copiedTrip?: CalendarCopiedTrip | null
  onOpenChange: (open: boolean) => void
  onCreateTrip?: GanttChartProps['onCreateTrip']
  onEditTrip?: GanttChartProps['onEditTrip']
  onDeleteTrip?: GanttChartProps['onDeleteTrip']
  onCopyTrip?: GanttChartProps['onCopyTrip']
  onPasteTrip?: GanttChartProps['onPasteTrip']
  onToggleTripPrivacy?: GanttChartProps['onToggleTripPrivacy']
  onOpenEmployeeProfile?: GanttChartProps['onOpenEmployeeProfile']
}

function CalendarGridContextMenu({
  contextMenu,
  copiedTrip,
  onOpenChange,
  onCreateTrip,
  onEditTrip,
  onDeleteTrip,
  onCopyTrip,
  onPasteTrip,
  onToggleTripPrivacy,
  onOpenEmployeeProfile,
}: CalendarGridContextMenuProps) {
  const trip = contextMenu?.trip
  const hasCopiedTrip = copiedTrip !== null && copiedTrip !== undefined
  const menuLabel = trip
    ? `${trip.isPrivate ? 'Private' : trip.country} trip`
    : contextMenu
      ? `${contextMenu.employeeName} - ${contextMenu.dateKey}`
      : 'Calendar menu'

  return (
    <DropdownMenu open={contextMenu !== null} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden="true"
          className="pointer-events-none fixed size-px opacity-0"
          style={{
            left: contextMenu?.x ?? -9999,
            top: contextMenu?.y ?? -9999,
          }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={4}
        collisionPadding={8}
        className="w-44"
      >
        <DropdownMenuLabel className="truncate text-xs text-slate-500">
          {menuLabel}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={!contextMenu || !onCreateTrip}
            onSelect={() => {
              if (!contextMenu || !onCreateTrip) return

              onCreateTrip({
                employeeId: contextMenu.employeeId,
                employeeName: contextMenu.employeeName,
                dateKey: contextMenu.dateKey,
              })
              onOpenChange(false)
            }}
          >
            <CalendarPlus />
            Add trip
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!contextMenu || !hasCopiedTrip || !onPasteTrip}
            onSelect={() => {
              if (!contextMenu || !hasCopiedTrip || !onPasteTrip) return

              onPasteTrip({
                employeeId: contextMenu.employeeId,
                employeeName: contextMenu.employeeName,
                dateKey: contextMenu.dateKey,
              })
              onOpenChange(false)
            }}
          >
            <Clipboard />
            Paste trip here
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {trip && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={!contextMenu || !onEditTrip}
                onSelect={() => {
                  if (!contextMenu || !onEditTrip) return

                  onEditTrip({
                    employeeId: contextMenu.employeeId,
                    employeeName: contextMenu.employeeName,
                    trip,
                  })
                  onOpenChange(false)
                }}
              >
                <Pencil />
                Edit trip
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!contextMenu || !onCopyTrip}
                onSelect={() => {
                  if (!contextMenu || !onCopyTrip) return

                  onCopyTrip({
                    employeeId: contextMenu.employeeId,
                    employeeName: contextMenu.employeeName,
                    trip,
                  })
                  onOpenChange(false)
                }}
              >
                <Copy />
                Copy trip
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!contextMenu || !onToggleTripPrivacy}
                onSelect={() => {
                  if (!contextMenu || !onToggleTripPrivacy) return

                  onToggleTripPrivacy({
                    employeeId: contextMenu.employeeId,
                    employeeName: contextMenu.employeeName,
                    trip,
                  })
                  onOpenChange(false)
                }}
              >
                {trip.isPrivate ? <Briefcase /> : <Lock />}
                {trip.isPrivate ? 'Mark as work trip' : 'Mark as private'}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={!contextMenu || !onDeleteTrip}
                onSelect={() => {
                  if (!contextMenu || !onDeleteTrip) return

                  onDeleteTrip({
                    employeeId: contextMenu.employeeId,
                    employeeName: contextMenu.employeeName,
                    trip,
                  })
                  onOpenChange(false)
                }}
              >
                <Trash2 />
                Delete trip
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={!contextMenu || !onOpenEmployeeProfile}
            onSelect={() => {
              if (!contextMenu || !onOpenEmployeeProfile) return

              onOpenEmployeeProfile(contextMenu.employeeId)
              onOpenChange(false)
            }}
          >
            <ExternalLink />
            Go to employee profile
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ResolvedTripDetails extends CalendarTripDetailsRequest {
  tripDay: ProcessedTripDay
}

interface CalendarTripDetailsPopoverProps {
  details: ResolvedTripDetails | null
  interactive: boolean
  onOpenChange: (open: boolean) => void
  onEditTrip?: GanttChartProps['onEditTrip']
  onDeleteTrip?: GanttChartProps['onDeleteTrip']
}

/**
 * Single shared trip-details popover for the whole grid, anchored to the
 * clicked day cell via an invisible fixed-position trigger (same pattern as
 * the context menu). One Radix root instead of one per rendered trip cell.
 */
function CalendarTripDetailsPopover({
  details,
  interactive,
  onOpenChange,
  onEditTrip,
  onDeleteTrip,
}: CalendarTripDetailsPopoverProps) {
  return (
    <Popover open={details !== null} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span
          aria-hidden="true"
          className="pointer-events-none fixed opacity-0"
          style={{
            left: details?.anchor.x ?? -9999,
            top: details?.anchor.y ?? -9999,
            width: details?.anchor.width ?? 1,
            height: details?.anchor.height ?? 1,
          }}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-4"
        align="center"
        side="top"
        collisionPadding={8}
        onCloseAutoFocus={(event) => {
          // Return focus to the day cell that opened the popover; the trigger
          // span is decorative and cannot receive focus.
          if (details?.sourceElement?.isConnected) {
            event.preventDefault()
            details.sourceElement.focus()
          }
        }}
      >
        {details && (
          <TripPopover
            tripDay={details.tripDay}
            onEditTrip={
              interactive && onEditTrip
                ? (trip) => {
                    onEditTrip({
                      employeeId: details.employeeId,
                      employeeName: details.employeeName,
                      trip,
                    })
                    onOpenChange(false)
                  }
                : undefined
            }
            onDeleteTrip={
              interactive && onDeleteTrip
                ? (trip) => {
                    onDeleteTrip({
                      employeeId: details.employeeId,
                      employeeName: details.employeeName,
                      trip,
                    })
                    onOpenChange(false)
                  }
                : undefined
            }
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Spreadsheet-style grid showing all employees and their trips.
 * Uses virtualization to only render visible employee rows.
 * Employee names column is fixed and doesn't scroll horizontally.
 */
export const GanttChart = memo(function GanttChart({
  employees,
  dates,
  dayWidth,
  interactive = false,
  onCreateTrip,
  onEditTrip,
  onDeleteTrip,
  onResizeTrip,
  onShiftTripDates,
  onMoveTrip,
  copiedTrip = null,
  onCopyTrip,
  onPasteTrip,
  onToggleTripPrivacy,
  onOpenEmployeeProfile,
  className,
}: GanttChartProps) {
  const [dropTargetEmployeeId, setDropTargetEmployeeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] =
    useState<CalendarEmployeeContextMenuRequest | null>(null)
  const [tripDetails, setTripDetails] =
    useState<CalendarTripDetailsRequest | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const mountStartedAtRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : 0
  )
  const scrollSampleRef = useRef({
    samples: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
  })
  const mountMetricEmittedRef = useRef(false)
  const previousVisibleRowsRef = useRef<number>(-1)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const namesScrollRef = useRef<HTMLDivElement>(null)
  const namesRowsRef = useRef<HTMLDivElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)

  // Set up virtualizer for employee rows — fixed height, no per-row calculation
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: employees.length,
    getScrollElement: () => timelineScrollRef.current,
    estimateSize: () => GRID_ROW_HEIGHT,
    overscan: OVERSCAN_ROWS,
    observeElementRect: observeCalendarElementRect,
  })

  // Sync vertical scroll from timeline to names column.
  // One-way syncing avoids scroll-event feedback loops/jitter.
  useEffect(() => {
    const namesEl = namesScrollRef.current
    const timelineEl = timelineScrollRef.current

    if (!namesEl || !timelineEl) return

    const syncNamesToTimeline = () => {
      if (!namesRowsRef.current) return

      namesRowsRef.current.style.transform = `translate3d(0, -${timelineEl.scrollTop}px, 0)`
    }

    const flushScrollMetric = (source: 'timeline_scroll' | 'names_wheel') => {
      const snapshot = scrollSampleRef.current
      if (snapshot.samples === 0) return

      emitCalendarMetric('scroll_sync', {
        source,
        samples: snapshot.samples,
        averageDurationMs: snapshot.totalDurationMs / snapshot.samples,
        maxDurationMs: snapshot.maxDurationMs,
        scrollTop: timelineEl.scrollTop,
      })

      scrollSampleRef.current = {
        samples: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
      }
    }

    const recordScrollSample = (
      source: 'timeline_scroll' | 'names_wheel',
      durationMs: number
    ) => {
      const next = scrollSampleRef.current
      next.samples += 1
      next.totalDurationMs += durationMs
      next.maxDurationMs = Math.max(next.maxDurationMs, durationMs)

      if (next.samples >= SCROLL_METRIC_BATCH_SIZE) {
        flushScrollMetric(source)
      }
    }

    const handleTimelineScroll = () => {
      const startedAt = performance.now()
      syncNamesToTimeline()
      recordScrollSample('timeline_scroll', performance.now() - startedAt)
    }

    const handleNamesWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 0.5) return

      // Keep scrolling behavior consistent when cursor is on the fixed names column.
      event.preventDefault()

      const startedAt = performance.now()
      timelineEl.scrollTop += event.deltaY
      syncNamesToTimeline()
      recordScrollSample('names_wheel', performance.now() - startedAt)
    }

    // Ensure initial alignment on mount.
    syncNamesToTimeline()
    timelineEl.addEventListener('scroll', handleTimelineScroll, { passive: true })
    namesEl.addEventListener('wheel', handleNamesWheel, { passive: false })

    return () => {
      flushScrollMetric('timeline_scroll')
      timelineEl.removeEventListener('scroll', handleTimelineScroll)
      namesEl.removeEventListener('wheel', handleNamesWheel)
    }
  }, [])

  // Row-hover highlighting without React re-renders: hovering either column
  // sets data-row-hovered on both DOM rows for that employee; day cells style
  // themselves via the group-data-[row-hovered=true]/calrow variant. Going
  // through state here re-rendered 2 x dates.length cells per row crossed,
  // which visibly stalled scrolling with the pointer over the grid.
  useEffect(() => {
    const namesEl = namesScrollRef.current
    const timelineEl = timelineScrollRef.current

    if (!namesEl || !timelineEl) return

    let hoveredId: string | null = null

    const applyHover = (employeeId: string | null) => {
      if (employeeId === hoveredId) return

      if (hoveredId !== null) {
        for (const row of document.querySelectorAll(
          `[data-calendar-employee-row][data-employee-id="${CSS.escape(hoveredId)}"]`
        )) {
          row.removeAttribute('data-row-hovered')
        }
      }

      hoveredId = employeeId

      if (employeeId !== null) {
        for (const row of document.querySelectorAll(
          `[data-calendar-employee-row][data-employee-id="${CSS.escape(employeeId)}"]`
        )) {
          row.setAttribute('data-row-hovered', 'true')
        }
      }
    }

    const handleMouseOver = (event: MouseEvent) => {
      const row = (event.target as Element | null)?.closest?.(
        '[data-calendar-employee-row]'
      )
      applyHover(row?.getAttribute('data-employee-id') ?? null)
    }

    const clearHover = () => applyHover(null)

    namesEl.addEventListener('mouseover', handleMouseOver)
    timelineEl.addEventListener('mouseover', handleMouseOver)
    namesEl.addEventListener('mouseleave', clearHover)
    timelineEl.addEventListener('mouseleave', clearHover)

    return () => {
      namesEl.removeEventListener('mouseover', handleMouseOver)
      timelineEl.removeEventListener('mouseover', handleMouseOver)
      namesEl.removeEventListener('mouseleave', clearHover)
      timelineEl.removeEventListener('mouseleave', clearHover)
      applyHover(null)
    }
  }, [])

  // Scroll to today on mount (horizontal scroll only)
  useEffect(() => {
    if (scrollContainerRef.current) {
      const todayIndex = dates.findIndex((date) => isToday(date))
      if (todayIndex >= 0) {
        const todayOffset = todayIndex * dayWidth
        const containerWidth = scrollContainerRef.current.clientWidth
        const scrollTo = Math.max(0, todayOffset - containerWidth / 2)
        scrollContainerRef.current.scrollLeft = scrollTo
      }
    }
  }, [dates, dayWidth])

  // Pre-compute per-date flags once — O(dates) instead of O(employees x dates)
  const dateMeta: DateMeta[] = useMemo(
    () => {
      const today = toUTCMidnight(new Date())
      const rollingWindowStart = addUtcDays(today, -179)
      const todayTime = today.getTime()
      const windowStartTime = rollingWindowStart.getTime()

      return dates.map((date) => {
        const dateTime = date.getTime()
        return {
          date,
          key: date.toISOString().split('T')[0],
          isWeekend: isWeekend(date),
          isToday: isToday(date),
          isMonthStart: format(date, 'd') === '1',
          monthLabel: format(date, 'MMM'),
          isInRollingWindow: dateTime >= windowStartTime && dateTime <= todayTime,
          isRollingWindowStart: dateTime === windowStartTime,
          isRollingWindowEnd: dateTime === todayTime,
          dayOfWeek: format(date, 'EEEEE'),
          dayOfMonth: format(date, 'd'),
        }
      })
    },
    [dates]
  )

  // Resolve the open trip-details request against CURRENT data so the popover
  // reflects optimistic updates and server refreshes (and closes itself if
  // the trip is gone).
  const resolvedTripDetails = useMemo((): ResolvedTripDetails | null => {
    if (!tripDetails) return null

    const employee = employees.find((e) => e.id === tripDetails.employeeId)
    const trip = employee?.trips.find((t) => t.id === tripDetails.tripId)
    if (!employee || !trip) return null

    return {
      ...tripDetails,
      tripDay: buildTripDay(
        trip,
        parseDateOnlyAsUTC(tripDetails.dateKey),
        employee.complianceByDate,
        toUTCMidnight(new Date())
      ),
    }
  }, [tripDetails, employees])

  const totalWidth = dates.length * dayWidth
  const totalHeight = virtualizer.getTotalSize()
  const virtualRows = virtualizer.getVirtualItems()
  const visibleRows = virtualRows.length
  const hasContextMenuActions =
    interactive &&
    Boolean(
      onCreateTrip ||
        onEditTrip ||
        onDeleteTrip ||
        onCopyTrip ||
        onPasteTrip ||
        onToggleTripPrivacy ||
        onOpenEmployeeProfile
    )

  useEffect(() => {
    // Emit once, after the virtualizer has measured (visibleRows is 0 until
    // the first rect measurement), so mountMs reflects a usable calendar.
    if (mountMetricEmittedRef.current) return
    if (visibleRows === 0 && employees.length > 0) return

    mountMetricEmittedRef.current = true
    emitCalendarMetric('calendar_mount', {
      employees: employees.length,
      dateColumns: dates.length,
      initialVisibleRows: visibleRows,
      mountMs: performance.now() - mountStartedAtRef.current,
    })
  }, [employees.length, dates.length, visibleRows])

  useEffect(() => {
    if (previousVisibleRowsRef.current === visibleRows) return
    previousVisibleRowsRef.current = visibleRows

    emitCalendarMetric('viewport_rows', {
      visibleRows,
      renderedCells: visibleRows * dates.length,
      totalEmployees: employees.length,
    })
  }, [visibleRows, dates.length, employees.length])

  return (
    <div
      data-testid="calendar-gantt"
      className={cn('flex h-full min-h-0 min-w-0 overflow-hidden', className)}
    >
      {/* Live region: announces keyboard move/resize progress to screen readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {interactive && (
        <p id="calendar-grid-help" className="sr-only">
          To change a trip with the keyboard, move focus to it and press M to move
          or R to resize, then use the left and right arrow keys and press Enter to
          confirm or Escape to cancel.
        </p>
      )}
      <CalendarTripDetailsPopover
        details={resolvedTripDetails}
        interactive={interactive}
        onOpenChange={(open) => {
          if (!open) {
            setTripDetails(null)
          }
        }}
        onEditTrip={onEditTrip}
        onDeleteTrip={onDeleteTrip}
      />
      {hasContextMenuActions && (
        <CalendarGridContextMenu
          contextMenu={contextMenu}
          copiedTrip={copiedTrip}
          onOpenChange={(open) => {
            if (!open) {
              setContextMenu(null)
            }
          }}
          onCreateTrip={onCreateTrip}
          onEditTrip={onEditTrip}
          onDeleteTrip={onDeleteTrip}
          onCopyTrip={onCopyTrip}
          onPasteTrip={onPasteTrip}
          onToggleTripPrivacy={onToggleTripPrivacy}
          onOpenEmployeeProfile={onOpenEmployeeProfile}
        />
      )}

      {/* Fixed left column — employee names (no horizontal scroll).
          Hidden from assistive tech: each grid row carries the employee name and
          status in its aria-label, so announcing this column too would duplicate. */}
      <div
        aria-hidden="true"
        className="z-20 flex h-full shrink-0 flex-col border-r border-slate-200 bg-slate-50/80"
        style={{ width: NAME_COLUMN_WIDTH }}
      >
        {/* Header placeholder — must match 4-row DateHeader height */}
        <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-[0_1px_0_rgba(148,163,184,0.15)]">
          {/* Rolling window indicator placeholder */}
          <div className="bg-slate-50/80 border-b border-slate-100" style={{ height: WINDOW_INDICATOR_HEIGHT }} />
          {/* Week row placeholder */}
          <div className="bg-slate-50/80 border-b border-slate-100" style={{ height: 22 }} />
          {/* Day name row placeholder */}
          <div className="bg-slate-50/80 border-b border-slate-100" style={{ height: 20 }} />
          {/* Date number row with Employee label */}
          <div className="px-3 flex items-center" style={{ height: 24 }}>
            <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
              Employee
            </span>
          </div>
        </div>

        {/* Virtualized employee names */}
        <div
          ref={namesScrollRef}
          data-testid="calendar-names-viewport"
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-hidden"
          style={{ contain: 'layout paint' }}
        >
          <div
            ref={namesRowsRef}
            data-testid="calendar-names-rows"
            className="relative"
            style={{ height: totalHeight, willChange: 'transform' }}
          >
            {virtualRows.map((virtualRow) => {
              const employee = employees[virtualRow.index]
              return (
                <div
                  key={employee.id}
                  className={cn(
                    'absolute left-0 flex w-full items-center border-b border-slate-100 px-3 transition-colors',
                    dropTargetEmployeeId === employee.id
                      ? 'bg-sky-100/70'
                      : 'bg-slate-50/60 data-[row-hovered=true]:bg-sky-50/60'
                  )}
                  style={{
                    height: GRID_ROW_HEIGHT,
                    transform: `translate3d(0, ${virtualRow.start}px, 0)`,
                    willChange: 'transform',
                  }}
                  data-calendar-employee-row
                  data-employee-id={employee.id}
                  data-employee-name={employee.name}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                        employeeRiskStyles[employee.currentRiskLevel].avatar
                      )}
                    >
                      {getEmployeeInitials(employee.name)}
                    </span>
                    <span className="min-w-0 truncate text-[15px] font-semibold leading-none text-slate-900">
                      {employee.name}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right column — horizontally scrollable timeline grid */}
      <div
        ref={scrollContainerRef}
        data-testid="calendar-horizontal-viewport"
        className="h-full min-w-0 flex-1 overflow-x-auto overflow-y-hidden rounded-br-xl"
      >
        <div
          role="grid"
          aria-label="Employee travel timeline"
          aria-rowcount={employees.length + 1}
          aria-colcount={dates.length}
          aria-describedby={interactive ? 'calendar-grid-help' : undefined}
          className="flex h-full min-h-0 flex-col whitespace-nowrap"
          style={{ width: totalWidth }}
        >
          {/* 4-row date header */}
          <DateHeader
            dateMeta={dateMeta}
            dayWidth={dayWidth}
          />

          {/* Virtualized grid rows */}
          <div
            ref={timelineScrollRef}
            role="rowgroup"
            data-testid="calendar-timeline-viewport"
            className="min-h-0 flex-1 overflow-y-auto bg-white"
            style={{ contain: 'layout paint' }}
          >
            <div role="presentation" className="relative" style={{ height: totalHeight }}>
              {virtualRows.map((virtualRow) => {
                const employee = employees[virtualRow.index]
                return (
                  <div
                    key={employee.id}
                    role="presentation"
                    className={cn(
                      'group/calrow absolute left-0 w-full border-b border-slate-100',
                      dropTargetEmployeeId === employee.id && 'bg-sky-50/40'
                    )}
                    data-calendar-employee-row
                    data-employee-id={employee.id}
                    data-employee-name={employee.name}
                    style={{
                      height: GRID_ROW_HEIGHT,
                      transform: `translate3d(0, ${virtualRow.start}px, 0)`,
                      willChange: 'transform',
                    }}
                  >
                    <EmployeeRow
                      employee={employee}
                      rowIndex={virtualRow.index}
                      dateMeta={dateMeta}
                      dayWidth={dayWidth}
                      isDropTarget={dropTargetEmployeeId === employee.id}
                      interactive={interactive}
                      onAnnounce={setAnnouncement}
                      onCreateTrip={onCreateTrip}
                      onOpenTripDetails={setTripDetails}
                      onResizeTrip={onResizeTrip}
                      onShiftTripDates={onShiftTripDates}
                      onMoveTrip={onMoveTrip}
                      onMoveTripTargetChange={setDropTargetEmployeeId}
                      onOpenContextMenu={
                        hasContextMenuActions ? setContextMenu : undefined
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
