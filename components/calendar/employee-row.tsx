'use client'

import { memo, useMemo } from 'react'
import { toUTCMidnight } from '@/lib/compliance/date-utils'
import { buildDayMap } from './calendar-view.utils'
import { DayCell, GRID_ROW_HEIGHT } from './day-cell'
import type {
  ProcessedEmployee,
  TripDateShiftRequest,
  TripDeleteRequest,
  TripEditRequest,
  TripMoveRequest,
  TripResizeRequest,
  CalendarEmployeeContextMenuRequest,
} from './types'
import type { DateMeta } from './gantt-chart'

interface EmployeeRowProps {
  employee: ProcessedEmployee
  dateMeta: DateMeta[]
  dayWidth: number
  isHovered: boolean
  isDropTarget?: boolean
  interactive?: boolean
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
  onMoveTripTargetChange?: (employeeId: string | null) => void
  onOpenContextMenu?: (params: CalendarEmployeeContextMenuRequest) => void
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
  isHovered,
  isDropTarget = false,
  interactive = false,
  onCreateTrip,
  onEditTrip,
  onDeleteTrip,
  onResizeTrip,
  onShiftTripDates,
  onMoveTrip,
  onMoveTripTargetChange,
  onOpenContextMenu,
}: EmployeeRowProps) {
  const tripDayByDate = useMemo(() => {
    if (dateMeta.length === 0) {
      return []
    }

    const startDate = dateMeta[0].date
    const endDate = dateMeta[dateMeta.length - 1].date
    const today = dateMeta.find((dm) => dm.isToday)?.date ?? toUTCMidnight(new Date())
    const dayMap = buildDayMap(
      employee.trips,
      startDate,
      endDate,
      employee.complianceByDate,
      { today }
    )

    return dateMeta.map((dm) => dayMap.get(dm.key))
  }, [dateMeta, employee.complianceByDate, employee.trips])

  return (
    <div className="flex" style={{ height: GRID_ROW_HEIGHT }}>
      {dateMeta.map((dm, index) => {
        const tripDay = tripDayByDate[index]
        const prevTripDay = index > 0 ? tripDayByDate[index - 1] : undefined
        const nextTrip =
          index < tripDayByDate.length - 1 ? tripDayByDate[index + 1] : undefined
        const isTripStart = Boolean(
          tripDay && (!prevTripDay || prevTripDay.trip.id !== tripDay.trip.id)
        )
        const isTripEnd = Boolean(
          tripDay && (!nextTrip || nextTrip.trip.id !== tripDay.trip.id)
        )

        return (
          <DayCell
            key={dm.key}
            tripDay={tripDay}
            date={dm.date}
            dateKey={dm.key}
            dayWidth={dayWidth}
            isRowHovered={isHovered}
            isWeekend={dm.isWeekend}
            isToday={dm.isToday}
            isMonthStart={dm.isMonthStart}
            isInRollingWindow={dm.isInRollingWindow}
            isRollingWindowStart={dm.isRollingWindowStart}
            isRollingWindowEnd={dm.isRollingWindowEnd}
            isTripStart={isTripStart}
            isTripEnd={isTripEnd}
            isDropTarget={isDropTarget}
            interactive={interactive}
            onCreateTrip={
              onCreateTrip
                ? (dateKey) =>
                    onCreateTrip({
                      employeeId: employee.id,
                      employeeName: employee.name,
                      dateKey,
                    })
                : undefined
            }
            onEditTrip={
              onEditTrip
                ? (trip) =>
                    onEditTrip({
                      employeeId: employee.id,
                      employeeName: employee.name,
                      trip,
                    })
                : undefined
            }
            onDeleteTrip={
              onDeleteTrip
                ? (trip) =>
                    onDeleteTrip({
                      employeeId: employee.id,
                      employeeName: employee.name,
                      trip,
                    })
                : undefined
            }
            onResizeTrip={
              onResizeTrip
                ? (params) =>
                    onResizeTrip({
                      ...params,
                      employeeId: employee.id,
                    })
                : undefined
            }
            onShiftTripDates={
              onShiftTripDates
                ? (params) =>
                    onShiftTripDates({
                      ...params,
                      employeeId: employee.id,
                    })
                : undefined
            }
            onMoveTrip={
              onMoveTrip
                ? (params) =>
                    onMoveTrip({
                      ...params,
                      sourceEmployeeId: employee.id,
                      sourceEmployeeName: employee.name,
                    })
                : undefined
            }
            onMoveTripTargetChange={onMoveTripTargetChange}
            onOpenContextMenu={
              onOpenContextMenu
                ? (params) =>
                    onOpenContextMenu({
                      ...params,
                      employeeId: employee.id,
                      employeeName: employee.name,
                    })
                : undefined
            }
          />
        )
      })}
    </div>
  )
})
