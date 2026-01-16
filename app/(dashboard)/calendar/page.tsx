import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/calendar/calendar-view'
import { CalendarSkeleton } from '@/components/calendar/calendar-skeleton'
import { CalendarEmptyState } from '@/components/calendar/calendar-empty-state'

export const dynamic = 'force-dynamic'

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
    job_ref: string | null
    is_private: boolean
    ghosted: boolean
  }>
}

/**
 * Fetch all employees with their trips for the calendar view.
 * Uses React cache() for request-level deduplication.
 */
const getEmployeesWithTrips = cache(async (): Promise<EmployeeWithTrips[]> => {
  const supabase = await createClient()

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
        purpose,
        job_ref,
        is_private,
        ghosted
      )
    `)
    .is('deleted_at', null)
    .order('name')

  if (error) {
    console.error('Error fetching employees for calendar:', error)
    throw new Error('Failed to fetch employees')
  }

  return (employees || []) as EmployeeWithTrips[]
})

/**
 * Server component that fetches employee data for calendar
 */
async function CalendarData() {
  const employees = await getEmployeesWithTrips()

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
        <CalendarData />
      </Suspense>
    </div>
  )
}
