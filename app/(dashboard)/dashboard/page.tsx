import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import {
  calculateCompliance,
  isSchengenCountry,
  type Trip as ComplianceTrip,
} from '@/lib/compliance'
import type { EmployeeCompliance } from '@/types/dashboard'
import { ComplianceTable } from '@/components/dashboard/compliance-table'
import { DashboardSkeleton } from '@/components/dashboard/loading-skeleton'
import { AddEmployeeDialog } from '@/components/employees/add-employee-dialog'
import { AlertBanner } from '@/components/alerts'
import { getUnacknowledgedAlertsAction } from '../actions'

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
 * Calculate compliance data for all employees.
 * Uses the Phase 7 compliance algorithm for accurate 90/180-day calculations.
 */
async function getEmployeeComplianceData(): Promise<EmployeeCompliance[]> {
  const supabase = await createClient()

  // Fetch employees with their trips
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
    .order('name')

  if (error) {
    console.error('Error fetching employees:', error)
    throw new Error('Failed to fetch employees')
  }

  if (!employees || employees.length === 0) {
    return []
  }

  // Calculate compliance for each employee
  const today = new Date()

  const complianceData: EmployeeCompliance[] = employees.map((employee) => {
    // Filter out ghosted trips and non-Schengen countries
    const trips = (employee.trips || [])
      .filter((trip) => !trip.ghosted && isSchengenCountry(trip.country))
      .map(toComplianceTrip)

    // Calculate compliance using Phase 7 algorithm
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

  return complianceData
}

/**
 * Server component that fetches and displays employee compliance data.
 */
async function EmployeeComplianceList() {
  const employees = await getEmployeeComplianceData()
  return <ComplianceTable employees={employees} />
}

/**
 * Server component to fetch alerts
 */
async function AlertSection() {
  try {
    const alerts = await getUnacknowledgedAlertsAction()
    return <AlertBanner alerts={alerts} />
  } catch {
    // Silently fail for alerts - don't break the dashboard
    return null
  }
}

/**
 * Main dashboard page for Phase 8.
 * Displays employee compliance status with filtering and sorting.
 */
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-8">
      {/* Alert banner - shows unacknowledged alerts */}
      <Suspense fallback={null}>
        <AlertSection />
      </Suspense>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Employee Compliance
          </h1>
          <p className="text-slate-500 mt-1">
            Track Schengen 90/180-day compliance status
          </p>
        </div>
        <AddEmployeeDialog />
      </div>

      {/* Main content with suspense for streaming */}
      <Suspense fallback={<DashboardSkeleton />}>
        <EmployeeComplianceList />
      </Suspense>
    </div>
  )
}
