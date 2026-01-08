import { Users, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={cn('p-3 rounded-lg', iconBgColor)}>
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
      </div>
    </div>
  )
}

/**
 * Dashboard summary statistics cards showing employee compliance breakdown.
 * Displays: Total employees, Compliant (green), At Risk (amber), Non-Compliant (red)
 */
export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  )
}
