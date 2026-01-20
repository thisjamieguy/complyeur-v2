import { createClient } from '@/lib/supabase/server'
import { DatabaseError, NotFoundError } from '@/lib/errors'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import type { Company, CompanyUpdate } from '@/types/database-helpers'

/**
 * Get a company by ID
 */
export async function getCompanyById(companyId: string): Promise<Company | null> {
  const supabase = await createClient()

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching company:', error)
    throw new DatabaseError('Failed to fetch company')
  }

  return company
}

/**
 * Get a company by slug
 */
export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const supabase = await createClient()

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching company:', error)
    throw new DatabaseError('Failed to fetch company')
  }

  return company
}

/**
 * Update a company
 */
export async function updateCompany(
  companyId: string,
  updates: CompanyUpdate
): Promise<Company> {
  const supabase = await createClient()

  await requireCompanyAccess(supabase, companyId)

  const { data: company, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', companyId)
    .select()
    .single()

  if (error) {
    console.error('Error updating company:', error)
    throw new DatabaseError('Failed to update company')
  }

  if (!company) {
    throw new NotFoundError('Company not found')
  }

  return company
}

/**
 * Get the current user's company
 */
export async function getCurrentUserCompany(): Promise<Company | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // First get the user's profile to find their company_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return null
  }

  return getCompanyById(profile.company_id)
}
