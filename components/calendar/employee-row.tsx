'use client'

import { memo, useMemo } from 'react'
import { isToday, differenceInDays, subDays, startOfDay, isWithinInterval, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { TripBar } from './trip-bar'
import type { RiskLevel } from '@/lib/compliance'

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

interface EmployeeRowProps {
  employee: {
    id: string
    name: string
  }
  trips: ProcessedTrip[]
  startDate: Date
  dates: Date[]
  dayWidth: number
  /** Fixed height from virtualizer (pre-calculated) */
  fixedHeight?: number
  /** Hide the name column (rendered separately in GanttChart) */
  hideNameColumn?: boolean
}

/**
 * Check if two trips overlap (for stacking)
 */
function tripsOverlap(a: ProcessedTrip, b: ProcessedTrip): boolean {
  return a.entryDate <= b.exitDate && b.entryDate <= a.exitDate
}

/**
 * Assign stack indices to trips that overlap
 */
function assignStackIndices(trips: ProcessedTrip[]): Map<string, number> {
  const indices = new Map<string, number>()
  const sortedTrips = [...trips].sort(
    (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
  )

  for (const trip of sortedTrips) {
    // Find the lowest available stack index
    const usedIndices = new Set<number>()

    for (const otherTrip of sortedTrips) {
      if (otherTrip.id === trip.id) continue
      if (tripsOverlap(trip, otherTrip) && indices.has(otherTrip.id)) {
        usedIndices.add(indices.get(otherTrip.id)!)
      }
    }

    let stackIndex = 0
    while (usedIndices.has(stackIndex)) {
      stackIndex++
    }

    indices.set(trip.id, stackIndex)
  }

  return indices
}

/**
 * Single employee row in the Gantt chart
 */
export const EmployeeRow = memo(function EmployeeRow({
  employee,
  trips,
  startDate,
  dates,
  dayWidth,
  fixedHeight,
  hideNameColumn = false,
}: EmployeeRowProps) {
  // Calculate trip positions
  const tripPositions = useMemo(() => {
    const stackIndices = assignStackIndices(trips)

    return trips.map((trip) => {
      // Calculate left offset from start date
      const daysFromStart = differenceInDays(trip.entryDate, startDate)
      const leftOffset = Math.max(0, daysFromStart * dayWidth)

      // Calculate width (number of days * dayWidth)
      const tripDays = differenceInDays(trip.exitDate, trip.entryDate) + 1
      const width = tripDays * dayWidth

      // Clamp to visible area
      const visibleLeft = Math.max(0, leftOffset)
      const rightEdge = leftOffset + width
      const maxRight = dates.length * dayWidth
      const visibleRight = Math.min(maxRight, rightEdge)
      const visibleWidth = visibleRight - visibleLeft

      return {
        trip,
        leftOffset: visibleLeft,
        width: visibleWidth,
        stackIndex: stackIndices.get(trip.id) || 0,
        isVisible: visibleWidth > 0 && leftOffset < maxRight,
      }
    })
  }, [trips, startDate, dates.length, dayWidth])

  // Calculate row height based on stacking
  const maxStackIndex = useMemo(() => {
    return tripPositions.reduce(
      (max, pos) => Math.max(max, pos.stackIndex),
      0
    )
  }, [tripPositions])

  // Use pre-calculated height if provided (from virtualizer), otherwise calculate
  const calculatedHeight = Math.max(40, (maxStackIndex + 1) * 28 + 8) // 28px per stacked row + padding
  const rowHeight = fixedHeight ?? calculatedHeight

  const visibleTrips = tripPositions.filter((pos) => pos.isVisible)

  return (
    <div className="flex h-full">
      {/* Employee name - only shown when not hidden */}
      {!hideNameColumn && (
        <div className="w-40 shrink-0 px-3 py-2 border-r border-slate-100 bg-white sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
          <span className="text-sm text-slate-700 truncate block">
            {employee.name}
          </span>
        </div>
      )}

      {/* Trip bars area */}
      <div className="flex-1 relative" style={{ height: `${rowHeight}px` }}>
        {/* Day column backgrounds with 180-day window tint and today highlight */}
        <div className="absolute inset-0 flex pointer-events-none">
          {dates.map((date, index) => {
            const today = startOfDay(new Date())
            const windowStart = subDays(today, 180)
            const isIn180Window = isWithinInterval(date, { start: windowStart, end: today })
            const isTodayDate = isToday(date)
            const isWindowStart = isSameDay(date, windowStart)

            return (
              <div
                key={index}
                className={cn(
                  'shrink-0 h-full',
                  isIn180Window && !isTodayDate && 'bg-amber-50/40',
                  isTodayDate && 'bg-blue-100',
                  isWindowStart && 'border-l-2 border-amber-500'
                )}
                style={{ width: dayWidth }}
              />
            )
          })}
        </div>

        {/* Trip bars - centered vertically */}
        <div className="absolute inset-0">
          {visibleTrips.length > 0 ? (
            (() => {
              // Calculate total height of stacked bars: (count * 24px bar) + ((count-1) * 4px gap)
              const barCount = maxStackIndex + 1
              const totalBarsHeight = barCount * 24 + (barCount - 1) * 4
              const centerOffset = (rowHeight - totalBarsHeight) / 2

              return visibleTrips.map(({ trip, leftOffset, width, stackIndex }) => (
                <TripBar
                  key={trip.id}
                  trip={trip}
                  leftOffset={leftOffset}
                  width={width}
                  stackIndex={stackIndex}
                  centerOffset={centerOffset}
                />
              ))
            })()
          ) : (
            <span className="text-xs text-slate-400 px-2 py-2 block">
              (no trips in range)
            </span>
          )}
        </div>
      </div>
    </div>
  )
})
