import type { RiskLevel } from '@/lib/compliance'

export type TripDayDisplayMode = 'historical' | 'planning'

export interface ProcessedTrip {
  id: string
  country: string
  entryDate: Date
  exitDate: Date
  duration: number
  purpose: string | null
  isPrivate: boolean
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
  currentDaysRemaining: number
  currentRiskLevel: RiskLevel
}

export interface ProcessedEmployee {
  id: string
  name: string
  trips: ProcessedTrip[]
  dayMap: Map<string, ProcessedTripDay>
  currentDaysRemaining: number
  currentRiskLevel: RiskLevel
  tripsInRange: number
}
