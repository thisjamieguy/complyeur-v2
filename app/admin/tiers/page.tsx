import { requireSuperAdmin } from '@/lib/admin/auth'
import type { TierRow } from '@/lib/admin/tier-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { TiersManagement } from '@/components/admin/tiers/tiers-management'

export const dynamic = 'force-dynamic'

export default async function TiersPage() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const { data: tiers } = await supabase.from('tiers').select('*').order('sort_order')

  const { data: entitlements } = await supabase.from('company_entitlements').select('tier_slug')

  const companyCountBySlug: Record<string, number> = {}
  for (const e of entitlements ?? []) {
    const slug = e.tier_slug
    if (!slug) continue
    companyCountBySlug[slug] = (companyCountBySlug[slug] ?? 0) + 1
  }

  const list = (tiers ?? []) as TierRow[]
  const activeTierCount = list.filter((t) => t.is_active === true).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tiers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Global tier definitions are the defaults companies inherit unless individually overridden in
          company entitlements.
        </p>
      </div>

      <TiersManagement
        tiers={list}
        companyCountBySlug={companyCountBySlug}
        activeTierCount={activeTierCount}
      />
    </div>
  )
}
