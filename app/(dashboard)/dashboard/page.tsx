import { Suspense } from 'react'
import nextDynamic from 'next/dynamic'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'
import { createClient } from '@/lib/supabase/server'
import { getCompanyEntitlements } from '@/lib/billing/entitlements'
import { getEmployeeComplianceDataPaginated, getComplianceBriefing, type EmployeeSortOption } from '@/lib/data'
import { getEmployeesForSelect } from '@/lib/db'
import { getCompanySettings } from '@/lib/actions/settings'
import { ComplianceTable } from '@/components/dashboard/compliance-table'
import { ComplianceBriefing, ComplianceBriefingSkeleton } from '@/components/dashboard/compliance-briefing'
import { DashboardSkeleton } from '@/components/dashboard/loading-skeleton'
import { TrialBanner } from '@/components/dashboard/trial-banner'
import { FirstRunChecklist } from '@/components/dashboard/first-run-checklist'
import { UnifiedAddEmployeeDialog } from '@/components/employees/unified-add-employee-dialog'
import { JobCreateDialog } from '@/components/jobs/job-create-dialog'
import { AlertBanner } from '@/components/alerts/alert-banner'
import { isSavedJobsEnabled } from '@/lib/features'
import { getUnacknowledgedAlertsAction } from '../actions'

const DashboardTour = nextDynamic(
  () => import('@/components/onboarding/dashboard-tour').then(mod => ({ default: mod.DashboardTour })),
)

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard',
  description: 'Employee Schengen 90/180-day compliance overview',
}

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
  status,
}: {
  page: number
  search: string
  sort: EmployeeSortOption
  status: string
}) {
  let finalResult: Awaited<ReturnType<typeof getEmployeeComplianceDataPaginated>>

  try {
    // Fetch settings and employee data in parallel (M-14 optimisation)
    const [settings, result] = await Promise.all([
      getCompanySettings(),
      getEmployeeComplianceDataPaginated(
        { page, pageSize: PAGE_SIZE, search: search || undefined, sort, status: status || undefined },
      ),
    ])

    // If company has custom thresholds that differ from defaults, re-fetch with them.
    // Most companies use defaults, so this branch is rarely taken.
    const hasCustomThresholds = settings &&
      (settings.status_green_max !== 68 || settings.status_amber_max !== 82 || settings.status_red_max !== 90)

    finalResult = hasCustomThresholds
      ? await getEmployeeComplianceDataPaginated(
          { page, pageSize: PAGE_SIZE, search: search || undefined, sort, status: status || undefined },
          {
            greenMax: settings.status_green_max ?? 68,
            amberMax: settings.status_amber_max ?? 82,
            redMax: settings.status_red_max ?? 90,
          }
        )
      : result

  } catch (error) {
    console.error('[EmployeeComplianceList] Failed to load employee data:', error)
    throw error // Re-throw to show error boundary, but now with logging
  }

  return (
    <ComplianceTable
      employees={finalResult.employees}
      hasEmployees={finalResult.hasEmployees}
      stats={finalResult.stats}
      pagination={finalResult.pagination}
      initialSearch={search}
      initialSort={sort}
    />
  )
}

/**
 * Server component that fetches and displays the compliance briefing.
 */
async function BriefingSection() {
  let briefing: Awaited<ReturnType<typeof getComplianceBriefing>> | null = null

  try {
    briefing = await getComplianceBriefing()
  } catch (error) {
    console.error('[BriefingSection] Failed to load compliance briefing:', error)
    // Don't break the dashboard if briefing fails
    return null
  }

  return <ComplianceBriefing briefing={briefing} />
}

/**
 * Server component to fetch alerts
 */
async function AlertSection() {
  let alerts: Awaited<ReturnType<typeof getUnacknowledgedAlertsAction>>

  try {
    alerts = await getUnacknowledgedAlertsAction()
  } catch {
    // Silently fail for alerts - don't break the dashboard
    return null
  }

  return <AlertBanner alerts={alerts} />
}

interface DashboardPageProps {
  searchParams: Promise<{ page?: string; search?: string; tour?: string; sort?: string; status?: string }>
}

/**
 * Main dashboard page for Phase 8.
 * Displays employee compliance status with filtering and sorting.
 * Supports server-side pagination via URL params.
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // Layout already validates auth — use cached access to avoid duplicate queries
  const { companyId } = await requireCompanyAccessCached()

  // Parse pagination params from URL
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const search = params.search ?? ''
  const sort: EmployeeSortOption = VALID_SORTS.has(params.sort as EmployeeSortOption)
    ? (params.sort as EmployeeSortOption)
    : 'days_remaining_asc'
  const status = params.status ?? ''
  const forceTour = params.tour === '1'
  const savedJobsEnabled = isSavedJobsEnabled()

  // Cached fetcher — deduplicated within this request
  const supabase = await createClient()
  const [employeesForSelect, entitlements, teamCountResult] = await Promise.all([
    getEmployeesForSelect(),
    getCompanyEntitlements(),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId),
  ])
  const isPaidCustomer = entitlements?.subscription_status === 'active' && entitlements?.is_trial !== true
  const teamMemberCount = teamCountResult.count ?? 1
  const hasEmployees = employeesForSelect.length > 0

  return (
    <div className="space-y-6">
      {forceTour && <DashboardTour startOpen={true} />}

      <TrialBanner
        tierSlug={entitlements?.tier_slug ?? null}
        isTrial={entitlements?.is_trial ?? false}
        trialEndsAt={entitlements?.trial_ends_at ?? null}
        subscriptionStatus={entitlements?.subscription_status ?? null}
      />

      <FirstRunChecklist
        hasEmployees={hasEmployees}
        teamMemberCount={teamMemberCount}
        isPaidCustomer={isPaidCustomer}
      />

      {/* Alert banner - shows unacknowledged alerts */}
      <Suspense fallback={<AlertSkeleton />}>
        <AlertSection />
      </Suspense>

      {/* Compliance briefing panel */}
      <Suspense fallback={<ComplianceBriefingSkeleton />}>
        <BriefingSection />
      </Suspense>

      {/* Page header */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div data-tour-id="tour-dashboard-home">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Employee Compliance
          </h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            Track Schengen 90/180-day compliance status
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {savedJobsEnabled && <JobCreateDialog employees={employeesForSelect} />}
          <UnifiedAddEmployeeDialog source="dashboard_header" />
        </div>
      </div>

      {/* Main content with suspense for streaming */}
      <Suspense key={`${page}-${search}-${sort}-${status}`} fallback={<DashboardSkeleton />}>
        <EmployeeComplianceList page={page} search={search} sort={sort} status={status} />
      </Suspense>
    </div>
  )
}
