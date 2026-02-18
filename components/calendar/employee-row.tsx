'use client'

import { memo } from 'react'
import { format, isToday, isWeekend } from 'date-fns'
import { DayCell, GRID_ROW_HEIGHT } from './day-cell'
import type { ProcessedEmployee } from './types'

interface EmployeeRowProps {
  employee: ProcessedEmployee
  dates: Date[]
  dayWidth: number
}

/**
 * Single employee row in the spreadsheet grid.
 * Renders a flat row of DayCell components — one per day.
 */
export const EmployeeRow = memo(function EmployeeRow({
  employee,
  dates,
  dayWidth,
}: EmployeeRowProps) {
  return (
    <div className="flex" style={{ height: GRID_ROW_HEIGHT }}>
      {dates.map((date, index) => {
        const key = format(date, 'yyyy-MM-dd')
        const trip = employee.dayMap.get(key)
        return (
          <DayCell
            key={key}
            trip={trip}
            date={date}
            dayWidth={dayWidth}
            isWeekend={isWeekend(date)}
            isToday={isToday(date)}
          />
        )
      })}
    </div>
  )
})
