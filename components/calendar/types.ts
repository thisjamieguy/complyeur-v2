import type { DailyCompliance, RiskLevel } from '@/lib/compliance'

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
