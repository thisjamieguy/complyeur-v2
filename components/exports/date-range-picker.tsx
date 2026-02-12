'use client'

import * as React from 'react'
import { format, startOfQuarter, subQuarters, startOfYear } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { addUtcDays, toUTCMidnight } from '@/lib/compliance/date-utils'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DATE_PRESETS, type DatePreset } from '@/lib/exports/types'

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  className?: string
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [preset, setPreset] = React.useState<string>('180')
  const [showCustom, setShowCustom] = React.useState(false)

  const getLastNDaysRange = React.useCallback((days: number) => {
    const today = toUTCMidnight(new Date())
    return {
      from: addUtcDays(today, -(days - 1)),
      to: today,
    }
  }, [])

  // Calculate date range from preset
  const applyPreset = React.useCallback(
    (presetValue: string) => {
      const today = toUTCMidnight(new Date())
      let from: Date
      let to: Date = today

      switch (presetValue) {
        case '30':
          from = addUtcDays(today, -29)
          break
        case '90':
          from = addUtcDays(today, -89)
          break
        case '180':
          from = addUtcDays(today, -179)
          break
        case 'quarter':
          from = toUTCMidnight(startOfQuarter(today))
          break
        case 'last-quarter':
          const lastQ = subQuarters(today, 1)
          from = toUTCMidnight(startOfQuarter(lastQ))
          to = addUtcDays(toUTCMidnight(startOfQuarter(today)), -1)
          break
        case 'ytd':
          from = toUTCMidnight(startOfYear(today))
          break
        case 'custom':
          setShowCustom(true)
          return
        default:
          from = addUtcDays(today, -179)
      }

      setShowCustom(false)
      onChange({ from, to })
    },
    [onChange]
  )

  // Apply default preset on mount
  React.useEffect(() => {
    if (!value) {
      applyPreset('180')
    }
  }, [value, applyPreset])

  const handlePresetChange = (presetValue: string) => {
    setPreset(presetValue)
    applyPreset(presetValue)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
          <SelectItem value="180">Last 180 days (Full window)</SelectItem>
          <SelectItem value="quarter">This quarter</SelectItem>
          <SelectItem value="last-quarter">Last quarter</SelectItem>
          <SelectItem value="ytd">Year to date</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      {showCustom && (
        <div className="grid grid-cols-2 gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !value?.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value?.from ? format(value.from, 'PPP') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value?.from}
                onSelect={(date) =>
                  onChange({ from: date, to: value?.to || new Date() })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !value?.to && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value?.to ? format(value.to, 'PPP') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value?.to}
                onSelect={(date) =>
                  onChange({
                    from: value?.from || getLastNDaysRange(180).from,
                    to: date,
                  })
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {value?.from && value?.to && (
        <p className="text-sm text-muted-foreground">
          {format(value.from, 'MMM d, yyyy')} - {format(value.to, 'MMM d, yyyy')}
        </p>
      )}
    </div>
  )
}
