'use client'

import { memo } from 'react'
import { DayCell, GRID_ROW_HEIGHT } from './day-cell'
import type { ProcessedEmployee } from './types'
import type { DateMeta } from './gantt-chart'

interface EmployeeRowProps {
  employee: ProcessedEmployee
  dateMeta: DateMeta[]
  dayWidth: number
}

/**
 * Single employee row in the spreadsheet grid.
 * Renders a flat row of DayCell components — one per day.
 * Receives pre-computed dateMeta to avoid O(employees x dates) isToday/isWeekend calls.
 */
export const EmployeeRow = memo(function EmployeeRow({
  employee,
  dateMeta,
  dayWidth,
}: EmployeeRowProps) {
  return (
    <div className="flex" style={{ height: GRID_ROW_HEIGHT }}>
      {dateMeta.map((dm) => {
        const trip = employee.dayMap.get(dm.key)
        return (
          <DayCell
            key={dm.key}
            trip={trip}
            date={dm.date}
            dayWidth={dayWidth}
            isWeekend={dm.isWeekend}
            isToday={dm.isToday}
          />
        )
      })}
    </div>
  )
})
