import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, UserCheck, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTierBadgeClassName, getTierDisplayName } from '@/lib/billing/plans'

interface CompanyEntitlement {
  tier_slug: string | null
  is_trial: boolean | null
  trial_ends_at: string | null
  is_suspended: boolean | null
  suspended_reason: string | null
}

interface Tier {
  slug: string
  display_name: string
}

interface Company {
  id: string
  name: string
  slug: string
  created_at: string | null
  company_entitlements: CompanyEntitlement | null
  profiles: unknown[] | null
  employees: unknown[] | null
}

interface CompanyHeaderProps {
  company: Company
  tier: Tier | null
}

function getStatusBadge(entitlement: CompanyEntitlement | null) {
  if (!entitlement) {
    return <Badge variant="secondary">No Data</Badge>
  }

  if (entitlement.is_suspended) {
    return <Badge variant="destructive">Suspended</Badge>
  }

  if (entitlement.is_trial) {
    const trialEnds = entitlement.trial_ends_at
      ? parseISO(entitlement.trial_ends_at)
      : null
    const isExpired = trialEnds && trialEnds < new Date()

    if (isExpired) {
      return <Badge variant="destructive">Trial Expired</Badge>
    }

    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        Trial
      </Badge>
    )
  }

  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      Active
    </Badge>
  )
}

export function CompanyHeader({ company, tier }: CompanyHeaderProps) {
  const entitlement = company.company_entitlements
  const userCount = Array.isArray(company.profiles) ? company.profiles.length : 0
  const employeeCount = Array.isArray(company.employees) ? company.employees.length : 0
  const tierSlug = tier?.slug || entitlement?.tier_slug || 'free'
  const tierDisplayName = getTierDisplayName(tierSlug, tier?.display_name)

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Link href="/admin/companies">
        <Button variant="ghost" size="sm" className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Companies
        </Button>
      </Link>

      {/* Company info card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            {/* Company name and badges */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">
                {company.name}
              </h1>
              {getStatusBadge(entitlement)}
              {(tier || entitlement?.tier_slug) && (
                <Badge
                  className={cn(getTierBadgeClassName(tierSlug), 'hover:opacity-90')}
                >
                  {tierDisplayName}
                </Badge>
              )}
            </div>

            {/* Slug */}
            <p className="text-sm text-slate-500">
              Slug: <code className="rounded bg-slate-100 px-1.5 py-0.5">{company.slug}</code>
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="h-4 w-4" />
                <span><strong>{userCount}</strong> users</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <UserCheck className="h-4 w-4" />
                <span><strong>{employeeCount}</strong> employees tracked</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-4 w-4" />
                <span>
                  Created{' '}
                  {company.created_at
                    ? format(parseISO(company.created_at), 'MMM d, yyyy')
                    : 'Unknown'}
                </span>
              </div>
            </div>

            {/* Trial info */}
            {entitlement?.is_trial && entitlement.trial_ends_at && (
              <p className="text-sm text-blue-600">
                Trial ends {format(parseISO(entitlement.trial_ends_at), 'MMM d, yyyy')}
              </p>
            )}

            {/* Suspended info */}
            {entitlement?.is_suspended && entitlement.suspended_reason && (
              <p className="text-sm text-red-600">
                Suspension reason: {entitlement.suspended_reason}
              </p>
            )}
          </div>

          {/* Company ID */}
          <div className="text-right">
            <p className="text-xs text-slate-400">Company ID</p>
            <code className="text-xs text-slate-500 break-all">{company.id}</code>
          </div>
        </div>
      </div>
    </div>
  )
}
