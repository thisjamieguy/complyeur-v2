'use client'

import { memo, useMemo, useRef, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { format, isToday, isWeekend } from 'date-fns'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { addUtcDays, toUTCMidnight } from '@/lib/compliance/date-utils'
import { cn } from '@/lib/utils'
import { DateHeader } from './date-header'
import { EmployeeRow } from './employee-row'
import { GRID_ROW_HEIGHT } from './day-cell'
import { syncVerticalScroll } from './scroll-sync'
import { emitCalendarMetric } from './calendar-metrics'
import type { ProcessedEmployee } from './types'

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

/** Width of each day column in pixels */
const DAY_WIDTH = 32

/** Width of employee name column */
const NAME_COLUMN_WIDTH = 160

/** Height of 180-day window indicator row */
const WINDOW_INDICATOR_HEIGHT = 18

/** Max height of the scrollable area */
const MAX_HEIGHT = 600

/** Baseline extra rows to render above/below viewport */
const BASE_OVERSCAN = 12

/** Temporary overscan used when users fling-scroll quickly */
const FAST_SCROLL_OVERSCAN = 28

/** Reset burst overscan shortly after fast scrolling stops */
const FAST_SCROLL_RESET_MS = 180

/** Thresholds to detect high-velocity scrolling */
const FAST_SCROLL_DELTA_THRESHOLD = GRID_ROW_HEIGHT * 2.5
const FAST_SCROLL_VELOCITY_THRESHOLD = 1.1

/** Emit scroll metrics in smaller batches so short-but-real scroll sessions are captured. */
const SCROLL_METRIC_BATCH_SIZE = 10

interface GanttChartProps {
  employees: ProcessedEmployee[]
  dates: Date[]
}

/**
 * Spreadsheet-style grid showing all employees and their trips.
 * Uses virtualization to only render visible employee rows.
 * Employee names column is fixed and doesn't scroll horizontally.
 */
export const GanttChart = memo(function GanttChart({
  employees,
  dates,
}: GanttChartProps) {
  const [overscan, setOverscan] = useState(BASE_OVERSCAN)
  const mountStartedAtRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : 0
  )
  const scrollSampleRef = useRef({
    samples: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
  })
  const previousVisibleRowsRef = useRef<number>(-1)
  const lastTimelineScrollRef = useRef({ top: 0, at: 0 })
  const fastScrollResetTimerRef = useRef<number | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const namesScrollRef = useRef<HTMLDivElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)

  // Set up virtualizer for employee rows — fixed height, no per-row calculation
  const virtualizer = useVirtualizer({
    count: employees.length,
    getScrollElement: () => timelineScrollRef.current,
    estimateSize: () => GRID_ROW_HEIGHT,
    overscan,
  })

  // Sync vertical scroll from timeline to names column.
  // One-way syncing avoids scroll-event feedback loops/jitter.
  useEffect(() => {
    const namesEl = namesScrollRef.current
    const timelineEl = timelineScrollRef.current

    if (!namesEl || !timelineEl) return

    const markFastScroll = () => {
      setOverscan((current) =>
        current === FAST_SCROLL_OVERSCAN ? current : FAST_SCROLL_OVERSCAN
      )

      if (typeof window === 'undefined') return

      if (fastScrollResetTimerRef.current !== null) {
        window.clearTimeout(fastScrollResetTimerRef.current)
      }

      fastScrollResetTimerRef.current = window.setTimeout(() => {
        setOverscan(BASE_OVERSCAN)
        fastScrollResetTimerRef.current = null
      }, FAST_SCROLL_RESET_MS)
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
      const now = performance.now()
      const previous = lastTimelineScrollRef.current
      if (previous.at > 0) {
        const deltaPx = Math.abs(timelineEl.scrollTop - previous.top)
        const elapsedMs = now - previous.at
        const velocityPxPerMs = elapsedMs > 0 ? deltaPx / elapsedMs : 0

        if (
          deltaPx >= FAST_SCROLL_DELTA_THRESHOLD ||
          velocityPxPerMs >= FAST_SCROLL_VELOCITY_THRESHOLD
        ) {
          markFastScroll()
        }
      }
      lastTimelineScrollRef.current = { top: timelineEl.scrollTop, at: now }

      const startedAt = performance.now()
      syncVerticalScroll(timelineEl, namesEl)
      recordScrollSample('timeline_scroll', performance.now() - startedAt)
    }

    const handleNamesWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 0.5) return

      // Keep scrolling behavior consistent when cursor is on the fixed names column.
      event.preventDefault()

      if (Math.abs(event.deltaY) >= FAST_SCROLL_DELTA_THRESHOLD) {
        markFastScroll()
      }

      const startedAt = performance.now()
      timelineEl.scrollTop += event.deltaY
      syncVerticalScroll(timelineEl, namesEl)
      recordScrollSample('names_wheel', performance.now() - startedAt)
    }

    // Ensure initial alignment on mount.
    lastTimelineScrollRef.current = {
      top: timelineEl.scrollTop,
      at: performance.now(),
    }
    syncVerticalScroll(timelineEl, namesEl)
    timelineEl.addEventListener('scroll', handleTimelineScroll, { passive: true })
    namesEl.addEventListener('wheel', handleNamesWheel, { passive: false })

    return () => {
      flushScrollMetric('timeline_scroll')
      timelineEl.removeEventListener('scroll', handleTimelineScroll)
      namesEl.removeEventListener('wheel', handleNamesWheel)

      if (
        typeof window !== 'undefined' &&
        fastScrollResetTimerRef.current !== null
      ) {
        window.clearTimeout(fastScrollResetTimerRef.current)
        fastScrollResetTimerRef.current = null
      }
    }
  }, [])

  // Scroll to today on mount (horizontal scroll only)
  useEffect(() => {
    if (scrollContainerRef.current) {
      const todayIndex = dates.findIndex((date) => isToday(date))
      if (todayIndex >= 0) {
        const scrollContainer = scrollContainerRef.current.querySelector(
          '[data-radix-scroll-area-viewport]'
        )
        if (scrollContainer) {
          const todayOffset = todayIndex * DAY_WIDTH
          const containerWidth = scrollContainer.clientWidth
          const scrollTo = Math.max(0, todayOffset - containerWidth / 2)
          scrollContainer.scrollLeft = scrollTo
        }
      }
    }
  }, [dates])

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

  const totalWidth = dates.length * DAY_WIDTH
  const totalHeight = virtualizer.getTotalSize()
  const virtualRows = virtualizer.getVirtualItems()
  const visibleRows = virtualRows.length

  useEffect(() => {
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
    <div className="flex">
      {/* Fixed left column — employee names (no horizontal scroll) */}
      <div
        className="shrink-0 bg-slate-50/80 border-r border-slate-200 z-20"
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
          className="overflow-y-hidden overflow-x-hidden"
          style={{ maxHeight: MAX_HEIGHT, contain: 'layout paint' }}
        >
          <div className="relative" style={{ height: totalHeight }}>
            {virtualRows.map((virtualRow) => {
              const employee = employees[virtualRow.index]
              return (
                <div
                  key={employee.id}
                  className={cn(
                    'absolute left-0 w-full px-3 border-b border-slate-100 bg-slate-50/60 flex items-center transition-colors hover:bg-sky-50/60'
                  )}
                  style={{
                    height: GRID_ROW_HEIGHT,
                    transform: `translate3d(0, ${virtualRow.start}px, 0)`,
                    willChange: 'transform',
                  }}
                >
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {employee.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right column — horizontally scrollable timeline grid */}
      <div ref={scrollContainerRef} className="flex-1 min-w-0">
        <ScrollArea className="w-full whitespace-nowrap rounded-br-xl">
          <div style={{ width: totalWidth }}>
            {/* 4-row date header */}
            <DateHeader
              dateMeta={dateMeta}
              dayWidth={DAY_WIDTH}
            />

            {/* Virtualized grid rows */}
            <div
              ref={timelineScrollRef}
              data-testid="calendar-timeline-viewport"
              className="overflow-y-auto bg-white"
              style={{ maxHeight: MAX_HEIGHT, contain: 'layout paint' }}
            >
              <div className="relative" style={{ height: totalHeight }}>
                {virtualRows.map((virtualRow) => {
                  const employee = employees[virtualRow.index]
                  return (
                    <div
                      key={employee.id}
                      className="absolute left-0 w-full border-b border-slate-100"
                      style={{
                        height: GRID_ROW_HEIGHT,
                        transform: `translate3d(0, ${virtualRow.start}px, 0)`,
                        willChange: 'transform',
                      }}
                    >
                      <EmployeeRow
                        employee={employee}
                        dateMeta={dateMeta}
                        dayWidth={DAY_WIDTH}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  )
})
