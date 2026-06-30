import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { checkEntitlement } from '@/lib/billing/entitlements'
import { getCompanySettings } from '@/lib/actions/settings'
import { CalendarView } from '@/components/calendar/calendar-view'
import { CalendarSkeleton } from '@/components/calendar/calendar-skeleton'
import { getCalendarEmployees } from '@/lib/data/calendar'
import {
  CALENDAR_HIDE_NO_SCHENGEN_COOKIE,
  parseHideNoSchengenCookie,
} from '@/lib/calendar/filter-preferences'
import { isInteractiveCalendarEnabled } from '@/lib/features'
import type { CalendarLoadMode } from '@/lib/types/settings'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Calendar',
  description: 'Visual timeline of employee Schengen travel',
}

/**
 * Server component that fetches employee data for the calendar.
 */
async function CalendarData({
  calendarLoadMode,
  hideEmployeesWithoutSchengenTrips,
  interactive,
}: {
  calendarLoadMode: CalendarLoadMode
  hideEmployeesWithoutSchengenTrips: boolean
  interactive: boolean
}) {
  const employees = await getCalendarEmployees(
    calendarLoadMode,
    hideEmployeesWithoutSchengenTrips
  )

  return (
    <CalendarView
      employees={employees}
      initialHideEmployeesWithoutSchengenTrips={hideEmployeesWithoutSchengenTrips}
      interactive={interactive}
    />
  )
}

/**
 * Calendar page — horizontal Gantt-style timeline of all employees and trips.
 *
 * Editing (drag/resize/create) is enabled when the interactive-calendar feature
 * flag is on; otherwise the timeline is read-only.
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

  const interactive = isInteractiveCalendarEnabled()
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
        <h1 className="text-2xl font-semibold text-slate-900">Travel Calendar</h1>
        <p className="mt-1 text-slate-600">
          {interactive
            ? 'Create and manage employee travel directly from the timeline.'
            : 'Visual timeline of employee Schengen travel.'}
        </p>
      </div>

      {/* Calendar with suspense for streaming */}
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarData
          calendarLoadMode={calendarLoadMode}
          hideEmployeesWithoutSchengenTrips={hideEmployeesWithoutSchengenTrips}
          interactive={interactive}
        />
      </Suspense>
    </div>
  )
}
