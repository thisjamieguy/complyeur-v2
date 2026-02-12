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
import {
  calculateCompliance,
  isSchengenCountry,
  getStatusFromDaysUsed,
  parseDateOnlyAsUTC,
  DEFAULT_STATUS_THRESHOLDS,
  type Trip as ComplianceTrip,
  type StatusThresholds,
} from '@/lib/compliance'
import { withDbTiming } from '@/lib/performance'
import { isExemptFromTracking, type NationalityType } from '@/lib/constants/nationality-types'
import type { EmployeeCompliance, ComplianceStats } from '@/types/dashboard'

/**
 * Pagination parameters for employee queries
 */
export interface PaginationParams {
  page?: number      // 1-indexed, default 1
  pageSize?: number  // default 25
  search?: string    // optional name search (case-insensitive)
}

/**
 * Result of a paginated employee query
 */
export interface PaginatedEmployeeResult {
  employees: EmployeeCompliance[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
  stats: ComplianceStats
}

/**
 * Raw employee with trips from database
 */
interface DbEmployee {
  id: string
  name: string
  nationality_type: string
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
    entryDate: parseDateOnlyAsUTC(trip.entry_date),
    exitDate: parseDateOnlyAsUTC(trip.exit_date),
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
        nationality_type,
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
 *
 * @param statusThresholds - Optional custom status thresholds (days used paradigm)
 *                          If not provided, uses defaults: green ≤60, amber ≤75, red ≤89, breach 90+
 */
export const getEmployeeComplianceData = cache(async (
  statusThresholds?: StatusThresholds
): Promise<EmployeeCompliance[]> => {
  const employees = await getEmployeesWithTrips()

  if (employees.length === 0) {
    return []
  }

  const today = new Date()
  const thresholds = statusThresholds ?? DEFAULT_STATUS_THRESHOLDS

  return employees.map((employee) => {
    const nationalityType = employee.nationality_type as NationalityType
    const exempt = isExemptFromTracking(nationalityType)

    // Find most recent trip (by exit date)
    const lastTrip = (employee.trips || [])
      .filter((trip) => !trip.ghosted)
      .sort((a, b) => b.exit_date.localeCompare(a.exit_date))[0]

    // Exempt employees skip compliance calculation entirely
    if (exempt) {
      return {
        id: employee.id,
        name: employee.name,
        nationality_type: nationalityType,
        days_used: 0,
        days_remaining: 90,
        risk_level: 'exempt' as const,
        last_trip_date: lastTrip?.exit_date || null,
        total_trips: (employee.trips || []).filter((t) => !t.ghosted).length,
        is_compliant: true,
      }
    }

    // Filter out ghosted trips and non-Schengen countries
    const trips = (employee.trips || [])
      .filter((trip) => !trip.ghosted && isSchengenCountry(trip.country))
      .map(toComplianceTrip)

    // Calculate compliance using the algorithm
    const compliance = calculateCompliance(trips, {
      mode: 'audit',
      referenceDate: today,
    })

    // Use days-used based status calculation with configurable thresholds
    const riskLevel = getStatusFromDaysUsed(compliance.daysUsed, thresholds)

    return {
      id: employee.id,
      name: employee.name,
      nationality_type: nationalityType,
      days_used: compliance.daysUsed,
      days_remaining: compliance.daysRemaining,
      risk_level: riskLevel,
      last_trip_date: lastTrip?.exit_date || null,
      total_trips: (employee.trips || []).filter((t) => !t.ghosted).length,
      is_compliant: compliance.isCompliant,
    }
  })
})

/**
 * Fetch paginated employee compliance data with optional search.
 * Calculates stats from total count, not just loaded page.
 *
 * @param params - Pagination and search parameters
 * @param statusThresholds - Optional custom status thresholds
 */
export async function getEmployeeComplianceDataPaginated(
  params: PaginationParams = {},
  statusThresholds?: StatusThresholds
): Promise<PaginatedEmployeeResult> {
  const { page = 1, pageSize = 25, search } = params
  const thresholds = statusThresholds ?? DEFAULT_STATUS_THRESHOLDS
  const today = new Date()

  return withDbTiming('getEmployeeComplianceDataPaginated', async () => {
    const supabase = await createClient()

    // Build base query
    let query = supabase
      .from('employees')
      .select(`
        id,
        name,
        nationality_type,
        trips (
          id,
          country,
          entry_date,
          exit_date,
          ghosted
        )
      `, { count: 'exact' })
      .is('deleted_at', null)

    // Apply search filter if provided
    if (search?.trim()) {
      query = query.ilike('name', `%${search.trim()}%`)
    }

    // Apply ordering and pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data: employees, error, count } = await query
      .order('name')
      .range(from, to)

    if (error) {
      console.error('Error fetching paginated employees:', error)
      throw new Error('Failed to fetch employees')
    }

    const totalCount = count ?? 0
    const totalPages = Math.ceil(totalCount / pageSize)

    // Calculate compliance for fetched employees
    const employeeCompliance = ((employees ?? []) as DbEmployee[]).map((employee) => {
      const nationalityType = employee.nationality_type as NationalityType
      const exempt = isExemptFromTracking(nationalityType)

      const lastTrip = (employee.trips || [])
        .filter((trip) => !trip.ghosted)
        .sort((a, b) => b.exit_date.localeCompare(a.exit_date))[0]

      if (exempt) {
        return {
          id: employee.id,
          name: employee.name,
          nationality_type: nationalityType,
          days_used: 0,
          days_remaining: 90,
          risk_level: 'exempt' as const,
          last_trip_date: lastTrip?.exit_date || null,
          total_trips: (employee.trips || []).filter((t) => !t.ghosted).length,
          is_compliant: true,
        }
      }

      const trips = (employee.trips || [])
        .filter((trip) => !trip.ghosted && isSchengenCountry(trip.country))
        .map(toComplianceTrip)

      const compliance = calculateCompliance(trips, {
        mode: 'audit',
        referenceDate: today,
      })

      const riskLevel = getStatusFromDaysUsed(compliance.daysUsed, thresholds)

      return {
        id: employee.id,
        name: employee.name,
        nationality_type: nationalityType,
        days_used: compliance.daysUsed,
        days_remaining: compliance.daysRemaining,
        risk_level: riskLevel,
        last_trip_date: lastTrip?.exit_date || null,
        total_trips: (employee.trips || []).filter((t) => !t.ghosted).length,
        is_compliant: compliance.isCompliant,
      }
    })

    // Get stats from ALL employees (not just current page) for accurate dashboard stats
    const stats = await getEmployeeStats(thresholds, search)

    return {
      employees: employeeCompliance,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
      stats,
    }
  })
}

/**
 * Get compliance stats for all employees (used for dashboard summary).
 * Separate from pagination to ensure accurate totals.
 */
export const getEmployeeStats = cache(async (
  statusThresholds?: StatusThresholds,
  search?: string
): Promise<ComplianceStats> => {
  return withDbTiming('getEmployeeStats', async () => {
    const supabase = await createClient()
    const thresholds = statusThresholds ?? DEFAULT_STATUS_THRESHOLDS
    const today = new Date()

    // Fetch all employees to calculate stats (this is still needed for accurate stats)
    let query = supabase
      .from('employees')
      .select(`
        id,
        name,
        nationality_type,
        trips (
          id,
          country,
          entry_date,
          exit_date,
          ghosted
        )
      `)
      .is('deleted_at', null)

    if (search?.trim()) {
      query = query.ilike('name', `%${search.trim()}%`)
    }

    const { data: employees, error } = await query.order('name')

    if (error) {
      console.error('Error fetching employee stats:', error)
      throw new Error('Failed to fetch employee stats')
    }

    const allEmployees = (employees ?? []) as DbEmployee[]

    // Calculate stats
    let compliant = 0
    let atRisk = 0
    let nonCompliant = 0
    let breach = 0
    let exempt = 0

    for (const employee of allEmployees) {
      const nationalityType = employee.nationality_type as NationalityType
      if (isExemptFromTracking(nationalityType)) {
        exempt++
        continue
      }

      const trips = (employee.trips || [])
        .filter((trip) => !trip.ghosted && isSchengenCountry(trip.country))
        .map(toComplianceTrip)

      const compliance = calculateCompliance(trips, {
        mode: 'audit',
        referenceDate: today,
      })

      const riskLevel = getStatusFromDaysUsed(compliance.daysUsed, thresholds)

      switch (riskLevel) {
        case 'green':
          compliant++
          break
        case 'amber':
          atRisk++
          break
        case 'red':
          nonCompliant++
          break
        case 'breach':
          breach++
          break
      }
    }

    return {
      total: allEmployees.length,
      compliant,
      at_risk: atRisk,
      non_compliant: nonCompliant,
      breach,
      exempt,
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
        nationality_type,
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
