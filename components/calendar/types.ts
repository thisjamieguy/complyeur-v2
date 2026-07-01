import type { DailyCompliance, RiskLevel } from '@/lib/compliance'

export type TripDayDisplayMode = 'historical' | 'planning'
export type TripResizeEdge = 'start' | 'end'

/** Raw trip shape as read from the database (and from lib/data/calendar.ts). */
export interface DbTrip {
  id: string
  country: string
  entry_date: string
  exit_date: string
  purpose: string | null
  job_ref?: string | null
  is_private: boolean
  ghosted: boolean
}

/** An employee plus their raw (unprocessed) trips, as loaded for the calendar. */
export interface EmployeeWithTrips {
  id: string
  name: string
  trips: DbTrip[]
}

export interface ProcessedTrip {
  id: string
  country: string
  rawCountry: string
  entryDate: Date
  exitDate: Date
  duration: number
  purpose: string | null
  jobRef: string | null
  isPrivate: boolean
  ghosted: boolean
  isSchengen: boolean
}

export interface ProcessedTripDay {
  trip: ProcessedTrip
  referenceDate: Date
  displayMode: TripDayDisplayMode
  daysUsed: number
  daysRemaining: number
  riskLevel: RiskLevel
  isBreachDay: boolean
}

export interface ProcessedEmployee {
  id: string
  name: string
  trips: ProcessedTrip[]
  complianceByDate: Map<string, DailyCompliance>
  currentDaysRemaining: number
  currentRiskLevel: RiskLevel
  tripsInRange: number
}

export interface TripResizeRequest {
  tripId: string
  employeeId: string
  edge: TripResizeEdge
  dateKey: string
  originalEntryDateKey: string
  originalExitDateKey: string
}

export interface TripDateShiftRequest {
  tripId: string
  employeeId: string
  entryDateKey: string
  exitDateKey: string
  originalEntryDateKey: string
  originalExitDateKey: string
}

export interface TripMoveRequest {
  tripId: string
  sourceEmployeeId: string
  sourceEmployeeName: string
  targetEmployeeId: string
  targetEmployeeName: string
  country: string
  entryDateKey: string
  exitDateKey: string
  originalEntryDateKey: string
  originalExitDateKey: string
}

export interface TripEditRequest {
  employeeId: string
  employeeName: string
  trip: ProcessedTrip
}

export interface TripDeleteRequest {
  employeeId: string
  employeeName: string
  trip: ProcessedTrip
}

export interface CalendarCopiedTrip {
  country: string
  duration: number
  purpose: string | null
  jobRef: string | null
  isPrivate: boolean
  ghosted: boolean
}

export interface CalendarPendingTrip {
  employeeId: string
  trip: DbTrip
}

export interface CalendarCellContextMenuRequest {
  x: number
  y: number
  dateKey: string
  trip?: ProcessedTrip
}

/**
 * Request to open the shared trip-details popover, anchored to a day cell.
 * The grid renders a single popover instead of one Radix root per trip cell —
 * mounting thousands of popover roots made row virtualization visibly janky.
 * Carries the cell identity (not a data snapshot) so the popover always
 * renders live trip data, even across an optimistic update or refresh.
 */
export interface CalendarCellTripDetailsRequest {
  anchor: { x: number; y: number; width: number; height: number }
  tripId: string
  dateKey: string
  /** Focus is returned here when the popover closes (keyboard support). */
  sourceElement: HTMLElement | null
}

export interface CalendarTripDetailsRequest extends CalendarCellTripDetailsRequest {
  employeeId: string
  employeeName: string
}

export interface CalendarEmployeeContextMenuRequest
  extends CalendarCellContextMenuRequest {
  employeeId: string
  employeeName: string
}

export interface CalendarPasteTripRequest {
  employeeId: string
  employeeName: string
  dateKey: string
}
