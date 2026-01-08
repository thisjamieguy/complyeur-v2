'use client'

import { memo, useRef, useEffect } from 'react'
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
}

/**
 * The horizontal Gantt chart showing all employees and their trips
 */
export const GanttChart = memo(function GanttChart({
  employees,
  dates,
  startDate,
}: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

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

  return (
    <div ref={scrollRef} className="relative">
      <ScrollArea className="w-full whitespace-nowrap rounded-b-xl">
        <div style={{ minWidth: `${totalWidth + 160}px` }}>
          {/* Date header */}
          <DateHeader dates={dates} dayWidth={DAY_WIDTH} />

          {/* Employee rows */}
          <div className="divide-y divide-slate-100">
            {employees.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                trips={employee.trips}
                startDate={startDate}
                dates={dates}
                dayWidth={DAY_WIDTH}
              />
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
})
