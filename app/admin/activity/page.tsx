import Link from 'next/link'
import { formatDistanceToNow, parseISO, format } from 'date-fns'
import { requireSuperAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Eye,
  type LucideIcon,
} from 'lucide-react'

const actionConfig: Record<string, { icon: LucideIcon; color: string; label: string; bgColor: string }> = {
  'company.suspended': { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50', label: 'Suspended company' },
  'company.restored': { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50', label: 'Restored company' },
  'company.viewed': { icon: Eye, color: 'text-slate-400', bgColor: 'bg-slate-50', label: 'Viewed company' },
  'entitlement.updated': { icon: FileEdit, color: 'text-blue-500', bgColor: 'bg-blue-50', label: 'Updated entitlements' },
  'tier.changed': { icon: FileEdit, color: 'text-purple-500', bgColor: 'bg-purple-50', label: 'Changed tier' },
  'trial.extended': { icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-50', label: 'Extended trial' },
  'trial.converted': { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50', label: 'Converted trial' },
  'note.created': { icon: MessageSquare, color: 'text-blue-500', bgColor: 'bg-blue-50', label: 'Added note' },
  'note.updated': { icon: MessageSquare, color: 'text-slate-500', bgColor: 'bg-slate-50', label: 'Updated note' },
  'note.deleted': { icon: MessageSquare, color: 'text-red-500', bgColor: 'bg-red-50', label: 'Deleted note' },
  'note.pinned': { icon: MessageSquare, color: 'text-amber-500', bgColor: 'bg-amber-50', label: 'Pinned note' },
  'note.unpinned': { icon: MessageSquare, color: 'text-slate-500', bgColor: 'bg-slate-50', label: 'Unpinned note' },
  'user.password_reset': { icon: User, color: 'text-amber-500', bgColor: 'bg-amber-50', label: 'Reset user password' },
}

function getActionDisplay(action: string) {
  return actionConfig[action] || {
    icon: AlertTriangle,
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    label: action.replace(/\./g, ' ').replace(/^./, s => s.toUpperCase()),
  }
}

interface SearchParams {
  page?: string
  action?: string
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireSuperAdmin()
  const supabase = createAdminClient()
  const params = await searchParams

  const page = parseInt(params.page || '1')
  const perPage = 50
  const offset = (page - 1) * perPage

  // Build query
  let query = supabase
    .from('admin_audit_log')
    .select(`
      *,
      profiles!admin_user_id(full_name),
      companies:target_company_id(id, name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  // Filter by action type if specified
  if (params.action) {
    query = query.eq('action', params.action)
  }

  const { data: activities, count } = await query

  const totalPages = Math.ceil((count || 0) / perPage)

  // Group activities by date
  const groupedActivities: Record<string, typeof activities> = {}
  activities?.forEach(activity => {
    const date = format(parseISO(activity.created_at), 'yyyy-MM-dd')
    if (!groupedActivities[date]) {
      groupedActivities[date] = []
    }
    groupedActivities[date]!.push(activity)
  })

  const sortedDates = Object.keys(groupedActivities).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Activity Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          All admin actions across the platform ({count} total)
        </p>
      </div>

      {activities?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">No activity recorded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date}>
              <h3 className="text-sm font-medium text-slate-500 mb-4">
                {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
              </h3>
              <Card>
                <CardContent className="p-0 divide-y divide-slate-100">
                  {groupedActivities[date]?.map((activity) => {
                    const { icon: Icon, color, bgColor, label } = getActionDisplay(activity.action)
                    const company = activity.companies as { id: string; name: string } | null

                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className={cn('rounded-full p-2', bgColor)}>
                          <Icon className={cn('h-4 w-4', color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900">
                            <span className="font-medium">
                              {activity.profiles?.full_name || 'Admin'}
                            </span>
                            {' '}{label.toLowerCase()}
                            {company && (
                              <>
                                {' '}for{' '}
                                <Link
                                  href={`/admin/companies/${company.id}`}
                                  className="font-medium text-slate-900 hover:underline"
                                >
                                  {company.name}
                                </Link>
                              </>
                            )}
                          </p>
                          {activity.details && Object.keys(activity.details).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                                View details
                              </summary>
                              <pre className="mt-1 text-xs text-slate-500 bg-slate-50 rounded p-2 overflow-x-auto">
                                {JSON.stringify(activity.details, null, 2)}
                              </pre>
                            </details>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {format(parseISO(activity.created_at), 'h:mm a')}
                            {activity.ip_address && (
                              <> &middot; {activity.ip_address}</>
                            )}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {activity.action.split('.')[0]}
                        </Badge>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/activity?page=${page - 1}`}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/activity?page=${page + 1}`}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
