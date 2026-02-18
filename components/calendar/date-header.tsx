'use client'

import { memo, useMemo } from 'react'
import { format, getISOWeek, isToday, isWeekend } from 'date-fns'
import { cn } from '@/lib/utils'

interface DateHeaderProps {
  dates: Date[]
  dayWidth: number
}

interface WeekSpan {
  weekLabel: string
  startIndex: number
  span: number
}

/**
 * 3-row date header for the spreadsheet-style grid:
 * Row 1: ISO week numbers (W1, W2, ...) spanning 7 columns each
 * Row 2: Day-of-week single letters (M, T, W, T, F, S, S)
 * Row 3: Date numbers (1-31) with today highlight
 */
export const DateHeader = memo(function DateHeader({
  dates,
  dayWidth,
}: DateHeaderProps) {
  // Calculate week spans for the top row
  const weekSpans = useMemo(() => {
    const spans: WeekSpan[] = []
    let currentWeek: number | null = null
    let currentYear: number | null = null
    let currentStart = 0
    let currentSpan = 0

    dates.forEach((date, index) => {
      const week = getISOWeek(date)
      const year = date.getFullYear()

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
  }, [dates])

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
      {/* Row 1: Week numbers */}
      <div className="flex">
        {weekSpans.map((span) => (
          <div
            key={`${span.weekLabel}-${span.startIndex}`}
            className="border-r border-slate-100 bg-slate-50 flex items-center justify-center"
            style={{ width: span.span * dayWidth, height: 20 }}
          >
            <span className="text-[10px] font-medium text-slate-400">
              {span.weekLabel}
            </span>
          </div>
        ))}
      </div>

      {/* Row 2: Day-of-week single letters */}
      <div className="flex border-t border-slate-100">
        {dates.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd')
          const isWeekendDay = isWeekend(date)
          return (
            <div
              key={dateKey}
              className={cn(
                'shrink-0 flex items-center justify-center bg-slate-50',
                isWeekendDay && 'bg-slate-100/60'
              )}
              style={{ width: dayWidth, height: 20 }}
            >
              <span
                className={cn(
                  'text-[10px]',
                  isWeekendDay ? 'text-slate-300' : 'text-slate-400'
                )}
              >
                {format(date, 'EEEEE')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Row 3: Date numbers */}
      <div className="flex border-t border-slate-100">
        {dates.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd')
          const isCurrentDay = isToday(date)
          const isWeekendDay = isWeekend(date)
          return (
            <div
              key={dateKey}
              className={cn(
                'shrink-0 flex items-center justify-center',
                !isCurrentDay && !isWeekendDay && 'bg-white',
                !isCurrentDay && isWeekendDay && 'bg-slate-50/60',
                isCurrentDay && 'bg-blue-50'
              )}
              style={{ width: dayWidth, height: 24 }}
            >
              <span
                className={cn(
                  'text-xs',
                  isCurrentDay
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-500'
                )}
              >
                {format(date, 'd')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})
