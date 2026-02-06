'use client'

import { memo } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TripPopover } from './trip-popover'
import type { ProcessedTrip } from './types'

/** Fixed height for each grid row */
export const GRID_ROW_HEIGHT = 32

interface DayCellProps {
  trip: ProcessedTrip | undefined
  date: Date
  dayWidth: number
  isWeekend: boolean
  isToday: boolean
}

/**
 * Single day cell in the spreadsheet grid.
 * Shows country code when employee is traveling, empty otherwise.
 */
export const DayCell = memo(function DayCell({
  trip,
  date,
  dayWidth,
  isWeekend,
  isToday,
}: DayCellProps) {
  const cellContent = trip
    ? trip.isPrivate
      ? '--'
      : trip.country
    : null

  const baseCls = cn(
    'shrink-0 flex items-center justify-center border-r border-slate-100',
    // Empty cells
    !trip && !isToday && !isWeekend && 'bg-white',
    !trip && isWeekend && !isToday && 'bg-slate-50',
    !trip && isToday && 'bg-blue-50',
    // Travel cells
    trip && !isToday && !isWeekend && 'bg-slate-100',
    trip && isWeekend && !isToday && 'bg-slate-200/60',
    trip && isToday && 'bg-blue-100'
  )

  // Empty cell — not interactive
  if (!trip) {
    return (
      <div
        className={baseCls}
        style={{ width: dayWidth, height: GRID_ROW_HEIGHT }}
      />
    )
  }

  // Travel cell — clickable with popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            baseCls,
            'cursor-pointer hover:bg-slate-200/80 transition-colors'
          )}
          style={{ width: dayWidth, height: GRID_ROW_HEIGHT }}
          aria-label={`${trip.country} trip on ${format(date, 'MMM d')}`}
        >
          <span
            className={cn(
              'text-[10px] font-medium leading-none',
              isToday ? 'text-blue-700' : 'text-slate-600'
            )}
          >
            {cellContent}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="center" side="top">
        <TripPopover trip={trip} />
      </PopoverContent>
    </Popover>
  )
})
