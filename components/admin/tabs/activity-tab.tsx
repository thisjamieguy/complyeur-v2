import { formatDistanceToNow, parseISO } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
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
  details: Record<string, unknown> | null
  profiles: { full_name: string | null } | null
}

interface ActivityTabProps {
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
  'note.pinned': { icon: MessageSquare, color: 'text-amber-500', label: 'Pinned note' },
  'note.unpinned': { icon: MessageSquare, color: 'text-slate-500', label: 'Unpinned note' },
  'user.password_reset': { icon: User, color: 'text-amber-500', label: 'Reset user password' },
}

function getActionDisplay(action: string) {
  return actionConfig[action] || {
    icon: AlertTriangle,
    color: 'text-slate-500',
    label: action.replace(/\./g, ' ').replace(/^./, s => s.toUpperCase()),
  }
}

export function ActivityTab({ activities }: ActivityTabProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">No activity recorded for this company</p>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <ul className="space-y-4">
          {activities.map((activity) => {
            const { icon: Icon, color, label } = getActionDisplay(activity.action)

            return (
              <li key={activity.id} className="flex items-start gap-4">
                <div className={cn('mt-0.5 rounded-full bg-slate-100 p-2', color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">
                      {activity.profiles?.full_name || 'Admin'}
                    </span>
                    {' '}{label.toLowerCase()}
                  </p>
                  {activity.details && Object.keys(activity.details).length > 0 && (
                    <div className="mt-1 text-xs text-slate-500 bg-slate-50 rounded p-2">
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(activity.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
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
