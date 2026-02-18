import { Suspense } from 'react'
import nextDynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'
import { getEmployeeComplianceDataPaginated } from '@/lib/data'
import { getCompanySettings } from '@/lib/actions/settings'
import { ComplianceTable } from '@/components/dashboard/compliance-table'
import { DashboardSkeleton } from '@/components/dashboard/loading-skeleton'
import { AddEmployeeDialog } from '@/components/employees/add-employee-dialog'
import { AlertBanner } from '@/components/alerts/alert-banner'
import { getUnacknowledgedAlertsAction } from '../actions'

const DashboardTour = nextDynamic(
  () => import('@/components/onboarding/dashboard-tour').then(m => m.DashboardTour),
  { ssr: false }
)

export const dynamic = 'force-dynamic'

/** Default page size for employee list */
const PAGE_SIZE = 25

/**
 * Skeleton for the alert banner while loading.
 */
function AlertSkeleton() {
  return (
    <div className="h-14 w-full bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
  )
}

/**
 * Server component that fetches and displays employee compliance data.
 * Uses company-specific status thresholds for badge colors.
 * Supports pagination via URL params.
 */
async function EmployeeComplianceList({
  page,
  search,
}: {
  page: number
  search: string
}) {
  // Fetch company settings to get status thresholds
  const settings = await getCompanySettings()

  // Build thresholds from settings (with defaults)
  const thresholds = {
    greenMax: settings?.status_green_max ?? 60,
    amberMax: settings?.status_amber_max ?? 75,
    redMax: settings?.status_red_max ?? 89,
  }

  // Fetch paginated employee data
  const result = await getEmployeeComplianceDataPaginated(
    { page, pageSize: PAGE_SIZE, search: search || undefined },
    thresholds
  )

  return (
    <ComplianceTable
      employees={result.employees}
      stats={result.stats}
      pagination={result.pagination}
      initialSearch={search}
    />
  )
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

interface DashboardPageProps {
  searchParams: Promise<{ page?: string; search?: string; tour?: string }>
}

/**
 * Main dashboard page for Phase 8.
 * Displays employee compliance status with filtering and sorting.
 * Supports server-side pagination via URL params.
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // Layout already validates auth — use cached access to avoid duplicate queries
  const { userId } = await requireCompanyAccessCached()
  const supabase = await createClient()

  // Parse pagination params from URL
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const search = params.search ?? ''
  const forceTour = params.tour === '1'

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('dashboard_tour_completed_at')
    .eq('id', userId)
    .single()

  if (profileError) {
    console.error('[dashboard] Failed to load tour state:', profileError)
  }

  const shouldAutoStartTour = Boolean(profile && !profile.dashboard_tour_completed_at)
  const shouldShowTour = forceTour || shouldAutoStartTour

  return (
    <div className="space-y-8">
      {shouldShowTour && <DashboardTour startOpen={true} />}

      {/* Alert banner - shows unacknowledged alerts */}
      <Suspense fallback={<AlertSkeleton />}>
        <AlertSection />
      </Suspense>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div data-tour-id="tour-dashboard-home">
          <h1 className="text-xl sm:text-2xl font-semibold text-brand-900">
            Employee Compliance
          </h1>
          <p className="text-sm sm:text-base text-brand-400 mt-1">
            Track Schengen 90/180-day compliance status
          </p>
        </div>
        <AddEmployeeDialog />
      </div>

      {/* Main content with suspense for streaming */}
      <Suspense key={`${page}-${search}`} fallback={<DashboardSkeleton />}>
        <EmployeeComplianceList page={page} search={search} />
      </Suspense>
    </div>
  )
}
