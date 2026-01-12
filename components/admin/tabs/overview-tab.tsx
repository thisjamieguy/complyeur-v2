import { format, parseISO } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OverviewTabProps {
  company: {
    id: string
    name: string
    slug: string
    created_at: string | null
    company_entitlements: {
      tier_slug: string | null
      is_trial: boolean | null
      trial_ends_at: string | null
      is_suspended: boolean | null
      manual_override: boolean | null
      override_notes: string | null
    } | null
    profiles: Array<{
      id: string
      full_name: string | null
      role: string | null
    }>
    employees: Array<{ count: number }>
  }
  tier: {
    slug: string
    display_name: string
    max_employees: number
    max_users: number
    can_export_csv: boolean | null
    can_export_pdf: boolean | null
    can_forecast: boolean | null
    can_calendar: boolean | null
    can_bulk_import: boolean | null
  } | null
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      {enabled ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-slate-300" />
      )}
    </div>
  )
}

export function OverviewTab({ company, tier }: OverviewTabProps) {
  const entitlement = company.company_entitlements
  const employeeCount = company.employees?.[0]?.count || 0
  const userCount = company.profiles?.length || 0

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Current Tier</span>
            <Badge
              className={cn(
                'hover:opacity-90',
                tier?.slug === 'enterprise' && 'bg-amber-100 text-amber-700',
                tier?.slug === 'professional' && 'bg-purple-100 text-purple-700',
                tier?.slug === 'starter' && 'bg-blue-100 text-blue-700',
                tier?.slug === 'free' && 'bg-slate-100 text-slate-700'
              )}
            >
              {tier?.display_name || 'Free'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Status</span>
            {entitlement?.is_suspended ? (
              <Badge variant="destructive">Suspended</Badge>
            ) : entitlement?.is_trial ? (
              <Badge className="bg-blue-100 text-blue-800">Trial</Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            )}
          </div>

          {entitlement?.is_trial && entitlement.trial_ends_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Trial Ends</span>
              <span className="text-sm font-medium text-slate-900">
                {format(parseISO(entitlement.trial_ends_at), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          {entitlement?.manual_override && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-800">Manual Override Active</p>
              {entitlement.override_notes && (
                <p className="text-sm text-amber-700 mt-1">{entitlement.override_notes}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Users</span>
            <span className="text-sm font-medium text-slate-900">
              {userCount} / {tier?.max_users || '?'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Employees</span>
            <span className="text-sm font-medium text-slate-900">
              {employeeCount} / {tier?.max_employees || '?'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Created</span>
            <span className="text-sm font-medium text-slate-900">
              {company.created_at
                ? format(parseISO(company.created_at), 'MMM d, yyyy')
                : 'Unknown'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
            <FeatureRow label="CSV Export" enabled={tier?.can_export_csv ?? false} />
            <FeatureRow label="PDF Export" enabled={tier?.can_export_pdf ?? false} />
            <FeatureRow label="Trip Forecast" enabled={tier?.can_forecast ?? false} />
            <FeatureRow label="Calendar View" enabled={tier?.can_calendar ?? false} />
            <FeatureRow label="Bulk Import" enabled={tier?.can_bulk_import ?? false} />
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {company.profiles.length === 0 ? (
            <p className="text-sm text-slate-500">No team members</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {company.profiles.slice(0, 5).map((profile) => (
                <div key={profile.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {profile.full_name || 'Unnamed User'}
                    </p>
                    <p className="text-xs text-slate-500">{profile.id}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {profile.role || 'viewer'}
                  </Badge>
                </div>
              ))}
              {company.profiles.length > 5 && (
                <p className="pt-3 text-sm text-slate-500">
                  +{company.profiles.length - 5} more users
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
