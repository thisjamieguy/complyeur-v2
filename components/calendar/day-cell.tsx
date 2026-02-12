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

const schengenTripStyles = {
  green: {
    base: 'bg-green-100',
    weekend: 'bg-green-200/70',
    text: 'text-green-800',
    hover: 'hover:bg-green-200/80',
  },
  amber: {
    base: 'bg-amber-100',
    weekend: 'bg-amber-200/70',
    text: 'text-amber-800',
    hover: 'hover:bg-amber-200/80',
  },
  red: {
    base: 'bg-red-100',
    weekend: 'bg-red-200/70',
    text: 'text-red-800',
    hover: 'hover:bg-red-200/80',
  },
  breach: {
    base: 'bg-slate-700',
    weekend: 'bg-slate-800/90',
    text: 'text-white',
    hover: 'hover:bg-slate-800',
  },
} as const

const nonSchengenTripStyles = {
  base: 'bg-slate-100',
  weekend: 'bg-slate-200/60',
  text: 'text-slate-600',
  hover: 'hover:bg-slate-200/80',
} as const

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
    // Today's travel cells should preserve trip color while still standing out
    trip && isToday && 'ring-1 ring-inset ring-blue-300'
  )

  const tripStyles = trip
    ? trip.isSchengen
      ? schengenTripStyles[trip.riskLevel]
      : nonSchengenTripStyles
    : null

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
            tripStyles && (isWeekend ? tripStyles.weekend : tripStyles.base),
            tripStyles?.hover,
            'cursor-pointer transition-colors'
          )}
          style={{ width: dayWidth, height: GRID_ROW_HEIGHT }}
          aria-label={`${trip.country} trip on ${format(date, 'MMM d')}`}
        >
          <span
            className={cn(
              'text-[10px] font-medium leading-none',
              tripStyles?.text ?? (isToday ? 'text-blue-700' : 'text-slate-600')
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
