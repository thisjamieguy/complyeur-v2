import { requireSuperAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/admin/audit'
import { notFound } from 'next/navigation'
import { CompanyHeader } from '@/components/admin/company-header'
import { CompanyTabs } from '@/components/admin/company-tabs'

export const dynamic = 'force-dynamic'

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { user } = await requireSuperAdmin()
  const supabase = createAdminClient()
  const { id } = await params

  // Parallelize all independent database queries for ~4x faster page load
  const [companyResult, allTiersResult, activityResult] = await Promise.all([
    // Fetch company with all related data
    supabase
      .from('companies')
      .select(`
        *,
        company_entitlements(*),
        company_settings(*),
        profiles(*),
        employees(count),
        company_notes(
          *,
          profiles!admin_user_id(full_name)
        )
      `)
      .eq('id', id)
      .single(),

    // Fetch all tiers (we'll extract the specific one from this list)
    supabase
      .from('tiers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),

    // Fetch recent activity for this company
    supabase
      .from('admin_audit_log')
      .select('*, profiles!admin_user_id(full_name)')
      .eq('target_company_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const { data: company, error } = companyResult

  if (error || !company) {
    notFound()
  }

  // Extract tier details from allTiers (avoids extra DB query)
  const tierSlug = company.company_entitlements?.tier_slug || 'free'
  const tier = allTiersResult.data?.find((t) => t.slug === tierSlug) || null
  const tiers = allTiersResult.data || []
  const activity = activityResult.data || []

  // Log the view action (don't await, fire and forget)
  logAdminAction({
    adminUserId: user.id,
    targetCompanyId: id,
    action: ADMIN_ACTIONS.COMPANY_VIEWED,
  })

  // Sort notes by pinned first, then by created_at
  interface CompanyNote {
    is_pinned: boolean | null
    created_at: string
  }
  const sortedNotes = (company.company_notes || []).sort((a: CompanyNote, b: CompanyNote) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="space-y-6">
      <CompanyHeader company={company} tier={tier} />

      <CompanyTabs
        company={{
          ...company,
          company_notes: sortedNotes,
        }}
        tier={tier}
        tiers={tiers || []}
        activity={activity || []}
      />
    </div>
  )
}
