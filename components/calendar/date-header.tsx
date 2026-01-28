'use client'

import { memo, useMemo } from 'react'
import { format, isToday, subDays, startOfDay, isSameDay, isWeekend } from 'date-fns'
import { cn } from '@/lib/utils'

interface DateHeaderProps {
  dates: Date[]
  dayWidth: number
  /** Whether to show the employee column (default: true) */
  showEmployeeColumn?: boolean
}

interface MonthSpan {
  month: string
  startIndex: number
  span: number
}

/**
 * Date header with month row and day number row
 */
export const DateHeader = memo(function DateHeader({
  dates,
  dayWidth,
  showEmployeeColumn = true,
}: DateHeaderProps) {
  // Calculate month spans for the header
  const monthSpans = useMemo(() => {
    const spans: MonthSpan[] = []
    let currentMonth: string | null = null
    let currentStart = 0
    let currentSpan = 0

    dates.forEach((date, index) => {
      const monthKey = format(date, 'MMM yyyy')

      if (monthKey !== currentMonth) {
        if (currentMonth !== null) {
          spans.push({
            month: currentMonth,
            startIndex: currentStart,
            span: currentSpan,
          })
        }
        currentMonth = monthKey
        currentStart = index
        currentSpan = 1
      } else {
        currentSpan++
      }
    })

    // Push the last month
    if (currentMonth !== null) {
      spans.push({
        month: currentMonth,
        startIndex: currentStart,
        span: currentSpan,
      })
    }

    return spans
  }, [dates])

  // Calculate 180-day window start
  const today = startOfDay(new Date())
  const windowStart = subDays(today, 180)
  const windowStartIndex = dates.findIndex((date) => isSameDay(date, windowStart))

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
      {/* Month row */}
      <div className="flex relative">
        {/* Empty cell for employee column */}
        {showEmployeeColumn && (
          <div className="w-40 shrink-0 border-r border-slate-200" />
        )}

        {/* Month labels */}
        <div className="flex relative">
          {monthSpans.map((span) => (
            <div
              key={`${span.month}-${span.startIndex}`}
              className="border-r border-slate-100 px-2 py-1"
              style={{ width: span.span * dayWidth }}
            >
              <span className="text-xs font-medium text-slate-600 truncate">
                {span.month}
              </span>
            </div>
          ))}

          {/* 180-day window start marker label */}
          {windowStartIndex >= 0 && (
            <div
              className="absolute top-0 bottom-0 flex items-center pointer-events-none"
              style={{ left: windowStartIndex * dayWidth }}
            >
              <div className="bg-amber-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-r whitespace-nowrap">
                180-day window
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Day number row */}
      <div className="flex relative">
        {/* Employee column header */}
        {showEmployeeColumn && (
          <div className="w-40 shrink-0 px-3 py-2 border-r border-slate-200 bg-slate-50">
            <span className="text-sm font-medium text-slate-500">Employee</span>
          </div>
        )}

        {/* Day numbers */}
        <div className="flex relative">
          {dates.map((date, index) => {
            const isCurrentDay = isToday(date)
            const isWindowStart = index === windowStartIndex
            const isWeekendDay = isWeekend(date)
            return (
              <div
                key={index}
                className={cn(
                  'shrink-0 flex items-center justify-center py-1.5 relative',
                  isWeekendDay && !isCurrentDay && 'bg-slate-100/60',
                  isCurrentDay && 'bg-blue-100',
                  isWindowStart && 'border-l-2 border-amber-500'
                )}
                style={{ width: dayWidth }}
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
    </div>
  )
})
