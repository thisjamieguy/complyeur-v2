/**
 * @fileoverview Cached compliance calculations for server components.
 *
 * Uses React's cache() function to memoize compliance calculations
 * within a single request. This prevents redundant calculations when
 * multiple components need the same data.
 *
 * @version 2025-01-09
 */

import { cache } from 'react'
import {
  calculateCompliance,
  presenceDays,
  daysUsedInWindow,
  getRiskLevel,
  type Trip,
  type ComplianceConfig,
  type ComplianceResult,
  type RiskLevel,
} from './index'

/**
 * Cache key generator for trips array.
 * Creates a stable key from trip data for memoization.
 */
function createTripsKey(trips: readonly Trip[]): string {
  return trips
    .map(t => `${t.id ?? ''}-${t.entryDate.toISOString()}-${t.exitDate?.toISOString() ?? 'active'}-${t.country}`)
    .sort()
    .join('|')
}

/**
 * Cached compliance calculation for a single reference date.
 * Memoized within the same React request.
 */
export const getCachedCompliance = cache(
  (trips: readonly Trip[], config: ComplianceConfig): ComplianceResult => {
    return calculateCompliance(trips, config)
  }
)

/**
 * Batch calculate compliance for multiple employees efficiently.
 * Shares the same reference date config across all calculations.
 *
 * @param employeesWithTrips - Array of employees with their trips
 * @param referenceDate - Reference date for all calculations
 * @returns Map of employee ID to compliance result
 */
export function batchCalculateCompliance(
  employeesWithTrips: Array<{
    id: string
    trips: readonly Trip[]
  }>,
  referenceDate: Date
): Map<string, ComplianceResult> {
  const config: ComplianceConfig = {
    mode: 'audit',
    referenceDate,
  }

  const results = new Map<string, ComplianceResult>()

  for (const employee of employeesWithTrips) {
    const result = calculateCompliance(employee.trips, config)
    results.set(employee.id, result)
  }

  return results
}

/**
 * Calculate compliance with memoization for repeated calls.
 * Use this in client components where React cache isn't available.
 *
 * Creates an internal cache that persists for the lifetime of the
 * memoized function instance.
 */
export function createComplianceCalculator() {
  const cache = new Map<string, ComplianceResult>()

  return function calculateWithCache(
    trips: readonly Trip[],
    config: ComplianceConfig
  ): ComplianceResult {
    const tripsKey = createTripsKey(trips)
    const configKey = `${config.mode}-${config.referenceDate.toISOString()}`
    const cacheKey = `${tripsKey}:${configKey}`

    const cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }

    const result = calculateCompliance(trips, config)
    cache.set(cacheKey, result)

    return result
  }
}

/**
 * Pre-calculate compliance for all dates in a range.
 * Useful for calendar views where you need compliance at multiple points.
 *
 * @param trips - Employee's trips
 * @param startDate - Start of the date range
 * @param endDate - End of the date range
 * @returns Map of date ISO string to compliance result
 */
export function calculateComplianceRange(
  trips: readonly Trip[],
  startDate: Date,
  endDate: Date
): Map<string, ComplianceResult> {
  const results = new Map<string, ComplianceResult>()

  // Pre-calculate presence days once (expensive operation)
  const presence = presenceDays(trips, {
    mode: 'audit',
    referenceDate: endDate, // Use end date to include all trips
  })

  let current = new Date(startDate)
  const end = new Date(endDate)

  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0]
    const daysUsed = daysUsedInWindow(presence, current)
    const daysRemaining = 90 - daysUsed
    const riskLevel = getRiskLevel(daysRemaining)

    results.set(dateKey, {
      referenceDate: new Date(current),
      daysUsed,
      daysRemaining,
      riskLevel,
      isCompliant: daysUsed < 90,  // 90 days = violation
    })

    // Move to next day
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000)
  }

  return results
}

/**
 * Get compliance at specific dates efficiently.
 * Only calculates for the specified dates, not the entire range.
 *
 * @param trips - Employee's trips
 * @param dates - Specific dates to calculate compliance for
 * @returns Map of date ISO string to compliance result
 */
export function getComplianceAtDates(
  trips: readonly Trip[],
  dates: Date[]
): Map<string, ComplianceResult> {
  const results = new Map<string, ComplianceResult>()

  if (dates.length === 0) {
    return results
  }

  // Find the latest date to use for presence calculation
  const latestDate = dates.reduce((max, d) => d > max ? d : max, dates[0])

  // Pre-calculate presence days once
  const presence = presenceDays(trips, {
    mode: 'audit',
    referenceDate: latestDate,
  })

  for (const date of dates) {
    const dateKey = date.toISOString().split('T')[0]
    const daysUsed = daysUsedInWindow(presence, date)
    const daysRemaining = 90 - daysUsed
    const riskLevel = getRiskLevel(daysRemaining)

    results.set(dateKey, {
      referenceDate: new Date(date),
      daysUsed,
      daysRemaining,
      riskLevel,
      isCompliant: daysUsed < 90,  // 90 days = violation
    })
  }

  return results
}
