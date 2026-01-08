'use client'

import { memo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Info } from 'lucide-react'
import { TripPopover } from './trip-popover'
import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/lib/compliance'

interface TripBarProps {
  trip: {
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
  /** Pixel offset from left edge of timeline */
  leftOffset: number
  /** Width in pixels */
  width: number
  /** Vertical offset for stacked trips (0, 1, 2...) */
  stackIndex?: number
}

const riskStyles = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
} satisfies Record<RiskLevel, string>

/**
 * Individual trip bar on the Gantt chart
 * Color indicates risk level at the end of the trip
 */
export const TripBar = memo(function TripBar({
  trip,
  leftOffset,
  width,
  stackIndex = 0,
}: TripBarProps) {
  // Non-Schengen trips get a neutral gray color
  const barColor = trip.isSchengen ? riskStyles[trip.riskLevel] : 'bg-slate-300'

  // Calculate vertical position for stacked trips
  const topOffset = stackIndex * 28 // 24px bar + 4px gap

  return (
    <div
      className={cn(
        'absolute h-6 rounded-sm flex items-center justify-end pr-1',
        'transition-opacity hover:opacity-90',
        barColor
      )}
      style={{
        left: `${leftOffset}px`,
        width: `${Math.max(width, 24)}px`, // Minimum 24px to fit info icon
        top: `${topOffset}px`,
      }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="h-4 w-4 rounded-full bg-white/20 hover:bg-white/40
                       flex items-center justify-center transition-colors"
            aria-label="Trip details"
          >
            <Info className="h-3 w-3 text-white" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end" side="top">
          <TripPopover trip={trip} />
        </PopoverContent>
      </Popover>
    </div>
  )
})
