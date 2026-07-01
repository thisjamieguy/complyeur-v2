import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { addUtcDays, toUTCMidnight } from '@/lib/compliance/date-utils'
import { ALL_SCHENGEN_COUNTRIES } from '@/lib/constants/schengen-countries'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import type { CalendarLoadMode } from '@/lib/types/settings'
import type { DbTrip, EmployeeWithTrips } from '@/components/calendar/types'

/**
 * @fileoverview Shared, request-cached data access for the calendar.
 *
 * The calendar lives at a single route (`/calendar`); `/calendar-v2` redirects
 * to it. Keeping the fetch here (rather than inline in the page) means it has
 * one tested home and the page component stays thin.
 *
 * Returns `EmployeeWithTrips` (from components/calendar/types) rather than a
 * locally-declared shape, so this layer and the client-side calendar code
 * can't silently drift apart on what an "employee with trips" looks like.
 */

/** Days of history to load before today. */
const DAYS_BACK = 200
/** Weeks of future trips to load after today. */
const MAX_WEEKS_FORWARD = 12
/** Extra lookback so the 180-day rolling window is fully covered. */
const COMPLIANCE_LOOKBACK_DAYS = 180
/**
 * PostgREST silently caps responses at 1000 rows. Companies with enough
 * employees exceed that inside the calendar window, so every list query here
 * must page until a short page — otherwise trips silently vanish from the
 * calendar and employees look compliant when they are not.
 */
const QUERY_PAGE_SIZE = 1000

type TripRow = DbTrip & {
  employee_id: string
}

interface EmployeeRow {
  id: string
  name: string
}

interface PageResult {
  data: unknown
  error: { message: string } | null
}

/**
 * Page through a query until a short page so results are never truncated at
 * the PostgREST row cap. `buildPage` must apply `.range(from, to)` itself and
 * use a deterministic ORDER BY so pages don't overlap.
 */
async function fetchAllPages<T>(
  label: string,
  buildPage: (from: number, to: number) => PromiseLike<PageResult>
): Promise<T[]> {
  const rows: T[] = []

  for (let from = 0; ; from += QUERY_PAGE_SIZE) {
    const { data, error } = await buildPage(from, from + QUERY_PAGE_SIZE - 1)

    if (error) {
      console.error(`[Calendar] Error fetching ${label}:`, error)
      throw new Error(`Failed to fetch ${label}`)
    }

    const page = (data ?? []) as T[]
    rows.push(...page)

    if (page.length < QUERY_PAGE_SIZE) {
      return rows
    }
  }
}

function buildTripsByEmployee(trips: TripRow[]): Map<string, DbTrip[]> {
  const tripsByEmployee = new Map<string, DbTrip[]>()

  for (const trip of trips) {
    const tripData = {
      id: trip.id,
      country: trip.country,
      entry_date: trip.entry_date,
      exit_date: trip.exit_date,
      purpose: trip.purpose,
      job_ref: trip.job_ref,
      is_private: trip.is_private,
      ghosted: trip.ghosted,
    }

    const existing = tripsByEmployee.get(trip.employee_id)
    if (existing) {
      existing.push(tripData)
    } else {
      tripsByEmployee.set(trip.employee_id, [tripData])
    }
  }

  return tripsByEmployee
}

function mapEmployeesWithTrips(
  employees: EmployeeRow[],
  trips: TripRow[]
): EmployeeWithTrips[] {
  const tripsByEmployee = buildTripsByEmployee(trips)

  return employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    trips: tripsByEmployee.get(employee.id) ?? [],
  }))
}

/**
 * Fetch all employees with their trips for the calendar view.
 *
 * Request-scoped via React `cache()` so multiple components in the same render
 * (page + Suspense child) share a single query. Trips are limited to the
 * calendar horizon to keep the payload small. RLS scopes every query to the
 * caller's company.
 */
