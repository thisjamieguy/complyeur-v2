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
import { toUTCMidnight } from '@/lib/compliance/date-utils'
import { withDbTiming } from '@/lib/performance'
import { isExemptFromTracking, type NationalityType } from '@/lib/constants/nationality-types'
import type { EmployeeCompliance, ComplianceStats } from '@/types/dashboard'

/** Valid sort options for employee compliance table */
export type EmployeeSortOption =
  | 'days_remaining_asc'
  | 'days_remaining_desc'
  | 'name_asc'
  | 'name_desc'
  | 'days_used_desc'
  | 'days_used_asc'

/**
 * Pagination parameters for employee queries
 */
export interface PaginationParams {
  page?: number      // 1-indexed, default 1
  pageSize?: number  // default 25
  search?: string    // optional name search (case-insensitive)
  sort?: EmployeeSortOption  // server-side sort (default: days_remaining_asc)
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

interface DbEmployeeWithoutNationality {
  id: string
  name: string
  nationality_type?: string | null
  trips?: Array<{
    id: string
    country: string
    entry_date: string
    exit_date: string
    ghosted: boolean | null
  }>
}

interface SupabaseQueryErrorLike {
  code?: string | null
  message?: string | null
}

const DEFAULT_NATIONALITY_TYPE: NationalityType = 'uk_citizen'
const VALID_NATIONALITY_TYPES = new Set<NationalityType>([
  'uk_citizen',
  'eu_schengen_citizen',
  'rest_of_world',
])

function isMissingNationalityTypeColumnError(
  error: SupabaseQueryErrorLike | null | undefined
): boolean {
  if (!error) return false
  if (error.code === '42703') return true

  const message = (error.message ?? '').toLowerCase()
  return message.includes('nationality_type') && message.includes('does not exist')
}

function normalizeNationalityType(
  nationalityType: string | null | undefined
): NationalityType {
  if (
    nationalityType &&
    VALID_NATIONALITY_TYPES.has(nationalityType as NationalityType)
  ) {
    return nationalityType as NationalityType
  }
  return DEFAULT_NATIONALITY_TYPE
}

function withDefaultNationality(
  employees: DbEmployeeWithoutNationality[] | null | undefined
): DbEmployee[] {
  return (employees ?? []).map((employee) => ({
    ...employee,
    nationality_type: normalizeNationalityType(employee.nationality_type),
    trips: employee.trips ?? [],
  }))
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

    const runQuery = async (includeNationalityType: boolean) => {
      const selectClause = includeNationalityType
        ? `
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
          `
        : `
            id,
            name,
            trips (
              id,
              country,
              entry_date,
              exit_date,
              ghosted
            )
          `

      return supabase
        .from('employees')
        .select(selectClause)
        .is('deleted_at', null)
        .order('name')
    }

    // Single query with nested join - no N+1 pattern
    // Uses idx_employees_company_not_deleted and idx_trips_employee_not_ghosted indexes
    let { data: employees, error } = await runQuery(true)

    if (error && isMissingNationalityTypeColumnError(error)) {
      console.warn(
        '[Employees] employees.nationality_type is missing; using legacy dashboard fallback'
      )
      const fallback = await runQuery(false)
      employees = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('Error fetching employees:', error)
      throw new Error('Failed to fetch employees')
    }

    return withDefaultNationality(
      (employees ?? []) as unknown as DbEmployeeWithoutNationality[]
    )
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

  const today = toUTCMidnight(new Date())
  const thresholds = statusThresholds ?? DEFAULT_STATUS_THRESHOLDS

  return employees.map((employee) => {
    const nationalityType = normalizeNationalityType(employee.nationality_type)
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
 * Apply sort to employee compliance data
 */
function sortEmployees(
  employees: EmployeeCompliance[],
  sort: EmployeeSortOption
): EmployeeCompliance[] {
  const sorted = [...employees]
  switch (sort) {
    case 'days_remaining_asc':
      sorted.sort((a, b) => a.days_remaining - b.days_remaining)
      break
    case 'days_remaining_desc':
      sorted.sort((a, b) => b.days_remaining - a.days_remaining)
      break
    case 'name_asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'name_desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name))
      break
    case 'days_used_desc':
      sorted.sort((a, b) => b.days_used - a.days_used)
      break
    case 'days_used_asc':
      sorted.sort((a, b) => a.days_used - b.days_used)
      break
  }
  return sorted
}

/**
 * Calculate compliance statistics from employee data
 */
function calculateStats(employees: EmployeeCompliance[]): ComplianceStats {
  let compliant = 0
  let atRisk = 0
  let nonCompliant = 0
  let breach = 0
  let exempt = 0

  for (const emp of employees) {
    switch (emp.risk_level) {
      case 'green': compliant++; break
      case 'amber': atRisk++; break
      case 'red': nonCompliant++; break
      case 'breach': breach++; break
      case 'exempt': exempt++; break
    }
  }

  return {
    total: employees.length,
    compliant,
    at_risk: atRisk,
    non_compliant: nonCompliant,
    breach,
    exempt,
  }
}

/**
 * Fetch paginated employee compliance data with server-side sort, search, and stats.
 *
 * Uses the cached `getEmployeeComplianceData()` to fetch all employees once,
 * then applies search → sort → pagination in memory. This ensures sort works
 * correctly across all pages (not just the current page) and eliminates the
 * separate `getEmployeeStats` fetch.
 *
 * @param params - Pagination, search, and sort parameters
 * @param statusThresholds - Optional custom status thresholds
 */
export async function getEmployeeComplianceDataPaginated(
  params: PaginationParams = {},
  statusThresholds?: StatusThresholds
): Promise<PaginatedEmployeeResult> {
  const { page = 1, pageSize = 25, search, sort = 'days_remaining_asc' } = params

  return withDbTiming('getEmployeeComplianceDataPaginated', async () => {
    // Fetch all employees with compliance (React.cache deduplicates within request)
    const allEmployees = await getEmployeeComplianceData(statusThresholds)

    // Apply search filter
    let filtered = allEmployees
    if (search?.trim()) {
      const searchLower = search.trim().toLowerCase()
      filtered = allEmployees.filter((e) =>
        e.name.toLowerCase().includes(searchLower)
      )
    }

    // Calculate stats from filtered set (before pagination)
    const stats = calculateStats(filtered)

    // Apply server-side sort
    const sorted = sortEmployees(filtered, sort)

    // Paginate
    const totalCount = sorted.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const from = (page - 1) * pageSize
    const pageEmployees = sorted.slice(from, from + pageSize)

    return {
      employees: pageEmployees,
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
 * Fetch a single employee with trips.
 * Uses React cache() for request-level deduplication.
 */
export const getEmployeeById = cache(async (id: string) => {
  return withDbTiming('getEmployeeById', async () => {
    const supabase = await createClient()

    const runQuery = async (includeNationalityType: boolean) => {
      const selectClause = includeNationalityType
        ? `
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
          `
        : `
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
          `

      return supabase
        .from('employees')
        .select(selectClause)
        .eq('id', id)
        .is('deleted_at', null)
        .single()
    }

    // Single query with nested join - uses primary key index
    let { data: employee, error } = await runQuery(true)

    if (error && isMissingNationalityTypeColumnError(error)) {
      console.warn(
        '[Employees] employees.nationality_type is missing; using legacy employee detail fallback'
      )
      const fallback = await runQuery(false)
      employee = fallback.data
      error = fallback.error
    }

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching employee:', error)
      throw new Error('Failed to fetch employee')
    }

    if (!employee) {
      return null
    }

    const normalizedEmployee = employee as unknown as DbEmployeeWithoutNationality

    return {
      ...normalizedEmployee,
      nationality_type: normalizeNationalityType(normalizedEmployee.nationality_type),
      trips: normalizedEmployee.trips ?? [],
    }
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
