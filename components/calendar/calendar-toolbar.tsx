'use client'

import { CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RangeSelector } from './range-selector'
import { ZoomControls, type CalendarZoomLevel } from './zoom-controls'

interface CalendarToolbarProps {
  visibleEmployeeLabel: string
  isPending: boolean
  weeksForward: number
  onWeeksForwardChange: (weeks: number) => void
  interactive: boolean
  zoomLevel: CalendarZoomLevel
  onZoomLevelChange: (level: CalendarZoomLevel) => void
  hideEmployeesWithoutSchengenTrips: boolean
  onHideChange: (enabled: boolean) => void
}

/**
 * Desktop calendar header: title, freshness state, and the primary timeline controls.
 */
export function CalendarToolbar({
  visibleEmployeeLabel,
  isPending,
  weeksForward,
  onWeeksForwardChange,
  interactive,
  zoomLevel,
  onZoomLevelChange,
  hideEmployeesWithoutSchengenTrips,
  onHideChange,
}: CalendarToolbarProps) {
  return (
    <CardHeader className="flex min-w-0 flex-col gap-3 border-b border-slate-100 bg-slate-50/70 p-4">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Travel Timeline
            </h2>
            <span className="text-xs text-slate-500">
              Showing {visibleEmployeeLabel}
              {isPending ? ' · refreshing…' : ' · saved for your next visit'}
            </span>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-3 xl:justify-end">
          <RangeSelector value={weeksForward} onChange={onWeeksForwardChange} />
          {interactive && (
            <ZoomControls value={zoomLevel} onChange={onZoomLevelChange} />
          )}
          <div className="flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Switch
              id="calendar-hide-no-schengen"
              checked={hideEmployeesWithoutSchengenTrips}
              onCheckedChange={onHideChange}
              disabled={isPending}
            />
            <Label
              htmlFor="calendar-hide-no-schengen"
              className="min-w-0 cursor-pointer truncate whitespace-nowrap text-xs font-medium text-slate-700"
            >
              Schengen trips only
            </Label>
          </div>
        </div>
      </div>
    </CardHeader>
  )
}
