import { Card, CardContent } from '@/components/ui/card'
import {
  Building2,
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  DollarSign,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap: Record<string, LucideIcon> = {
  building: Building2,
  users: Users,
  'user-check': UserCheck,
  clock: Clock,
  alert: AlertTriangle,
  trending: TrendingUp,
  calendar: Calendar,
  dollar: DollarSign,
}

interface MetricCardProps {
  title: string
  value: number | string
  icon: keyof typeof iconMap
  description?: string
  alert?: boolean
  alertText?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function MetricCard({
  title,
  value,
  icon,
  description,
  alert,
  alertText,
  trend,
}: MetricCardProps) {
  const Icon = iconMap[icon] || Building2

  return (
    <Card className={cn(
      'relative overflow-hidden',
      alert && 'ring-2 ring-amber-400'
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-semibold text-slate-900">{value}</p>
            {description && (
              <p className="text-sm text-slate-500">{description}</p>
            )}
            {trend && (
              <p className={cn(
                'text-sm font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}% from last month
              </p>
            )}
          </div>
          <div className={cn(
            'rounded-lg p-3',
            alert ? 'bg-amber-100' : 'bg-slate-100'
          )}>
            <Icon className={cn(
              'h-6 w-6',
              alert ? 'text-amber-600' : 'text-slate-600'
            )} />
          </div>
        </div>
        {alert && alertText && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <span>{alertText}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
