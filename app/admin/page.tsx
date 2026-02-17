import Link from 'next/link'
import { formatDistanceToNow, parseISO, addDays } from 'date-fns'
import { requireSuperAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MetricCard } from '@/components/admin/metric-card'
import { RecentActivity } from '@/components/admin/recent-activity'
import { TrialsExpiringSoon } from '@/components/admin/trials-expiring-soon'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  try {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  // Fetch dashboard metrics in parallel
  const [
    companiesResult,
    usersResult,
    employeesResult,
    activeTrialsResult,
    recentSignupsResult,
    recentActivityResult,
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('employees').select('*', { count: 'exact', head: true }),
    supabase
      .from('company_entitlements')
      .select('*, companies(*)')
      .eq('is_trial', true)
      .gte('trial_ends_at', new Date().toISOString())
      .order('trial_ends_at', { ascending: true })
      .limit(10),
    supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('admin_audit_log')
      .select('*, profiles!admin_user_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const totalCompanies = companiesResult.count || 0
  const totalUsers = usersResult.count || 0
  const totalEmployees = employeesResult.count || 0
  const activeTrials = activeTrialsResult.data || []
  const recentSignups = recentSignupsResult.data || []
  const recentActivity = recentActivityResult.data || []

  // Calculate trials expiring in 7 days
  const sevenDaysFromNow = addDays(new Date(), 7)
  const trialsExpiringSoon = activeTrials.filter(t =>
    parseISO(t.trial_ends_at) <= sevenDaysFromNow
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Business overview and key metrics
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p><strong>Active:</strong> Paying company in good standing.</p>
          <p><strong>Trial:</strong> Company is within trial period.</p>
          <p><strong>Suspended:</strong> Access is restricted pending action.</p>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Companies"
          value={totalCompanies}
          icon="building"
        />
        <MetricCard
          title="Total Users"
          value={totalUsers}
          icon="users"
        />
        <MetricCard
          title="Employees Tracked"
          value={totalEmployees}
          icon="user-check"
        />
        <MetricCard
          title="Active Trials"
          value={activeTrials.length}
          icon="clock"
          alert={trialsExpiringSoon.length > 0}
          alertText={`${trialsExpiringSoon.length} expiring soon`}
        />
      </div>

      {/* Alerts */}
      {trialsExpiringSoon.length > 0 && (
        <TrialsExpiringSoon trials={trialsExpiringSoon} />
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Signups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSignups.length === 0 ? (
              <p className="text-sm text-slate-500">No recent signups</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentSignups.map((company) => (
                  <li key={company.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/admin/companies/${company.id}`}
                      className="flex items-center justify-between hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-900">
                        {company.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(parseISO(company.created_at!), { addSuffix: true })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivity activities={recentActivity} />
      </div>
    </div>
  )
  } catch (err) {
    console.error('[ADMIN PAGE ERROR]', err)
    throw err
  }
}
