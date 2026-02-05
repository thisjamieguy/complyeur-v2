import { Users, CheckCircle, AlertTriangle, XCircle, Ban, ShieldCheck } from 'lucide-react'
import type { ComplianceStats } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface DashboardStatsProps {
  stats: ComplianceStats
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  iconBgColor: string
  iconColor: string
}

function StatCard({ title, value, icon: Icon, iconBgColor, iconColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={cn('p-2.5 sm:p-3 rounded-lg', iconBgColor)}>
          <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', iconColor)} />
        </div>
      </div>
    </div>
  )
}

/**
 * Dashboard summary statistics cards showing employee compliance breakdown.
 * Displays: Total employees, Compliant (green), At Risk (amber), Non-Compliant (red), Breach (black)
 */
export function DashboardStats({ stats }: DashboardStatsProps) {
  const hasExempt = stats.exempt > 0

  return (
    <div className={cn(
      'grid grid-cols-1 sm:grid-cols-2 gap-4',
      hasExempt ? 'lg:grid-cols-6' : 'lg:grid-cols-5'
    )}>
      <StatCard
        title="Total Employees"
        value={stats.total}
        icon={Users}
        iconBgColor="bg-slate-100"
        iconColor="text-slate-600"
      />
      <StatCard
        title="Compliant"
        value={stats.compliant}
        icon={CheckCircle}
        iconBgColor="bg-green-50"
        iconColor="text-green-600"
      />
      <StatCard
        title="At Risk"
        value={stats.at_risk}
        icon={AlertTriangle}
        iconBgColor="bg-amber-50"
        iconColor="text-amber-600"
      />
      <StatCard
        title="Non-Compliant"
        value={stats.non_compliant}
        icon={XCircle}
        iconBgColor="bg-red-50"
        iconColor="text-red-600"
      />
      <StatCard
        title="Breach"
        value={stats.breach}
        icon={Ban}
        iconBgColor="bg-slate-900"
        iconColor="text-white"
      />
      {hasExempt && (
        <StatCard
          title="Exempt"
          value={stats.exempt}
          icon={ShieldCheck}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
      )}
    </div>
  )
}
