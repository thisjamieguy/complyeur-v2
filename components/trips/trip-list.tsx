'use client'

import { useState, useMemo, useEffect } from 'react'
import { MoreHorizontal, Pencil, Trash2, ArrowUpDown, UserMinus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditTripModal } from './edit-trip-modal'
import { DeleteTripDialog } from './delete-trip-dialog'
import { ReassignTripDialog } from './reassign-trip-dialog'
import { TripCardMobile } from './trip-card-mobile'
import {
  getCountryName,
  isSchengenCountry,
  isNonSchengenEU,
} from '@/lib/constants/schengen-countries'
import { getWindowBounds, parseDateOnlyAsUTC } from '@/lib/compliance'
import type { Trip, Employee } from '@/types/database-helpers'
import { TripTypeLegend } from '@/components/compliance/risk-legends'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TripListProps {
  trips: Trip[]
  employeeId: string
  employeeName: string
  employees?: Pick<Employee, 'id' | 'name'>[]
}

type SortField = 'entry_date' | 'travel_days'
type SortDirection = 'asc' | 'desc'
type TripFilter = '180' | 'all'

export function TripList({ trips, employeeId, employeeName, employees = [] }: TripListProps) {
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null)
  const [reassigningTrip, setReassigningTrip] = useState<Trip | null>(null)
  const [sortField, setSortField] = useState<SortField>('entry_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [tripFilter, setTripFilter] = useState<TripFilter>('180')
  const [inlineMessage, setInlineMessage] = useState<string | null>(null)

  useEffect(() => {
    const tripUpdatedHandler = (event: Event) => {
      const customEvent = event as CustomEvent<string>
      setInlineMessage(customEvent.detail || 'Trip list updated successfully.')
    }
    window.addEventListener('complyeur:trip-updated', tripUpdatedHandler as EventListener)
    return () => {
      window.removeEventListener('complyeur:trip-updated', tripUpdatedHandler as EventListener)
    }
  }, [])

  const filteredTrips = useMemo(() => {
    if (tripFilter === 'all') return trips
    const { windowStart, windowEnd } = getWindowBounds(new Date())
    return trips.filter(
      (trip) =>
        parseDateOnlyAsUTC(trip.exit_date) >= windowStart &&
        parseDateOnlyAsUTC(trip.entry_date) <= windowEnd
    )
  }, [trips, tripFilter])

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-slate-50">
        <p className="text-sm text-gray-500">No trips recorded yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Add a trip to start tracking Schengen compliance
        </p>
      </div>
    )
  }

  const sortedTrips = useMemo(() => {
    const sorted = [...filteredTrips].sort((a, b) => {
      let comparison = 0
      if (sortField === 'entry_date') {
        // ISO date strings (yyyy-MM-dd) sort lexicographically — no Date allocation needed
        comparison = a.entry_date < b.entry_date ? -1 : a.entry_date > b.entry_date ? 1 : 0
      } else if (sortField === 'travel_days') {
        comparison = (a.travel_days ?? 0) - (b.travel_days ?? 0)
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [filteredTrips, sortField, sortDirection])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  function getCountryBadge(code: string, isPrivate: boolean) {
    // Don't show Schengen badge for private trips
    if (isPrivate) {
      return null
    }
    if (isSchengenCountry(code)) {
      return (
        <Badge variant="default" className="ml-2 bg-blue-600 text-xs">
          Schengen
        </Badge>
      )
    }
    if (isNonSchengenEU(code)) {
      return (
        <Badge variant="secondary" className="ml-2 text-xs">
          EU (non-Schengen)
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="ml-2 text-xs">
        Non-Schengen
      </Badge>
    )
  }

  function displayCountry(trip: Trip): string {
    if (trip.is_private) {
      return 'Hidden destination'
    }
    return getCountryName(trip.country)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Showing {sortedTrips.length} of {trips.length} trips
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTripFilter('180')
              setSortField('entry_date')
              setSortDirection('desc')
            }}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors"
          >
            Reset view
          </button>
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => setTripFilter('180')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tripFilter === '180'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Last 180 days
          </button>
          <button
            onClick={() => setTripFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tripFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All time
          </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <TripTypeLegend />
      </div>

      {inlineMessage && (
        <div className="mb-4">
          <Alert>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{inlineMessage}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInlineMessage(null)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {sortedTrips.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-slate-50">
          <p className="text-sm text-gray-500">No trips in the last 180 days</p>
          <button
            onClick={() => setTripFilter('all')}
            className="text-xs text-blue-600 hover:text-blue-700 mt-1"
          >
            View all trips
          </button>
        </div>
      )}

      {/* Desktop table view */}
      {sortedTrips.length > 0 && <div className="hidden md:block rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('entry_date')}
                >
                  Dates
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('travel_days')}
                >
                  Days
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTrips.map((trip) => (
              <TableRow
                key={trip.id}
                className={trip.ghosted ? 'opacity-50' : ''}
              >
                <TableCell>
                  <div className="flex items-center flex-wrap gap-1">
                    <span className="font-medium">
                      {displayCountry(trip)}
                    </span>
                    {getCountryBadge(trip.country, trip.is_private ?? false)}
                    {trip.is_private && (
                      <Badge variant="secondary" className="text-xs">
                        Private trip
                      </Badge>
                    )}
                    {trip.ghosted && (
                      <Badge variant="outline" className="text-xs">
                        Excluded from compliance
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {formatDate(trip.entry_date)} - {formatDate(trip.exit_date)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{trip.travel_days}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-500 truncate max-w-[200px] block">
                    {trip.purpose || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingTrip(trip)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {employees.length > 1 && (
                        <DropdownMenuItem onClick={() => setReassigningTrip(trip)}>
                          <UserMinus className="mr-2 h-4 w-4" />
                          Reassign
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setDeletingTrip(trip)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>}

      {/* Mobile card view */}
      {sortedTrips.length > 0 && <div className="md:hidden space-y-3">
        {sortedTrips.map((trip) => (
          <TripCardMobile
            key={trip.id}
            trip={trip}
            onEdit={setEditingTrip}
            onDelete={setDeletingTrip}
            onReassign={setReassigningTrip}
            showReassign={employees.length > 1}
          />
        ))}
      </div>}

      {editingTrip && (
        <EditTripModal
          trip={editingTrip}
          employeeId={employeeId}
          employeeName={employeeName}
          open={!!editingTrip}
          onOpenChange={(open) => !open && setEditingTrip(null)}
        />
      )}

      {deletingTrip && (
        <DeleteTripDialog
          trip={deletingTrip}
          employeeId={employeeId}
          open={!!deletingTrip}
          onOpenChange={(open) => !open && setDeletingTrip(null)}
        />
      )}

      {reassigningTrip && (
        <ReassignTripDialog
          open={!!reassigningTrip}
          onOpenChange={(open) => !open && setReassigningTrip(null)}
          trip={reassigningTrip}
          currentEmployeeId={employeeId}
          currentEmployeeName={employeeName}
          employees={employees}
        />
      )}
    </>
  )
}
