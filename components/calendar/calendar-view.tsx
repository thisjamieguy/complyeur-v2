'use client'

import { useState, useMemo } from 'react'
import {
  parseISO,
  startOfDay,
  addDays,
  subDays,
  eachDayOfInterval,
  differenceInDays,
  isWithinInterval,
} from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  calculateCompliance,
  isSchengenCountry,
  type Trip as ComplianceTrip,
  type RiskLevel,
} from '@/lib/compliance'
import { RangeSelector } from './range-selector'
import { GanttChart } from './gantt-chart'
import { MobileCalendarView } from './mobile-calendar-view'

/** Days to look back from today */
const DAYS_BACK = 200

/** Default weeks forward */
const DEFAULT_WEEKS_FORWARD = 6

interface DbTrip {
  id: string
  country: string
  entry_date: string
  exit_date: string
  purpose: string | null
  job_ref: string | null
  is_private: boolean
  ghosted: boolean
}

interface EmployeeWithTrips {
  id: string
  name: string
  trips: DbTrip[]
}

interface CalendarViewProps {
  employees: EmployeeWithTrips[]
}

interface ProcessedTrip {
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

interface ProcessedEmployee {
  id: string
  name: string
  trips: ProcessedTrip[]
  currentDaysRemaining: number
  currentRiskLevel: RiskLevel
  tripsInRange: number
}

/**
 * Convert DB trip to compliance engine format
 */
function toComplianceTrip(trip: DbTrip): ComplianceTrip {
  return {
    id: trip.id,
    country: trip.country,
    entryDate: parseISO(trip.entry_date),
    exitDate: parseISO(trip.exit_date),
  }
}

/**
 * Calculate risk level at the end of a specific trip
 */
function getTripRiskLevel(
  trip: DbTrip,
  allEmployeeTrips: DbTrip[]
): RiskLevel {
  // Only calculate for Schengen trips
  if (!isSchengenCountry(trip.country)) {
    return 'green' // Non-Schengen trips don't affect compliance
  }

  // Convert to compliance format - only include non-ghosted Schengen trips
  const complianceTrips = allEmployeeTrips
    .filter((t) => !t.ghosted && isSchengenCountry(t.country))
    .map(toComplianceTrip)

  // Calculate compliance at end of this trip
  const result = calculateCompliance(complianceTrips, {
    mode: 'audit',
    referenceDate: parseISO(trip.exit_date),
  })

  return result.riskLevel
}

/**
 * Main calendar view component - orchestrates Gantt chart and mobile view
 */
export function CalendarView({ employees }: CalendarViewProps) {
  const [weeksForward, setWeeksForward] = useState(DEFAULT_WEEKS_FORWARD)

  // Calculate date range
  const { startDate, endDate, dates } = useMemo(() => {
    const today = startOfDay(new Date())
    const start = subDays(today, DAYS_BACK)
    const end = addDays(today, weeksForward * 7)

    const allDates = eachDayOfInterval({ start, end })

    return {
      startDate: start,
      endDate: end,
      dates: allDates,
    }
  }, [weeksForward])

  // Process employees and their trips
  const processedEmployees = useMemo((): ProcessedEmployee[] => {
    const today = startOfDay(new Date())

    return employees.map((employee) => {
      // Filter out ghosted trips
      const activeTrips = employee.trips.filter((t) => !t.ghosted)

      // Calculate current compliance status
      const complianceTrips = activeTrips
        .filter((t) => isSchengenCountry(t.country))
        .map(toComplianceTrip)

      const currentCompliance = calculateCompliance(complianceTrips, {
        mode: 'audit',
        referenceDate: today,
      })

      // Process trips that fall within the date range
      const tripsInRange = activeTrips.filter((trip) => {
        const entryDate = parseISO(trip.entry_date)
        const exitDate = parseISO(trip.exit_date)

        // Check if trip overlaps with our date range
        return (
          isWithinInterval(entryDate, { start: startDate, end: endDate }) ||
          isWithinInterval(exitDate, { start: startDate, end: endDate }) ||
          (entryDate <= startDate && exitDate >= endDate)
        )
      })

      // Process each trip
      const processedTrips: ProcessedTrip[] = tripsInRange.map((trip) => {
        const entryDate = parseISO(trip.entry_date)
        const exitDate = parseISO(trip.exit_date)
        const duration = differenceInDays(exitDate, entryDate) + 1
        const isSchengen = isSchengenCountry(trip.country)

        // Calculate risk level at end of trip
        const riskLevel = getTripRiskLevel(trip, activeTrips)

        // Calculate days remaining at end of trip
        const tripCompliance = isSchengen
          ? calculateCompliance(
              activeTrips
                .filter((t) => !t.ghosted && isSchengenCountry(t.country))
                .map(toComplianceTrip),
              {
                mode: 'audit',
                referenceDate: exitDate,
              }
            )
          : { daysRemaining: 90 }

        return {
          id: trip.id,
          country: trip.is_private ? 'XX' : trip.country,
          entryDate,
          exitDate,
          duration,
          daysRemaining: tripCompliance.daysRemaining,
          riskLevel,
          purpose: trip.purpose,
          isPrivate: trip.is_private,
          isSchengen,
        }
      })

      return {
        id: employee.id,
        name: employee.name,
        trips: processedTrips,
        currentDaysRemaining: currentCompliance.daysRemaining,
        currentRiskLevel: currentCompliance.riskLevel,
        tripsInRange: tripsInRange.length,
      }
    })
  }, [employees, startDate, endDate])

  return (
    <>
      {/* Desktop view - Gantt chart */}
      <div className="hidden md:block">
        <Card className="rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <h2 className="text-sm font-medium text-slate-700">
              Timeline View
            </h2>
            <RangeSelector value={weeksForward} onChange={setWeeksForward} />
          </CardHeader>
          <CardContent className="p-0">
            <GanttChart
              employees={processedEmployees}
              dates={dates}
              startDate={startDate}
            />
          </CardContent>
        </Card>
      </div>

      {/* Mobile view - simplified list */}
      <div className="md:hidden">
        <MobileCalendarView employees={processedEmployees} />
      </div>
    </>
  )
}
