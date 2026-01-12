import { formatDistanceToNow } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Building2,
  Clock,
  FileEdit,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  type LucideIcon,
} from 'lucide-react'

interface ActivityItem {
  id: string
  action: string
  created_at: string
  details?: Record<string, unknown>
  target_company_id?: string | null
  profiles?: {
    full_name: string | null
  } | null
}

interface RecentActivityProps {
  activities: ActivityItem[]
}

const actionConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  'company.suspended': { icon: XCircle, color: 'text-red-500', label: 'Suspended company' },
  'company.restored': { icon: CheckCircle, color: 'text-green-500', label: 'Restored company' },
  'company.viewed': { icon: Building2, color: 'text-slate-500', label: 'Viewed company' },
  'entitlement.updated': { icon: FileEdit, color: 'text-blue-500', label: 'Updated entitlements' },
  'tier.changed': { icon: FileEdit, color: 'text-purple-500', label: 'Changed tier' },
  'trial.extended': { icon: Clock, color: 'text-amber-500', label: 'Extended trial' },
  'trial.converted': { icon: CheckCircle, color: 'text-green-500', label: 'Converted trial' },
  'note.created': { icon: MessageSquare, color: 'text-blue-500', label: 'Added note' },
  'note.updated': { icon: MessageSquare, color: 'text-slate-500', label: 'Updated note' },
  'note.deleted': { icon: MessageSquare, color: 'text-red-500', label: 'Deleted note' },
  'user.password_reset': { icon: User, color: 'text-amber-500', label: 'Reset password' },
}

function getActionDisplay(action: string) {
  return actionConfig[action] || {
    icon: AlertTriangle,
    color: 'text-slate-500',
    label: action.replace(/\./g, ' ').replace(/^./, s => s.toUpperCase()),
  }
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No recent activity</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {activities.map((activity) => {
            const { icon: Icon, color, label } = getActionDisplay(activity.action)

            return (
              <li key={activity.id} className="flex items-start gap-3">
                <div className={cn('mt-0.5 rounded-full bg-slate-100 p-1.5', color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">
                      {activity.profiles?.full_name || 'Admin'}
                    </span>
                    {' '}{label.toLowerCase()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
