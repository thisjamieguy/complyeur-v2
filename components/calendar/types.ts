import type { RiskLevel } from '@/lib/compliance'

export interface ProcessedTrip {
  id: string
  country: string
  entryDate: Date
  exitDate: Date
  duration: number
  daysRemaining: number
  riskLevel: RiskLevel
  purpose: string | null
  isPrivate: boolean
  isSchengen: boolean
}

export interface ProcessedEmployee {
  id: string
  name: string
  trips: ProcessedTrip[]
  dayMap: Map<string, ProcessedTrip>
  currentDaysRemaining: number
  currentRiskLevel: RiskLevel
  tripsInRange: number
}
