import { format, subDays } from 'date-fns'
import Link from 'next/link'
import { requireSuperAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MetricCard } from '@/components/admin/metric-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type DailyPoint = {
  dateKey: string
  label: string
  companies: number
  users: number
  trips: number
}

function toDateKey(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function buildDailySeries(days = 7): DailyPoint[] {
  return Array.from({ length: days }, (_, index) => {
    const date = subDays(new Date(), days - 1 - index)
    const dateKey = format(date, 'yyyy-MM-dd')
    return {
      dateKey,
      label: format(date, 'EEE d MMM'),
      companies: 0,
      users: 0,
      trips: 0,
    }
  })
}

interface MetricsSearchParams {
  period?: string
}

function getPeriod(value: string | undefined): 7 | 30 {
  return value === '30' ? 30 : 7
}

export default async function AdminMetricsPage({
  searchParams,
}: {
  searchParams: Promise<MetricsSearchParams>
}) {
  await requireSuperAdmin()
  const supabase = createAdminClient()
  const params = await searchParams
  const period = getPeriod(params.period)

  const fromDate = subDays(new Date(), period - 1)
  const fromDateIso = fromDate.toISOString()
  const nowIso = new Date().toISOString()

  const [
    totalCompaniesResult,
    activeCompaniesResult,
    totalUsersResult,
    totalEmployeesResult,
    totalTripsResult,
    activeTrialsResult,
    suspendedCompaniesResult,
    calendarEnabledResult,
    forecastEnabledResult,
    recentCompaniesResult,
    recentUsersResult,
    recentTripsResult,
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('employees').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('trips').select('*', { count: 'exact', head: true }).eq('ghosted', false),
    supabase
      .from('company_entitlements')
      .select('*', { count: 'exact', head: true })
      .eq('is_trial', true)
      .gte('trial_ends_at', nowIso),
    supabase
      .from('company_entitlements')
      .select('*', { count: 'exact', head: true })
      .eq('is_suspended', true),
    supabase
      .from('company_entitlements')
      .select('*', { count: 'exact', head: true })
      .eq('can_calendar', true),
    supabase
      .from('company_entitlements')
      .select('*', { count: 'exact', head: true })
      .eq('can_forecast', true),
    supabase.from('companies').select('created_at').gte('created_at', fromDateIso),
    supabase.from('profiles').select('created_at').gte('created_at', fromDateIso),
    supabase.from('trips').select('created_at').gte('created_at', fromDateIso),
  ])

  const metrics = {
    totalCompanies: totalCompaniesResult.count ?? 0,
    activeCompanies: activeCompaniesResult.count ?? 0,
    totalUsers: totalUsersResult.count ?? 0,
    totalEmployees: totalEmployeesResult.count ?? 0,
    totalTrips: totalTripsResult.count ?? 0,
    activeTrials: activeTrialsResult.count ?? 0,
    suspendedCompanies: suspendedCompaniesResult.count ?? 0,
    calendarEnabled: calendarEnabledResult.count ?? 0,
    forecastEnabled: forecastEnabledResult.count ?? 0,
  }

  const dailySeries = buildDailySeries(period)
  const seriesByDate = new Map(dailySeries.map((entry) => [entry.dateKey, entry]))

  for (const row of recentCompaniesResult.data ?? []) {
    const key = toDateKey(row.created_at)
    if (!key) continue
    const point = seriesByDate.get(key)
    if (point) point.companies += 1
  }

  for (const row of recentUsersResult.data ?? []) {
    const key = toDateKey(row.created_at)
    if (!key) continue
    const point = seriesByDate.get(key)
    if (point) point.users += 1
  }

  for (const row of recentTripsResult.data ?? []) {
    const key = toDateKey(row.created_at)
    if (!key) continue
    const point = seriesByDate.get(key)
    if (point) point.trips += 1
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Metrics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lightweight internal snapshot of product and usage health.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Companies" value={metrics.totalCompanies} icon="building" />
        <MetricCard title="Active Companies" value={metrics.activeCompanies} icon="building" />
        <MetricCard title="Total Users" value={metrics.totalUsers} icon="users" />
        <MetricCard title="Total Employees" value={metrics.totalEmployees} icon="user-check" />
        <MetricCard title="Total Trips" value={metrics.totalTrips} icon="calendar" />
        <MetricCard title="Active Trials" value={metrics.activeTrials} icon="clock" />
        <MetricCard title="Calendar Enabled" value={metrics.calendarEnabled} icon="calendar" />
        <MetricCard title="Forecast Enabled" value={metrics.forecastEnabled} icon="trending" />
        <MetricCard
          title="Suspended Companies"
          value={metrics.suspendedCompanies}
          icon="alert"
          alert={metrics.suspendedCompanies > 0}
          alertText={metrics.suspendedCompanies > 0 ? 'Needs attention' : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">{period}-Day Activity Snapshot</CardTitle>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <Link
                href="/admin/metrics?period=7"
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  period === 7
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                Last 7 days
              </Link>
              <Link
                href="/admin/metrics?period=30"
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  period === 30
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                Last 30 days
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">New Companies</TableHead>
                <TableHead className="text-right">New Users</TableHead>
                <TableHead className="text-right">New Trips</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailySeries.map((day) => (
                <TableRow key={day.dateKey}>
                  <TableCell className="font-medium">{day.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{day.companies}</TableCell>
                  <TableCell className="text-right tabular-nums">{day.users}</TableCell>
                  <TableCell className="text-right tabular-nums">{day.trips}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-1">
          <p>This page is intentionally simple and stable: server-rendered counts + 7-day trend rows.</p>
          <p>For traffic sources, funnels, attribution, and campaign analytics, continue using GA4.</p>
        </CardContent>
      </Card>
    </div>
  )
}
