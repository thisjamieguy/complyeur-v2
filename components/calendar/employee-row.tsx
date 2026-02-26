'use client'

import { memo } from 'react'
import { DayCell, GRID_ROW_HEIGHT } from './day-cell'
import type { ProcessedEmployee } from './types'
import type { DateMeta } from './gantt-chart'

interface EmployeeRowProps {
  employee: ProcessedEmployee
  dateMeta: DateMeta[]
  dayWidth: number
  hoveredEmployeeId: string | null
  hoveredDateKey: string | null
  onCellHover: (employeeId: string, dateKey: string) => void
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
  hoveredEmployeeId,
  hoveredDateKey,
  onCellHover,
}: EmployeeRowProps) {
  const tripByDate = dateMeta.map((dm) => employee.dayMap.get(dm.key))
  const isRowHovered = hoveredEmployeeId === employee.id

  return (
    <div className="flex" style={{ height: GRID_ROW_HEIGHT }}>
      {dateMeta.map((dm, index) => {
        const trip = tripByDate[index]
        const prevTrip = index > 0 ? tripByDate[index - 1] : undefined
        const nextTrip =
          index < tripByDate.length - 1 ? tripByDate[index + 1] : undefined
        const isTripStart = Boolean(trip && (!prevTrip || prevTrip.id !== trip.id))
        const isTripEnd = Boolean(trip && (!nextTrip || nextTrip.id !== trip.id))

        return (
          <DayCell
            key={dm.key}
            trip={trip}
            date={dm.date}
            dayWidth={dayWidth}
            isWeekend={dm.isWeekend}
            isToday={dm.isToday}
            isMonthStart={dm.isMonthStart}
            isInRollingWindow={dm.isInRollingWindow}
            isRollingWindowStart={dm.isRollingWindowStart}
            isRollingWindowEnd={dm.isRollingWindowEnd}
            isRowHovered={isRowHovered}
            isColumnHovered={hoveredDateKey === dm.key}
            isTripStart={isTripStart}
            isTripEnd={isTripEnd}
            onHover={() => onCellHover(employee.id, dm.key)}
          />
        )
      })}
    </div>
  )
})
