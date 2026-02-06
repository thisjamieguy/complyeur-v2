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
  accentBorder?: string
}

function StatCard({ title, value, icon: Icon, iconBgColor, iconColor, accentBorder }: StatCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-xl border border-slate-200 shadow-md p-4 sm:p-6',
      accentBorder && `border-l-4 ${accentBorder}`
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-brand-500">{title}</p>
          <p className="text-3xl font-bold text-brand-900 mt-1">{value}</p>
        </div>
        <div className={cn('p-3 sm:p-3.5 rounded-xl', iconBgColor)}>
          <Icon className={cn('h-6 w-6 sm:h-7 sm:w-7', iconColor)} />
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
        iconBgColor="bg-brand-100"
        iconColor="text-brand-600"
        accentBorder="border-l-brand-500"
      />
      <StatCard
        title="Compliant"
        value={stats.compliant}
        icon={CheckCircle}
        iconBgColor="bg-emerald-100"
        iconColor="text-emerald-700"
        accentBorder="border-l-emerald-500"
      />
      <StatCard
        title="At Risk"
        value={stats.at_risk}
        icon={AlertTriangle}
        iconBgColor="bg-amber-100"
        iconColor="text-amber-700"
        accentBorder="border-l-amber-500"
      />
      <StatCard
        title="Non-Compliant"
        value={stats.non_compliant}
        icon={XCircle}
        iconBgColor="bg-rose-100"
        iconColor="text-rose-700"
        accentBorder="border-l-rose-500"
      />
      <StatCard
        title="Breach"
        value={stats.breach}
        icon={Ban}
        iconBgColor="bg-brand-800"
        iconColor="text-white"
        accentBorder="border-l-brand-800"
      />
      {hasExempt && (
        <StatCard
          title="Exempt"
          value={stats.exempt}
          icon={ShieldCheck}
          iconBgColor="bg-brand-200"
          iconColor="text-brand-700"
          accentBorder="border-l-brand-500"
        />
      )}
    </div>
  )
}
