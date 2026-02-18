import { requireSuperAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CompaniesTable } from '@/components/admin/companies-table'
import { CompanyFilters } from '@/components/admin/company-filters'

export const dynamic = 'force-dynamic'

interface SearchParams {
  search?: string
  tier?: string
  status?: 'all' | 'active' | 'trial' | 'suspended'
  page?: string
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const perPage = 20
  const offset = (page - 1) * perPage

  // Build query for companies with entitlements
  // Use !inner join when filtering by tier/status so DB handles filtering before pagination
  const hasEntitlementFilter = (params.tier && params.tier !== 'all') || (params.status && params.status !== 'all')
  const entitlementJoin = hasEntitlementFilter ? 'company_entitlements!inner(*)' : 'company_entitlements(*)'

  let query = supabase
    .from('companies')
    .select(`
      *,
      ${entitlementJoin},
      profiles(count),
      employees(count)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  // Apply search filter
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,slug.ilike.%${params.search}%`)
  }

  // Apply tier filter at DB level
  if (params.tier && params.tier !== 'all') {
    query = query.eq('company_entitlements.tier_slug', params.tier)
  }

  // Apply status filter at DB level
  if (params.status && params.status !== 'all') {
    switch (params.status) {
      case 'suspended':
        query = query.eq('company_entitlements.is_suspended', true)
        break
      case 'trial':
        query = query.eq('company_entitlements.is_trial', true).eq('company_entitlements.is_suspended', false)
        break
      case 'active':
        query = query.eq('company_entitlements.is_trial', false).eq('company_entitlements.is_suspended', false)
        break
    }
  }

  // Apply pagination after all filters for correct count
  query = query.range(offset, offset + perPage - 1)

  const { data: companies, count } = await query
  const filteredCompanies = companies || []

  // Fetch tiers for filter dropdown
  const { data: tiers } = await supabase
    .from('tiers')
    .select('slug, display_name')
    .eq('is_active', true)
    .order('sort_order')

  const totalPages = Math.ceil((count || 0) / perPage)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Companies</h1>
          <p className="mt-1 text-sm text-slate-500">
            {count} total companies
          </p>
        </div>
      </div>

      <CompanyFilters tiers={tiers || []} />

      <CompaniesTable
        companies={filteredCompanies}
        currentPage={page}
        totalPages={totalPages}
        tiers={tiers || []}
      />
    </div>
  )
}
