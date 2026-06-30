'use client'

import { CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RangeSelector } from './range-selector'
import { ZoomControls, type CalendarZoomLevel } from './zoom-controls'
import type { CalendarRiskSummary } from './calendar-view.helpers'

const COMPLIANCE_LIMIT_DAYS = 90

interface CalendarToolbarProps {
  visibleEmployeeLabel: string
  isPending: boolean
  riskSummary: CalendarRiskSummary
  weeksForward: number
  onWeeksForwardChange: (weeks: number) => void
  interactive: boolean
  zoomLevel: CalendarZoomLevel
  onZoomLevelChange: (level: CalendarZoomLevel) => void
  hideEmployeesWithoutSchengenTrips: boolean
  onHideChange: (enabled: boolean) => void
}

/**
 * Desktop calendar header: title, risk summary pills, range/zoom controls,
 * the Schengen-only filter toggle, and the colour legend. Presentational only.
 */
export function CalendarToolbar({
  visibleEmployeeLabel,
  isPending,
  riskSummary,
  weeksForward,
  onWeeksForwardChange,
  interactive,
  zoomLevel,
  onZoomLevelChange,
  hideEmployeesWithoutSchengenTrips,
  onHideChange,
}: CalendarToolbarProps) {
  return (
    <CardHeader className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Travel Timeline
            </h2>
            <span className="text-xs text-slate-500">
              Showing {visibleEmployeeLabel}
              {isPending ? ' · refreshing…' : ' · saved for your next visit'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-emerald-800 ring-1 ring-emerald-200">
              <span className="size-2 rounded-full bg-emerald-500" />
              {riskSummary.clear} clear
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-amber-900 ring-1 ring-amber-200">
              <span className="size-2 rounded-full bg-amber-500" />
              {riskSummary.warning} warning
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-1 text-rose-800 ring-1 ring-rose-200">
              <span className="size-2 rounded-full bg-rose-500" />
              {riskSummary.critical} critical
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-2 py-1 text-white ring-1 ring-rose-800">
              <span className="size-2 rounded-full bg-white/90" />
              {riskSummary.breach} breach
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <RangeSelector value={weeksForward} onChange={onWeeksForwardChange} />
          {interactive && (
            <ZoomControls value={zoomLevel} onChange={onZoomLevelChange} />
          )}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Switch
              id="calendar-hide-no-schengen"
              checked={hideEmployeesWithoutSchengenTrips}
              onCheckedChange={onHideChange}
              disabled={isPending}
            />
            <Label
              htmlFor="calendar-hide-no-schengen"
              className="cursor-pointer whitespace-nowrap text-xs font-medium text-slate-700"
            >
              Only show employees with Schengen trips
            </Label>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-6 rounded-full bg-sky-100 ring-1 ring-sky-300" />
          180-day window
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-6 rounded-full bg-slate-200 ring-1 ring-slate-300" />
          weekend
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-6 rounded-full bg-blue-100 ring-1 ring-blue-300" />
          today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-slate-500" />
          month boundary
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-6 rounded-full bg-emerald-100 ring-1 ring-emerald-300" />
          {COMPLIANCE_LIMIT_DAYS}-day risk clear
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-6 rounded-full bg-amber-100 ring-1 ring-amber-300" />
          warning
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-6 rounded-full bg-rose-100 ring-1 ring-rose-300" />
          critical
        </span>
      </div>
    </CardHeader>
  )
}
