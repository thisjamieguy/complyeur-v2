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
import type { ProcessedTripDay } from './types'

/** Fixed height for each grid row */
export const GRID_ROW_HEIGHT = 32

interface DayCellProps {
  tripDay: ProcessedTripDay | undefined
  date: Date
  dayWidth: number
  isWeekend: boolean
  isToday: boolean
  isMonthStart: boolean
  isInRollingWindow: boolean
  isRollingWindowStart: boolean
  isRollingWindowEnd: boolean
  isRowHovered: boolean
  isTripStart: boolean
  isTripEnd: boolean
}

const schengenTripStyles = {
  green: {
    base: 'bg-green-100',
    weekend: 'bg-green-200/70',
    text: 'text-green-800',
    hover: 'hover:bg-green-200/80',
    border: 'border-green-300',
  },
  amber: {
    base: 'bg-amber-100',
    weekend: 'bg-amber-200/70',
    text: 'text-amber-800',
    hover: 'hover:bg-amber-200/80',
    border: 'border-amber-300',
  },
  red: {
    base: 'bg-red-100',
    weekend: 'bg-red-200/70',
    text: 'text-red-800',
    hover: 'hover:bg-red-200/80',
    border: 'border-red-300',
  },
  breach: {
    base: 'bg-slate-700',
    weekend: 'bg-slate-800/90',
    text: 'text-white',
    hover: 'hover:bg-slate-800',
    border: 'border-slate-500',
  },
} as const

const historicalTripStyles = {
  base: 'bg-slate-100',
  weekend: 'bg-slate-200/60',
  text: 'text-slate-600',
  hover: 'hover:bg-slate-200/80',
  border: 'border-slate-300',
} as const

const nonSchengenTripStyles = {
  base: 'bg-slate-100',
  weekend: 'bg-slate-200/60',
  text: 'text-slate-600',
  hover: 'hover:bg-slate-200/80',
  border: 'border-slate-300',
} as const

/**
 * Single day cell in the spreadsheet grid.
 * Shows country code when employee is traveling, empty otherwise.
 */
export const DayCell = memo(function DayCell({
  tripDay,
  date,
  dayWidth,
  isWeekend,
  isToday,
  isMonthStart,
  isInRollingWindow,
  isRollingWindowStart,
  isRollingWindowEnd,
  isRowHovered,
  isTripStart,
  isTripEnd,
}: DayCellProps) {
  const trip = tripDay?.trip
  const showCountryLabel = Boolean(tripDay && isTripStart)
  const cellContent = showCountryLabel
    ? trip?.isPrivate
      ? '--'
      : trip?.country
    : null

  const baseCls = cn(
    'shrink-0 flex items-center justify-center border-r border-slate-100',
    // Empty cells
    !trip && !isToday && !isWeekend && !isInRollingWindow && 'bg-white',
    !trip && !isToday && !isWeekend && isInRollingWindow && 'bg-sky-50/40',
    !trip && isWeekend && !isToday && !isInRollingWindow && 'bg-slate-50',
    !trip && isWeekend && !isToday && isInRollingWindow && 'bg-sky-50/55',
    !trip && isToday && 'bg-blue-50',
    !trip && isRowHovered && 'bg-slate-100/70',
    isMonthStart && !(trip && !isTripStart) && 'border-l border-l-slate-300/80',
    // Today's travel cells should preserve trip color while still standing out
    trip && isToday && 'ring-1 ring-inset ring-blue-300',
    trip && isRowHovered && 'ring-1 ring-inset ring-slate-200/80',
    // Make trip bars solid — no internal borders
    trip && !isTripEnd && 'border-r-0',
    !trip && isRollingWindowStart && 'border-l border-l-sky-400',
    !trip && isRollingWindowEnd && 'border-r border-r-sky-400'
  )

  const tripStyles = trip
    ? tripDay?.displayMode === 'historical'
      ? historicalTripStyles
      : trip.isSchengen
      ? schengenTripStyles[tripDay?.riskLevel ?? 'green']
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
            tripStyles && tripStyles.base,
            tripStyles?.hover,
            // Outer border for trip block definition
            tripStyles && 'border-t border-b',
            tripStyles && tripStyles.border,
            isTripStart && 'border-l rounded-l-md',
            isTripEnd && 'border-r rounded-r-md',
            'cursor-pointer transition-colors'
          )}
          style={{ width: dayWidth, height: GRID_ROW_HEIGHT }}
          aria-label={`${trip.country} trip on ${format(date, 'MMM d')}`}
        >
          <span
            className={cn(
              'text-[10px] font-semibold leading-none tracking-wide',
              tripStyles?.text ?? (isToday ? 'text-blue-700' : 'text-slate-600')
            )}
          >
            {cellContent}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="center" side="top">
        <TripPopover tripDay={tripDay!} />
      </PopoverContent>
    </Popover>
  )
})
