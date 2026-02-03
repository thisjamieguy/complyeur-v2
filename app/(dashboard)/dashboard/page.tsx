import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEmployeeComplianceData } from '@/lib/data'
import { getCompanySettings } from '@/lib/actions/settings'
import { ComplianceTable } from '@/components/dashboard/compliance-table'
import { DashboardSkeleton } from '@/components/dashboard/loading-skeleton'
import { AddEmployeeDialog } from '@/components/employees/add-employee-dialog'
import { AlertBanner } from '@/components/alerts'
import { getUnacknowledgedAlertsAction } from '../actions'

export const dynamic = 'force-dynamic'

/**
 * Server component that fetches and displays employee compliance data.
 * Uses company-specific status thresholds for badge colors.
 */
async function EmployeeComplianceList() {
  // Fetch company settings to get status thresholds
  const settings = await getCompanySettings()

  // Build thresholds from settings (with defaults)
  const thresholds = {
    greenMax: settings?.status_green_max ?? 60,
    amberMax: settings?.status_amber_max ?? 75,
    redMax: settings?.status_red_max ?? 89,
  }

  const employees = await getEmployeeComplianceData(thresholds)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
            Employee Compliance
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
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
