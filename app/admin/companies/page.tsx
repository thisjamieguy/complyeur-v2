import { requireSuperAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CompaniesTable } from '@/components/admin/companies-table'
import { CompanyFilters } from '@/components/admin/company-filters'

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
  let query = supabase
    .from('companies')
    .select(`
      *,
      company_entitlements(*),
      profiles(count),
      employees(count)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  // Apply search filter
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,slug.ilike.%${params.search}%`)
  }

  const { data: companies, count } = await query

  // Filter by tier and status in memory (since we're joining)
  // In production, you might want to use a database view or function for this
  let filteredCompanies = companies || []

  if (params.tier && params.tier !== 'all') {
    filteredCompanies = filteredCompanies.filter(
      c => c.company_entitlements?.tier_slug === params.tier
    )
  }

  if (params.status && params.status !== 'all') {
    filteredCompanies = filteredCompanies.filter(c => {
      const ent = c.company_entitlements
      if (!ent) return false

      switch (params.status) {
        case 'suspended':
          return ent.is_suspended === true
        case 'trial':
          return ent.is_trial === true && !ent.is_suspended
        case 'active':
          return !ent.is_trial && !ent.is_suspended
        default:
          return true
      }
    })
  }

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
      />
    </div>
  )
}
