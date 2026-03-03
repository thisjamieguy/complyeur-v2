'use client'

import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { format } from 'date-fns'
import { CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CountryCombobox } from './country-combobox'
import {
  isSchengenCountry,
  isNonSchengenEU,
  getCountryName,
} from '@/lib/constants/schengen-countries'
import { isExemptFromTracking, type NationalityType } from '@/lib/constants/nationality-types'
import { parseDateOnlyAsUTC } from '@/lib/compliance/date-utils'

interface TripEntryRowProps {
  index: number
  onRemove: () => void
  isOnly?: boolean
  nationalityType: NationalityType
  disabled?: boolean
}

export function TripEntryRow({
  index,
  onRemove,
  isOnly = false,
  nationalityType,
  disabled = false,
}: TripEntryRowProps) {
  const { watch, setValue, formState: { errors } } = useFormContext()

  const entryDate = watch(`trips.${index}.entry_date`)
  const exitDate = watch(`trips.${index}.exit_date`)
  const country = watch(`trips.${index}.country`)
  const isPrivate = watch(`trips.${index}.is_private`)

  // Calculate trip duration and compliance impact
  const impactInfo = useMemo(() => {
    if (!entryDate || !exitDate) return null

    try {
      const entry = parseDateOnlyAsUTC(entryDate)
      const exit = parseDateOnlyAsUTC(exitDate)
      if (exit < entry) return { error: 'Exit date must be on or after entry date' }

      const durationMs = exit.getTime() - entry.getTime()
      const days = Math.floor(durationMs / (24 * 60 * 60 * 1000)) + 1

      if (days > 180) return { error: 'Trip cannot exceed 180 days' }

      return { days }
    } catch {
      return null
    }
  }, [entryDate, exitDate])

  const isExempt = isExemptFromTracking(nationalityType)
  const isNonSchengen = country && !isSchengenCountry(country)
  const isNonSchengenEUCountry = country && isNonSchengenEU(country)

  // Parse string dates to Date objects for Calendar
  const entryDateObj = entryDate ? new Date(entryDate + 'T00:00:00') : undefined
  const exitDateObj = exitDate ? new Date(exitDate + 'T00:00:00') : undefined

  const tripErrors = errors.trips as Record<string, Record<string, { message?: string }>> | undefined
  const tripError = tripErrors?.[index]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          Trip {index + 1}
        </span>
        {!isOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={disabled}
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove trip</span>
          </Button>
        )}
      </div>

      {/* Date pickers row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Entry date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !entryDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {entryDate ? format(new Date(entryDate + 'T00:00:00'), 'dd MMM yyyy') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={entryDateObj}
                onSelect={(date) => {
                  if (date) {
                    const iso = format(date, 'yyyy-MM-dd')
                    setValue(`trips.${index}.entry_date`, iso, { shouldValidate: true })
                  }
                }}
              />
            </PopoverContent>
          </Popover>
          {tripError?.entry_date?.message && (
            <p className="text-xs text-red-500">{tripError.entry_date.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Exit date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !exitDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {exitDate ? format(new Date(exitDate + 'T00:00:00'), 'dd MMM yyyy') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={exitDateObj}
                onSelect={(date) => {
                  if (date) {
                    const iso = format(date, 'yyyy-MM-dd')
                    setValue(`trips.${index}.exit_date`, iso, { shouldValidate: true })
                  }
                }}
              />
            </PopoverContent>
          </Popover>
          {tripError?.exit_date?.message && (
            <p className="text-xs text-red-500">{tripError.exit_date.message}</p>
          )}
        </div>
      </div>

      {/* Country picker */}
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Country</Label>
        <CountryCombobox
          value={country || ''}
          onValueChange={(val) =>
            setValue(`trips.${index}.country`, val, { shouldValidate: true })
          }
          disabled={disabled}
        />
        {tripError?.country?.message && (
          <p className="text-xs text-red-500">{tripError.country.message}</p>
        )}
      </div>

      {/* Private trip toggle */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`trip-${index}-private`}
          checked={isPrivate || false}
          onCheckedChange={(checked) =>
            setValue(`trips.${index}.is_private`, !!checked)
          }
          disabled={disabled}
        />
        <div className="leading-none">
          <Label
            htmlFor={`trip-${index}-private`}
            className="text-xs font-normal text-slate-600 cursor-pointer"
          >
            Private trip
          </Label>
          <p className="text-xs text-slate-400 mt-0.5">
            Country hidden in reports (shown as &quot;XX&quot;)
          </p>
        </div>
      </div>

      {/* Compliance impact / warnings */}
      {isExempt && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
          EU/Schengen citizens are exempt from 90/180-day tracking.
        </p>
      )}

      {!isExempt && isNonSchengenEUCountry && country && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          {getCountryName(country)} is EU but not Schengen — this trip won&apos;t count toward the 90-day limit.
        </p>
      )}

      {!isExempt && impactInfo && !impactInfo.error && !isNonSchengen && (
        <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
          {impactInfo.days} {impactInfo.days === 1 ? 'day' : 'days'} — uses {impactInfo.days} of 90 allowed days
        </p>
      )}

      {impactInfo?.error && (
        <p className="text-xs text-red-500">{impactInfo.error}</p>
      )}
    </div>
  )
}
