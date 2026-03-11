import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { checkEntitlement } from '@/lib/billing/entitlements'
import { getCompanySettings } from '@/lib/actions/settings'
import { CalendarView } from '@/components/calendar/calendar-view'
import { CalendarSkeleton } from '@/components/calendar/calendar-skeleton'
import { addUtcDays, toUTCMidnight } from '@/lib/compliance/date-utils'
import { ALL_SCHENGEN_COUNTRIES } from '@/lib/constants/schengen-countries'
import {
  CALENDAR_HIDE_NO_SCHENGEN_COOKIE,
  parseHideNoSchengenCookie,
} from '@/lib/calendar/filter-preferences'
import type { CalendarLoadMode } from '@/lib/types/settings'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Calendar',
  description: 'Visual timeline of employee Schengen travel',
}

const DAYS_BACK = 200
const MAX_WEEKS_FORWARD = 12
const COMPLIANCE_LOOKBACK_DAYS = 180

/**
 * Employee with trips for calendar view
 */
interface EmployeeWithTrips {
  id: string
  name: string
  trips: Array<{
    id: string
    country: string
    entry_date: string
    exit_date: string
    purpose: string | null
    is_private: boolean
    ghosted: boolean
  }>
}

type TripRow = EmployeeWithTrips['trips'][number] & {
  employee_id: string
}

interface EmployeeRow {
  id: string
  name: string
}

function buildTripsByEmployee(trips: TripRow[]): Map<string, EmployeeWithTrips['trips']> {
  const tripsByEmployee = new Map<string, EmployeeWithTrips['trips']>()

  for (const trip of trips) {
    const existing = tripsByEmployee.get(trip.employee_id)
    const tripData = {
      id: trip.id,
      country: trip.country,
      entry_date: trip.entry_date,
      exit_date: trip.exit_date,
      purpose: trip.purpose,
      is_private: trip.is_private,
      ghosted: trip.ghosted,
    }

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
 * Uses request-scoped cache and limits trip payload to the calendar horizon.
 */
const getEmployeesWithTrips = cache(async (
  calendarLoadMode: CalendarLoadMode,
  hideEmployeesWithoutSchengenTrips: boolean
): Promise<EmployeeWithTrips[]> => {
  const supabase = await createClient()
  const today = toUTCMidnight(new Date())
  const windowStart = addUtcDays(today, -(DAYS_BACK + COMPLIANCE_LOOKBACK_DAYS))
  const windowEnd = addUtcDays(today, MAX_WEEKS_FORWARD * 7)
  const windowStartKey = windowStart.toISOString().split('T')[0]
  const windowEndKey = windowEnd.toISOString().split('T')[0]
  const schengenCountryCodes = Array.from(ALL_SCHENGEN_COUNTRIES)

  const getEmployeesByIds = async (employeeIds: string[]): Promise<EmployeeRow[]> => {
    if (employeeIds.length === 0) {
      return []
    }

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name')
      .is('deleted_at', null)
      .in('id', employeeIds)
      .order('name')

    if (employeesError) {
      console.error('Error fetching employees for calendar:', employeesError)
      throw new Error('Failed to fetch employees')
    }

    return (employees ?? []) as EmployeeRow[]
  }

  const getTripsByEmployeeIds = async (employeeIds: string[]): Promise<TripRow[]> => {
    if (employeeIds.length === 0) {
      return []
    }

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        employee_id,
        country,
        entry_date,
        exit_date,
        purpose,
        is_private,
        ghosted
      `)
      .in('employee_id', employeeIds)
      .eq('ghosted', false)
      .lte('entry_date', windowEndKey)
      .gte('exit_date', windowStartKey)
      .order('entry_date', { ascending: true })

    if (tripsError) {
      console.error('[Calendar] Error fetching trips:', tripsError)
      throw new Error('Failed to fetch trips')
    }

    return (trips ?? []) as TripRow[]
  }

  if (hideEmployeesWithoutSchengenTrips) {
    const { data: schengenTrips, error: schengenTripsError } = await supabase
      .from('trips')
      .select('employee_id')
      .eq('ghosted', false)
      .in('country', schengenCountryCodes)
      .lte('entry_date', windowEndKey)
      .gte('exit_date', windowStartKey)

    if (schengenTripsError) {
      console.error('[Calendar] Error fetching Schengen trip employees:', schengenTripsError)
      throw new Error('Failed to fetch trips')
    }

    const employeeIds = Array.from(
      new Set((schengenTrips ?? []).map((trip) => trip.employee_id))
    )

    if (employeeIds.length === 0) {
      return []
    }

    const [employees, trips] = await Promise.all([
      getEmployeesByIds(employeeIds),
      getTripsByEmployeeIds(employeeIds),
    ])

    return mapEmployeesWithTrips(employees, trips)
  }

  if (calendarLoadMode === 'employees_with_trips') {
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('employee_id')
      .eq('ghosted', false)
      .lte('entry_date', windowEndKey)
      .gte('exit_date', windowStartKey)

    if (tripsError) {
      console.error('[Calendar] Error fetching trips (employees_with_trips):', tripsError)
      throw new Error('Failed to fetch trips')
    }

    const employeeIds = Array.from(
      new Set((trips ?? []).map((trip) => trip.employee_id))
    )

    if (employeeIds.length === 0) {
      return []
    }

    const [employees, tripRows] = await Promise.all([
      getEmployeesByIds(employeeIds),
      getTripsByEmployeeIds(employeeIds),
    ])

    return mapEmployeesWithTrips(employees, tripRows)
  }

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  if (employeesError) {
    console.error('Error fetching employees for calendar:', employeesError)
    throw new Error('Failed to fetch employees')
  }

  if (!employees || employees.length === 0) {
    return []
  }

  const employeeIds = employees.map((employee) => employee.id)
  const tripRows = await getTripsByEmployeeIds(employeeIds)

  return mapEmployeesWithTrips((employees ?? []) as EmployeeRow[], tripRows)
})

/**
 * Server component that fetches employee data for calendar
 */
async function CalendarData({
  calendarLoadMode,
  hideEmployeesWithoutSchengenTrips,
}: {
  calendarLoadMode: CalendarLoadMode
  hideEmployeesWithoutSchengenTrips: boolean
}) {
  const employees = await getEmployeesWithTrips(
    calendarLoadMode,
    hideEmployeesWithoutSchengenTrips
  )

  return (
    <CalendarView
      employees={employees}
      initialHideEmployeesWithoutSchengenTrips={hideEmployeesWithoutSchengenTrips}
    />
  )
}

/**
 * Calendar page - horizontal Gantt-style timeline showing all employees and trips
 */
export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const hasCalendar = await checkEntitlement('can_calendar')
  if (!hasCalendar) {
    redirect('/dashboard?upgrade=calendar')
  }

  const settings = await getCompanySettings()
  const calendarLoadMode = settings?.calendar_load_mode ?? 'all_employees'
  const cookieStore = await cookies()
  const hideEmployeesWithoutSchengenTrips = parseHideNoSchengenCookie(
    cookieStore.get(CALENDAR_HIDE_NO_SCHENGEN_COOKIE)?.value
  )

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Travel Calendar
        </h1>
        <p className="text-slate-500 mt-1">
          Visual timeline of employee Schengen travel
        </p>
      </div>

      {/* Calendar with suspense for streaming */}
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarData
          calendarLoadMode={calendarLoadMode}
          hideEmployeesWithoutSchengenTrips={hideEmployeesWithoutSchengenTrips}
        />
      </Suspense>
    </div>
  )
}
