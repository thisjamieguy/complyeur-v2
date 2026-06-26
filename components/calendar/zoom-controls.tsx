'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CalendarZoomLevel = 'week' | 'month' | 'quarter' | 'six-months'

export const CALENDAR_ZOOM_WIDTHS: Record<CalendarZoomLevel, number> = {
  week: 64,
  month: 32,
  quarter: 16,
  'six-months': 8,
}

const ZOOM_OPTIONS: Array<{ value: CalendarZoomLevel; label: string }> = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: '3 months' },
  { value: 'six-months', label: '6 months' },
]

interface ZoomControlsProps {
  value: CalendarZoomLevel
  onChange: (value: CalendarZoomLevel) => void
}

export function ZoomControls({ value, onChange }: ZoomControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-600">Zoom</span>
      <div
        className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
        role="group"
        aria-label="Calendar zoom"
      >
        {ZOOM_OPTIONS.map((option) => {
          const selected = option.value === value

          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={selected ? 'default' : 'ghost'}
              className={cn(
                'h-7 rounded-md px-2.5 text-xs',
                selected
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
