import type { RiskLevel } from '@/lib/compliance'

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
  daysUsed: number
  daysRemaining: number
  riskLevel: RiskLevel
  isBreachDay: boolean
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
