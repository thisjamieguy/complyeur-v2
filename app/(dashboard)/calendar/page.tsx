import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { checkEntitlement } from '@/lib/billing/entitlements'
import { getCompanySettings } from '@/lib/actions/settings'
import { CalendarView } from '@/components/calendar/calendar-view'
import { CalendarSkeleton } from '@/components/calendar/calendar-skeleton'
import { CalendarEmptyState } from '@/components/calendar/calendar-empty-state'
import { addUtcDays, toUTCMidnight } from '@/lib/compliance/date-utils'
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

/**
 * Fetch all employees with their trips for the calendar view.
 * Uses request-scoped cache and limits trip payload to the calendar horizon.
 */
const getEmployeesWithTrips = cache(async (
  calendarLoadMode: CalendarLoadMode
): Promise<EmployeeWithTrips[]> => {
  const supabase = await createClient()
  const today = toUTCMidnight(new Date())
  const windowStart = addUtcDays(today, -(DAYS_BACK + COMPLIANCE_LOOKBACK_DAYS))
  const windowEnd = addUtcDays(today, MAX_WEEKS_FORWARD * 7)
  const windowStartKey = windowStart.toISOString().split('T')[0]
  const windowEndKey = windowEnd.toISOString().split('T')[0]

  if (calendarLoadMode === 'employees_with_trips') {
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
      .eq('ghosted', false)
      .lte('entry_date', windowEndKey)
      .gte('exit_date', windowStartKey)
      .order('entry_date', { ascending: true })

    if (tripsError) {
      console.error('[Calendar] Error fetching trips (employees_with_trips):', tripsError)
      throw new Error('Failed to fetch trips')
    }

    const tripRows = (trips ?? []) as TripRow[]
    console.log('[Calendar] employees_with_trips mode — trips fetched:', tripRows.length)
    if (tripRows.length === 0) {
      return []
    }

    const employeeIds = Array.from(new Set(tripRows.map((trip) => trip.employee_id)))
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

    const tripsByEmployee = buildTripsByEmployee(tripRows)

    return (employees ?? []).map((employee) => ({
      id: employee.id,
      name: employee.name,
      trips: tripsByEmployee.get(employee.id) ?? [],
    }))
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
    console.error('[Calendar] Error fetching trips (all_employees):', tripsError)
    throw new Error('Failed to fetch trips')
  }

  const tripRows = (trips ?? []) as TripRow[]
  console.log('[Calendar] all_employees mode — employees:', employees.length, 'trips:', tripRows.length)
  const tripsByEmployee = buildTripsByEmployee(tripRows)

  return employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    trips: tripsByEmployee.get(employee.id) ?? [],
  }))
})

/**
 * Server component that fetches employee data for calendar
 */
async function CalendarData({ calendarLoadMode }: { calendarLoadMode: CalendarLoadMode }) {
  const employees = await getEmployeesWithTrips(calendarLoadMode)

  if (employees.length === 0) {
    return <CalendarEmptyState />
  }

  return <CalendarView employees={employees} />
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
        <CalendarData calendarLoadMode={calendarLoadMode} />
      </Suspense>
    </div>
  )
}
