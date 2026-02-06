import { requireSuperAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTierBadgeClassName, getTierDisplayName } from '@/lib/billing/plans'

export const dynamic = 'force-dynamic'

function FeatureCell({ enabled }: { enabled: boolean | null }) {
  return enabled ? (
    <Check className="h-4 w-4 text-green-600 mx-auto" />
  ) : (
    <X className="h-4 w-4 text-slate-300 mx-auto" />
  )
}

export default async function TiersPage() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  // Fetch all tiers with company counts
  const { data: tiers } = await supabase
    .from('tiers')
    .select('*')
    .order('sort_order')

  // Get company counts per tier
  const { data: entitlements } = await supabase
    .from('company_entitlements')
    .select('tier_slug')

  const tierCounts: Record<string, number> = {}
  entitlements?.forEach(e => {
    const tier = e.tier_slug || 'free'
    tierCounts[tier] = (tierCounts[tier] || 0) + 1
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tiers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Global tier definitions and feature entitlements
        </p>
      </div>

      {/* Tiers Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiers?.map((tier) => (
          <Card key={tier.slug} className={!tier.is_active ? 'opacity-60' : ''}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge className={cn(getTierBadgeClassName(tier.slug), 'hover:opacity-90')}>
                  {getTierDisplayName(tier.slug, tier.display_name)}
                </Badge>
                {!tier.is_active && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <p className="text-3xl font-semibold text-slate-900">
                {tierCounts[tier.slug] || 0}
              </p>
              <p className="text-sm text-slate-500">companies</p>
              <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
                <p>Max {tier.max_employees.toLocaleString()} employees</p>
                <p>Max {tier.max_users} users</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Feature</TableHead>
                  {tiers?.map((tier) => (
                    <TableHead key={tier.slug} className="text-center">
                      <Badge className={cn(getTierBadgeClassName(tier.slug), 'hover:opacity-90')}>
                        {getTierDisplayName(tier.slug, tier.display_name)}
                      </Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Max Employees</TableCell>
                  {tiers?.map((tier) => (
                    <TableCell key={tier.slug} className="text-center tabular-nums">
                      {tier.max_employees >= 999999 ? 'Unlimited' : tier.max_employees.toLocaleString()}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Max Users</TableCell>
                  {tiers?.map((tier) => (
                    <TableCell key={tier.slug} className="text-center tabular-nums">
                      {tier.max_users >= 999999 ? 'Unlimited' : tier.max_users}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">CSV Export</TableCell>
                  {tiers?.map((tier) => (
                    <TableCell key={tier.slug}>
                      <FeatureCell enabled={tier.can_export_csv} />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">PDF Export</TableCell>
                  {tiers?.map((tier) => (
                    <TableCell key={tier.slug}>
                      <FeatureCell enabled={tier.can_export_pdf} />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Trip Forecast</TableCell>
                  {tiers?.map((tier) => (
                    <TableCell key={tier.slug}>
                      <FeatureCell enabled={tier.can_forecast} />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Calendar View</TableCell>
                  {tiers?.map((tier) => (
                    <TableCell key={tier.slug}>
                      <FeatureCell enabled={tier.can_calendar} />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Bulk Import</TableCell>
                  {tiers?.map((tier) => (
                    <TableCell key={tier.slug}>
                      <FeatureCell enabled={tier.can_bulk_import} />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">API Access</TableCell>
                  {tiers?.map((tier) => (
                    <TableCell key={tier.slug}>
                      <FeatureCell enabled={tier.can_api_access} />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">SSO</TableCell>
                  {tiers?.map((tier) => (
                    <TableCell key={tier.slug}>
                      <FeatureCell enabled={tier.can_sso} />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Audit Logs</TableCell>
                  {tiers?.map((tier) => (
                    <TableCell key={tier.slug}>
                      <FeatureCell enabled={tier.can_audit_logs} />
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Price IDs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Monthly Price ID</TableHead>
                <TableHead>Annual Price ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers?.map((tier) => (
                <TableRow key={tier.slug}>
                  <TableCell>
                    <Badge className={cn(getTierBadgeClassName(tier.slug), 'hover:opacity-90')}>
                      {getTierDisplayName(tier.slug, tier.display_name)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {tier.stripe_price_id_monthly || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {tier.stripe_price_id_annual || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-sm text-slate-500">
        Note: Tier definitions are managed via database migrations. To add or modify tiers,
        create a new migration file.
      </p>
    </div>
  )
}
