'use client'

import { MoreHorizontal, Pencil, Trash2, UserMinus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getCountryName,
  isSchengenCountry,
  isNonSchengenEU,
} from '@/lib/constants/schengen-countries'
import type { Trip } from '@/types/database-helpers'

interface TripCardMobileProps {
  trip: Trip
  onEdit: (trip: Trip) => void
  onDelete: (trip: Trip) => void
  onReassign?: (trip: Trip) => void
  showReassign?: boolean
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getCountryBadge(code: string, isPrivate: boolean) {
  if (isPrivate) return null

  if (isSchengenCountry(code)) {
    return (
      <Badge variant="default" className="bg-blue-600 text-xs">
        Schengen
      </Badge>
    )
  }
  if (isNonSchengenEU(code)) {
    return (
      <Badge variant="secondary" className="text-xs">
        EU
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs">
      Non-Schengen
    </Badge>
  )
}

function displayCountry(trip: Trip): string {
  if (trip.is_private) {
    return 'Private Trip'
  }
  return getCountryName(trip.country)
}

export function TripCardMobile({
  trip,
  onEdit,
  onDelete,
  onReassign,
  showReassign = false,
}: TripCardMobileProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg p-4 ${
        trip.ghosted ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Country and badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">
              {displayCountry(trip)}
            </span>
            {getCountryBadge(trip.country, trip.is_private ?? false)}
            {trip.is_private && (
              <Badge variant="secondary" className="text-xs">
                Private
              </Badge>
            )}
            {trip.ghosted && (
              <Badge variant="outline" className="text-xs">
                Excluded
              </Badge>
            )}
          </div>

          {/* Dates */}
          <p className="text-sm text-slate-600 mt-1">
            {formatDate(trip.entry_date)} - {formatDate(trip.exit_date)}
          </p>

          {/* Days and purpose */}
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="font-medium text-slate-900">
              {trip.travel_days} days
            </span>
            {trip.purpose && (
              <span className="text-slate-500 truncate">
                {trip.purpose}
              </span>
            )}
          </div>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px]"
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onEdit(trip)}
              className="min-h-[44px]"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {showReassign && onReassign && (
              <DropdownMenuItem
                onClick={() => onReassign(trip)}
                className="min-h-[44px]"
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Reassign
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(trip)}
              className="text-red-600 focus:text-red-600 min-h-[44px]"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
