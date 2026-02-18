import { Suspense } from 'react'
import nextDynamic from 'next/dynamic'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'
import { getDashboardTourState } from '@/lib/db/profiles'
import { getEmployeeComplianceDataPaginated, type EmployeeSortOption } from '@/lib/data'
import { getCompanySettings } from '@/lib/actions/settings'
import { ComplianceTable } from '@/components/dashboard/compliance-table'
import { DashboardSkeleton } from '@/components/dashboard/loading-skeleton'
import { AddEmployeeDialog } from '@/components/employees/add-employee-dialog'
import { AlertBanner } from '@/components/alerts/alert-banner'
import { getUnacknowledgedAlertsAction } from '../actions'

const DashboardTour = nextDynamic(
  () => import('@/components/onboarding/dashboard-tour').then(mod => ({ default: mod.DashboardTour })),
)

export const dynamic = 'force-dynamic'

/** Default page size for employee list */
const PAGE_SIZE = 25

/** Valid sort values for URL param validation */
const VALID_SORTS = new Set<EmployeeSortOption>([
  'days_remaining_asc', 'days_remaining_desc',
  'name_asc', 'name_desc',
  'days_used_desc', 'days_used_asc',
])

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
 * Supports server-side pagination and sort via URL params.
 */
async function EmployeeComplianceList({
  page,
  search,
  sort,
}: {
  page: number
  search: string
  sort: EmployeeSortOption
}) {
  // Fetch settings and employee data in parallel (M-14 optimisation)
  const [settings, result] = await Promise.all([
    getCompanySettings(),
    getEmployeeComplianceDataPaginated(
      { page, pageSize: PAGE_SIZE, search: search || undefined, sort },
    ),
  ])

  // If company has custom thresholds that differ from defaults, re-fetch with them.
  // Most companies use defaults, so this branch is rarely taken.
  const hasCustomThresholds = settings &&
    (settings.status_green_max !== 60 || settings.status_amber_max !== 75 || settings.status_red_max !== 89)

  const finalResult = hasCustomThresholds
    ? await getEmployeeComplianceDataPaginated(
        { page, pageSize: PAGE_SIZE, search: search || undefined, sort },
        {
          greenMax: settings.status_green_max ?? 60,
          amberMax: settings.status_amber_max ?? 75,
          redMax: settings.status_red_max ?? 89,
        }
      )
    : result

  return (
    <ComplianceTable
      employees={finalResult.employees}
      stats={finalResult.stats}
      pagination={finalResult.pagination}
      initialSearch={search}
      initialSort={sort}
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
  searchParams: Promise<{ page?: string; search?: string; tour?: string; sort?: string }>
}

/**
 * Main dashboard page for Phase 8.
 * Displays employee compliance status with filtering and sorting.
 * Supports server-side pagination via URL params.
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // Layout already validates auth — use cached access to avoid duplicate queries
  const { userId } = await requireCompanyAccessCached()

  // Parse pagination params from URL
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const search = params.search ?? ''
  const sort: EmployeeSortOption = VALID_SORTS.has(params.sort as EmployeeSortOption)
    ? (params.sort as EmployeeSortOption)
    : 'days_remaining_asc'
  const forceTour = params.tour === '1'

  // Cached fetcher — deduplicated within this request
  const tourCompletedAt = await getDashboardTourState(userId)
  const shouldAutoStartTour = !tourCompletedAt
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
      <Suspense key={`${page}-${search}-${sort}`} fallback={<DashboardSkeleton />}>
        <EmployeeComplianceList page={page} search={search} sort={sort} />
      </Suspense>
    </div>
  )
}
