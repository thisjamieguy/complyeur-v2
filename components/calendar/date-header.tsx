'use client'

import { memo, useMemo } from 'react'
import { getISOWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import type { DateMeta } from './gantt-chart'

interface DateHeaderProps {
  dateMeta: DateMeta[]
  dayWidth: number
}

interface WeekSpan {
  weekLabel: string
  startIndex: number
  span: number
}

const WINDOW_INDICATOR_HEIGHT = 18

/**
 * 4-row date header for the spreadsheet-style grid:
 * Row 1: Rolling 180-day window indicator
 * Row 2: ISO week numbers (W1, W2, ...) spanning 7 columns each
 * Row 3: Day-of-week single letters (M, T, W, T, F, S, S)
 * Row 4: Date numbers (1-31) with today highlight
 *
 * Receives pre-computed dateMeta to avoid per-cell isToday/isWeekend/format calls.
 */
export const DateHeader = memo(function DateHeader({
  dateMeta,
  dayWidth,
}: DateHeaderProps) {
  const totalWidth = dateMeta.length * dayWidth

  const rollingWindowBounds = useMemo(() => {
    const startIndex = dateMeta.findIndex((dm) => dm.isInRollingWindow)
    if (startIndex === -1) return null

    let endIndex = startIndex
    for (let i = startIndex + 1; i < dateMeta.length; i++) {
      if (!dateMeta[i].isInRollingWindow) break
      endIndex = i
    }

    return {
      startIndex,
      span: endIndex - startIndex + 1,
    }
  }, [dateMeta])

  const monthMarkers = useMemo(
    () =>
      dateMeta
        .map((dm, index) => ({ ...dm, index }))
        .filter((dm) => dm.isMonthStart),
    [dateMeta]
  )

  // Calculate week spans for the top row
  const weekSpans = useMemo(() => {
    const spans: WeekSpan[] = []
    let currentWeek: number | null = null
    let currentYear: number | null = null
    let currentStart = 0
    let currentSpan = 0

    dateMeta.forEach((dm, index) => {
      const week = getISOWeek(dm.date)
      const year = dm.date.getFullYear()

      if (week !== currentWeek || year !== currentYear) {
        if (currentWeek !== null) {
          spans.push({
            weekLabel: `W${currentWeek}`,
            startIndex: currentStart,
            span: currentSpan,
          })
        }
        currentWeek = week
        currentYear = year
        currentStart = index
        currentSpan = 1
      } else {
        currentSpan++
      }
    })

    // Push the last week
    if (currentWeek !== null) {
      spans.push({
        weekLabel: `W${currentWeek}`,
        startIndex: currentStart,
        span: currentSpan,
      })
    }

    return spans
  }, [dateMeta])

  return (
    <div className="sticky top-0 z-20 relative bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-[0_1px_0_rgba(148,163,184,0.15)]">
      {/* Row 1: Rolling 180-day window indicator */}
      <div className="relative border-b border-slate-100" style={{ height: WINDOW_INDICATOR_HEIGHT }}>
        {rollingWindowBounds && (
          <div
            className="absolute top-[2px] bottom-[2px] rounded-md bg-sky-100/70 border border-sky-300/80 flex items-center justify-center"
            style={{
              left: rollingWindowBounds.startIndex * dayWidth,
              width: rollingWindowBounds.span * dayWidth,
            }}
          >
            <span className="text-[10px] font-semibold tracking-wide text-sky-800">
              180-Day Window
            </span>
          </div>
        )}
        <div className="absolute inset-0 flex pointer-events-none" style={{ width: totalWidth }}>
          {dateMeta.map((dm) => (
            <div key={`window-grid-${dm.key}`} className="shrink-0 border-r border-slate-100/70" style={{ width: dayWidth }} />
          ))}
        </div>
      </div>

      {/* Month boundary labels */}
      {monthMarkers.map((marker) => (
        <div
          key={`month-marker-${marker.key}`}
          className={cn(
            'absolute z-30 pointer-events-none',
            marker.index === 0 ? 'translate-x-0' : '-translate-x-1/2'
          )}
          style={{
            left: marker.index * dayWidth,
            top: WINDOW_INDICATOR_HEIGHT + 1,
          }}
        >
          <span className="inline-flex items-center rounded-sm border border-slate-300/70 bg-white px-1 py-[1px] text-[9px] font-semibold tracking-wide text-slate-600">
            {marker.monthLabel}
          </span>
        </div>
      ))}

      {/* Row 2: Week numbers */}
      <div className="flex">
        {weekSpans.map((span) => (
          <div
            key={`${span.weekLabel}-${span.startIndex}`}
            className="border-r border-slate-100 bg-slate-50/80 flex items-center justify-center"
            style={{ width: span.span * dayWidth, height: 22 }}
          >
            <span className="text-[10px] font-semibold tracking-wide text-slate-500">
              {span.weekLabel}
            </span>
          </div>
        ))}
      </div>

      {/* Row 3: Day-of-week single letters */}
      <div className="flex border-t border-slate-100">
        {dateMeta.map((dm) => (
          <div
            key={dm.key}
            className={cn(
              'shrink-0 flex items-center justify-center bg-slate-50/70',
              dm.isWeekend && 'bg-slate-100/80',
              dm.isInRollingWindow && !dm.isWeekend && 'bg-sky-50/45',
              dm.isInRollingWindow && dm.isWeekend && 'bg-sky-50/60',
              dm.isMonthStart && 'border-l border-l-slate-300/80'
            )}
            style={{ width: dayWidth, height: 20 }}
          >
            <span
              className={cn(
                'text-[10px] font-medium',
                dm.isWeekend ? 'text-slate-400' : 'text-slate-500'
              )}
            >
              {dm.dayOfWeek}
            </span>
          </div>
        ))}
      </div>

      {/* Row 4: Date numbers */}
      <div className="flex border-t border-slate-100">
        {dateMeta.map((dm) => (
          <div
            key={dm.key}
            className={cn(
              'shrink-0 flex items-center justify-center',
              !dm.isToday && !dm.isWeekend && 'bg-white',
              !dm.isToday && dm.isInRollingWindow && !dm.isWeekend && 'bg-sky-50/40',
              !dm.isToday && dm.isWeekend && 'bg-slate-50/80',
              !dm.isToday && dm.isWeekend && dm.isInRollingWindow && 'bg-sky-50/55',
              dm.isMonthStart && 'border-l border-l-slate-300/80',
              dm.isToday && 'bg-blue-50',
              dm.isRollingWindowStart && 'border-l border-l-sky-400',
              dm.isRollingWindowEnd && 'border-r border-r-sky-400'
            )}
            style={{ width: dayWidth, height: 24 }}
          >
            <span
              className={cn(
                'text-xs',
                dm.isToday
                  ? 'text-blue-700 font-semibold'
                  : 'text-slate-600'
              )}
            >
              {dm.dayOfMonth}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