export const getCalendarEmployees = cache(async (
  calendarLoadMode: CalendarLoadMode,
  hideEmployeesWithoutSchengenTrips: boolean
): Promise<EmployeeWithTrips[]> => {
  const supabase = await createClient()
  const { companyId } = await requireCompanyAccess(supabase)
  const today = toUTCMidnight(new Date())
  const windowStart = addUtcDays(today, -(DAYS_BACK + COMPLIANCE_LOOKBACK_DAYS))
  const windowEnd = addUtcDays(today, MAX_WEEKS_FORWARD * 7)
  const windowStartKey = windowStart.toISOString().split('T')[0]
  const windowEndKey = windowEnd.toISOString().split('T')[0]
  const schengenCountryCodes = Array.from(ALL_SCHENGEN_COUNTRIES)

  const getEmployeesByIds = async (employeeIds: string[]): Promise<EmployeeRow[]> => {
    if (employeeIds.length === 0) return []

    return fetchAllPages<EmployeeRow>('employees', (from, to) =>
      supabase
        .from('employees')
        .select('id, name')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .in('id', employeeIds)
        .order('name')
        .order('id')
        .range(from, to)
    )
  }

  const getTripsByEmployeeIds = async (employeeIds: string[]): Promise<TripRow[]> => {
    if (employeeIds.length === 0) return []

    return fetchAllPages<TripRow>('trips', (from, to) =>
      supabase
        .from('trips')
        .select(`
          id,
          employee_id,
          country,
          entry_date,
          exit_date,
          purpose,
          job_ref,
          is_private,
          ghosted
        `)
        .eq('company_id', companyId)
        .in('employee_id', employeeIds)
        .eq('ghosted', false)
        .lte('entry_date', windowEndKey)
        .gte('exit_date', windowStartKey)
        .order('entry_date', { ascending: true })
        .order('id')
        .range(from, to)
    )
  }

  const getTripsInWindow = async (): Promise<TripRow[]> =>
    fetchAllPages<TripRow>('trips', (from, to) =>
      supabase
        .from('trips')
        .select(`
          id,
          employee_id,
          country,
          entry_date,
          exit_date,
          purpose,
          job_ref,
          is_private,
          ghosted
        `)
        .eq('company_id', companyId)
        .eq('ghosted', false)
        .lte('entry_date', windowEndKey)
        .gte('exit_date', windowStartKey)
        .order('entry_date', { ascending: true })
        .order('id')
        .range(from, to)
    )

  // Only employees who have at least one Schengen trip in the window.
  if (hideEmployeesWithoutSchengenTrips) {
    const schengenTrips = await fetchAllPages<{ employee_id: string }>(
      'trips',
      (from, to) =>
        supabase
          .from('trips')
          .select('employee_id')
          .eq('company_id', companyId)
          .eq('ghosted', false)
          .in('country', schengenCountryCodes)
          .lte('entry_date', windowEndKey)
          .gte('exit_date', windowStartKey)
          .order('id')
          .range(from, to)
    )

    const employeeIds = Array.from(new Set(schengenTrips.map((t) => t.employee_id)))
    if (employeeIds.length === 0) return []

    const [employees, trips] = await Promise.all([
      getEmployeesByIds(employeeIds),
      getTripsByEmployeeIds(employeeIds),
    ])

    return mapEmployeesWithTrips(employees, trips)
  }

  // Only employees who have any trip in the window.
  if (calendarLoadMode === 'employees_with_trips') {
    const trips = await fetchAllPages<{ employee_id: string }>('trips', (from, to) =>
      supabase
        .from('trips')
        .select('employee_id')
        .eq('company_id', companyId)
        .eq('ghosted', false)
        .lte('entry_date', windowEndKey)
        .gte('exit_date', windowStartKey)
        .order('id')
        .range(from, to)
    )

    const employeeIds = Array.from(new Set(trips.map((t) => t.employee_id)))
    if (employeeIds.length === 0) return []

    const [employees, tripRows] = await Promise.all([
      getEmployeesByIds(employeeIds),
      getTripsByEmployeeIds(employeeIds),
    ])

    return mapEmployeesWithTrips(employees, tripRows)
  }

  // Default: all employees, with their trips in the window. getTripsInWindow()
  // doesn't filter by employee IDs, so it has no dependency on the employees
  // query below — run both concurrently instead of paying two round trips.
  const [employees, tripRows] = await Promise.all([
    fetchAllPages<EmployeeRow>('employees', (from, to) =>
      supabase
        .from('employees')
        .select('id, name')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name')
        .order('id')
        .range(from, to)
    ),
    getTripsInWindow(),
  ])

  if (employees.length === 0) return []

  return mapEmployeesWithTrips(employees, tripRows)
})
