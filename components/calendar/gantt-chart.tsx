'use client'

import { memo, useRef, useEffect, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { isToday, differenceInDays } from 'date-fns'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { DateHeader } from './date-header'
import { EmployeeRow } from './employee-row'
import type { RiskLevel } from '@/lib/compliance'

/** Width of each day column in pixels */
const DAY_WIDTH = 32

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
 */
export const GanttChart = memo(function GanttChart({
  employees,
  dates,
  startDate,
  rowHeights,
}: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  // Memoize the size getter to avoid unnecessary re-renders
  const estimateSize = useCallback(
    (index: number) => rowHeights[index] ?? 40,
    [rowHeights]
  )

  // Set up virtualizer for employee rows
  const virtualizer = useVirtualizer({
    count: employees.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: OVERSCAN,
  })

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayIndex = dates.findIndex((date) => isToday(date))
      if (todayIndex >= 0) {
        // Calculate scroll position to center "today" in view
        const scrollContainer = scrollRef.current.querySelector(
          '[data-radix-scroll-area-viewport]'
        )
        if (scrollContainer) {
          const todayOffset = todayIndex * DAY_WIDTH
          const containerWidth = scrollContainer.clientWidth
          const employeeColumnWidth = 160 // 40 * 4 = 160px
          const scrollTo = Math.max(
            0,
            todayOffset - (containerWidth - employeeColumnWidth) / 2
          )
          scrollContainer.scrollLeft = scrollTo
        }
      }
    }
  }, [dates])

  const totalWidth = dates.length * DAY_WIDTH
  const totalHeight = virtualizer.getTotalSize()

  return (
    <div ref={scrollRef} className="relative">
      <ScrollArea className="w-full whitespace-nowrap rounded-b-xl">
        <div style={{ minWidth: `${totalWidth + 160}px` }}>
          {/* Date header */}
          <DateHeader dates={dates} dayWidth={DAY_WIDTH} />

          {/* Virtualized employee rows container */}
          <div
            ref={parentRef}
            className="overflow-y-auto"
            style={{ maxHeight: '600px' }}
          >
            <div
              className="relative w-full"
              style={{ height: `${totalHeight}px` }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const employee = employees[virtualRow.index]
                return (
                  <div
                    key={employee.id}
                    className="absolute left-0 w-full"
                    style={{
                      height: `${virtualRow.size}px`,
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
  )
})
