'use client'

import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/lib/compliance'

interface TripPopoverProps {
  trip: {
    country: string
    entryDate: Date
    exitDate: Date
    duration: number
    daysRemaining: number
    riskLevel: RiskLevel
    purpose: string | null
    isPrivate: boolean
  }
}

const riskConfig = {
  green: {
    label: 'Safe',
    dotColor: 'bg-green-500',
    textColor: 'text-green-600',
  },
  amber: {
    label: 'Warning',
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-600',
  },
  red: {
    label: 'Critical',
    dotColor: 'bg-red-500',
    textColor: 'text-red-600',
  },
} satisfies Record<RiskLevel, { label: string; dotColor: string; textColor: string }>

/**
 * Country flag emoji from country code
 */
function getCountryFlag(countryCode: string): string {
  if (countryCode.length !== 2) return ''
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
    return String.fromCodePoint(...codePoints)
  } catch {
    return ''
  }
}

/**
 * Popover content showing trip details
 */
export function TripPopover({ trip }: TripPopoverProps) {
  const config = riskConfig[trip.riskLevel]
  const flag = getCountryFlag(trip.country)
  const displayCountry = trip.isPrivate ? 'Private Trip' : trip.country

  return (
    <div className="w-60">
      {/* Header with country */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        {flag && <span className="text-lg">{flag}</span>}
        <span className="font-medium text-slate-900">{displayCountry}</span>
      </div>

      {/* Trip dates */}
      <div className="py-3 border-b border-slate-100 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Entry:</span>
          <span className="text-slate-700">
            {format(trip.entryDate, 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Exit:</span>
          <span className="text-slate-700">
            {format(trip.exitDate, 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Duration:</span>
          <span className="text-slate-700">
            {trip.duration} {trip.duration === 1 ? 'day' : 'days'}
          </span>
        </div>
      </div>

      {/* Compliance status */}
      <div className="pt-3 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Days remaining:</span>
          <span className={cn('font-medium', config.textColor)}>
            {trip.daysRemaining}
          </span>
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-slate-500">Status:</span>
          <span className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
            <span className={cn('font-medium', config.textColor)}>
              {config.label}
            </span>
          </span>
        </div>
      </div>

      {/* Purpose if available */}
      {trip.purpose && !trip.isPrivate && (
        <div className="pt-3 mt-3 border-t border-slate-100">
          <div className="text-sm">
            <span className="text-slate-500">Purpose: </span>
            <span className="text-slate-700">{trip.purpose}</span>
          </div>
        </div>
      )}
    </div>
  )
}
