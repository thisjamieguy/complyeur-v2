/**
 * @fileoverview Server-side employee data fetching with caching.
 *
 * Uses React's cache() for request-level deduplication and
 * performance instrumentation for monitoring.
 *
 * @version 2026-01-09
 */

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { parseISO } from 'date-fns'
import {
  calculateCompliance,
  isSchengenCountry,
  type Trip as ComplianceTrip,
} from '@/lib/compliance'
import { withDbTiming } from '@/lib/performance'
import type { EmployeeCompliance } from '@/types/dashboard'

/**
 * Raw employee with trips from database
 */
interface DbEmployee {
  id: string
  name: string
  trips: Array<{
    id: string
    country: string
    entry_date: string
    exit_date: string
    ghosted: boolean | null
  }>
}

/**
 * Convert database trip to compliance engine format
 */
function toComplianceTrip(trip: {
  id: string
  country: string
  entry_date: string
  exit_date: string
}): ComplianceTrip {
  return {
    id: trip.id,
    country: trip.country,
    entryDate: parseISO(trip.entry_date),
    exitDate: parseISO(trip.exit_date),
  }
}

/**
 * Fetch employees with their trips from the database.
 * Uses React cache() for request-level deduplication.
 *
 * This means if multiple components call this function in the same
 * request, the database query only runs once.
 */
export const getEmployeesWithTrips = cache(async (): Promise<DbEmployee[]> => {
  return withDbTiming('getEmployeesWithTrips', async () => {
    const supabase = await createClient()

    // Single query with nested join - no N+1 pattern
    // Uses idx_employees_company_not_deleted and idx_trips_employee_not_ghosted indexes
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        trips (
          id,
          country,
          entry_date,
          exit_date,
          ghosted
        )
      `)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      console.error('Error fetching employees:', error)
      throw new Error('Failed to fetch employees')
    }

    return (employees ?? []) as DbEmployee[]
  })
})

/**
 * Fetch and calculate compliance data for all employees.
 * Uses React cache() for request-level deduplication.
 */
export const getEmployeeComplianceData = cache(async (): Promise<EmployeeCompliance[]> => {
  const employees = await getEmployeesWithTrips()

  if (employees.length === 0) {
    return []
  }

  const today = new Date()

  return employees.map((employee) => {
    // Filter out ghosted trips and non-Schengen countries
    const trips = (employee.trips || [])
      .filter((trip) => !trip.ghosted && isSchengenCountry(trip.country))
      .map(toComplianceTrip)

    // Calculate compliance using the algorithm
    const compliance = calculateCompliance(trips, {
      mode: 'audit',
      referenceDate: today,
    })

    // Find most recent trip (by exit date)
    const lastTrip = (employee.trips || [])
      .filter((trip) => !trip.ghosted)
      .sort((a, b) => b.exit_date.localeCompare(a.exit_date))[0]

    return {
      id: employee.id,
      name: employee.name,
      days_used: compliance.daysUsed,
      days_remaining: compliance.daysRemaining,
      risk_level: compliance.riskLevel,
      last_trip_date: lastTrip?.exit_date || null,
      total_trips: (employee.trips || []).filter((t) => !t.ghosted).length,
      is_compliant: compliance.isCompliant,
    }
  })
})

/**
 * Fetch a single employee with trips.
 * Uses React cache() for request-level deduplication.
 */
export const getEmployeeById = cache(async (id: string) => {
  return withDbTiming('getEmployeeById', async () => {
    const supabase = await createClient()

    // Single query with nested join - uses primary key index
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        created_at,
        trips (
          id,
          country,
          entry_date,
          exit_date,
          purpose,
          job_ref,
          is_private,
          ghosted,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching employee:', error)
      throw new Error('Failed to fetch employee')
    }

    return employee
  })
})

/**
 * Get employee count for current company.
 * Uses React cache() for request-level deduplication.
 */
export const getEmployeeCount = cache(async (): Promise<number> => {
  return withDbTiming('getEmployeeCount', async () => {
    const supabase = await createClient()

    // Uses COUNT with head:true - minimal payload, single index scan
    const { count, error } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (error) {
      console.error('Error counting employees:', error)
      throw new Error('Failed to count employees')
    }

    return count ?? 0
  })
})
