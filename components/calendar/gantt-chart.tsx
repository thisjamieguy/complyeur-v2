'use client'

import { memo, useRef, useEffect, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { isToday } from 'date-fns'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { DateHeader } from './date-header'
import { EmployeeRow } from './employee-row'
import type { RiskLevel } from '@/lib/compliance'

/** Width of each day column in pixels */
const DAY_WIDTH = 32

/** Width of employee name column */
const NAME_COLUMN_WIDTH = 160

/** Max height of the scrollable area */
const MAX_HEIGHT = 600

interface ProcessedTrip {
  id: string
  country: string
  entryDate: Date
  exitDate: Date
  duration: number
  daysRemaining: number
  riskLevel: RiskLevel
  purpose: string | null
  isPrivate: boolean
  isSchengen: boolean
}

interface ProcessedEmployee {
  id: string
  name: string
  trips: ProcessedTrip[]
}

interface GanttChartProps {
  employees: ProcessedEmployee[]
  dates: Date[]
  startDate: Date
  rowHeights: number[]
}

/** Number of extra rows to render above/below viewport */
const OVERSCAN = 5

/**
 * The horizontal Gantt chart showing all employees and their trips
 * Uses virtualization to only render visible employee rows
 * Employee names column is fixed and doesn't scroll horizontally
 */
export const GanttChart = memo(function GanttChart({
  employees,
  dates,
  startDate,
  rowHeights,
}: GanttChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const namesScrollRef = useRef<HTMLDivElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)

  // Memoize the size getter to avoid unnecessary re-renders
  const estimateSize = useCallback(
    (index: number) => rowHeights[index] ?? 40,
    [rowHeights]
  )

  // Set up virtualizer for employee rows - attached to timeline scroll container
  const virtualizer = useVirtualizer({
    count: employees.length,
    getScrollElement: () => timelineScrollRef.current,
    estimateSize,
    overscan: OVERSCAN,
  })

  // Sync vertical scroll between names column and timeline
  useEffect(() => {
    const namesEl = namesScrollRef.current
    const timelineEl = timelineScrollRef.current

    if (!namesEl || !timelineEl) return

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      target.scrollTop = source.scrollTop
    }

    const handleTimelineScroll = () => syncScroll(timelineEl, namesEl)
    const handleNamesScroll = () => syncScroll(namesEl, timelineEl)

    timelineEl.addEventListener('scroll', handleTimelineScroll)
    namesEl.addEventListener('scroll', handleNamesScroll)

    return () => {
      timelineEl.removeEventListener('scroll', handleTimelineScroll)
      namesEl.removeEventListener('scroll', handleNamesScroll)
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

  const totalWidth = dates.length * DAY_WIDTH
  const totalHeight = virtualizer.getTotalSize()

  return (
    <div className="flex">
      {/* Fixed left column - employee names (no horizontal scroll) */}
      <div
        className="shrink-0 bg-white border-r border-slate-200 z-20"
        style={{ width: NAME_COLUMN_WIDTH }}
      >
        {/* Header cell */}
        <div className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
          {/* Match the height of DateHeader (month row + day row) */}
          <div className="h-[28px] border-b border-slate-100" />
          <div className="px-3 py-2">
            <span className="text-sm font-medium text-slate-500">Employee</span>
          </div>
        </div>

        {/* Virtualized employee names */}
        <div
          ref={namesScrollRef}
          className="overflow-y-auto overflow-x-hidden"
          style={{ maxHeight: MAX_HEIGHT }}
        >
          <div className="relative" style={{ height: totalHeight }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const employee = employees[virtualRow.index]
              return (
                <div
                  key={employee.id}
                  className="absolute left-0 w-full px-3 py-2 border-b border-slate-100 bg-white"
                  style={{
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <span className="text-sm text-slate-700 truncate block">
                    {employee.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right column - horizontally scrollable timeline */}
      <div ref={scrollContainerRef} className="flex-1 min-w-0">
        <ScrollArea className="w-full whitespace-nowrap rounded-br-xl">
          <div style={{ width: totalWidth }}>
            {/* Date header (without employee column) */}
            <DateHeader dates={dates} dayWidth={DAY_WIDTH} showEmployeeColumn={false} />

            {/* Virtualized timeline rows */}
            <div
              ref={timelineScrollRef}
              className="overflow-y-auto"
              style={{ maxHeight: MAX_HEIGHT }}
            >
              <div className="relative" style={{ height: totalHeight }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const employee = employees[virtualRow.index]
                  return (
                    <div
                      key={employee.id}
                      className="absolute left-0 w-full"
                      style={{
                        height: virtualRow.size,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <EmployeeRow
                        employee={employee}
                        trips={employee.trips}
                        startDate={startDate}
                        dates={dates}
                        dayWidth={DAY_WIDTH}
                        fixedHeight={virtualRow.size}
                        hideNameColumn
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
