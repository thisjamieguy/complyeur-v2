import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AppError, AuthError, DatabaseError } from '@/lib/errors'

export type CompanyAccessContext = {
  userId: string
  companyId: string
  role: string | null
  isSuperadmin: boolean
}

type CompanyAccessProfile = {
  company_id: string | null
  role: string | null
  is_superadmin: boolean | null
  status?: string | null
  is_active?: boolean | null
  disabled_at?: string | null
}

interface CompanyAccessOptions {
  allowSuperadmin?: boolean
}

export async function requireCompanyAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetCompanyId?: string,
  options: CompanyAccessOptions = {}
): Promise<CompanyAccessContext> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AuthError('Unauthorized')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new DatabaseError('User profile not found')
  }

  const accessProfile = profile as CompanyAccessProfile

  if (
    (Object.prototype.hasOwnProperty.call(accessProfile, 'status') && accessProfile.status !== 'active') ||
    (Object.prototype.hasOwnProperty.call(accessProfile, 'is_active') && accessProfile.is_active !== true) ||
    (Object.prototype.hasOwnProperty.call(accessProfile, 'disabled_at') && accessProfile.disabled_at !== null)
  ) {
    throw new AppError('User account is inactive', 'AUTH_ERROR', 403)
  }

  const isSuperadmin = profile.is_superadmin === true

  // Superadmins with explicit allowSuperadmin permission bypass all company checks.
  // This must be checked before the company_id guards so that superadmins who have
  // their own company (created via normal signup) can still administer other companies.
  if (isSuperadmin && options.allowSuperadmin) {
    return {
      userId: user.id,
      companyId: targetCompanyId ?? profile.company_id ?? '',
      role: profile.role ?? null,
      isSuperadmin,
    }
  }

  if (!profile.company_id) {
    throw new DatabaseError('User has no associated company')
  }

  if (targetCompanyId && profile.company_id !== targetCompanyId) {
    throw new AuthError('Forbidden')
  }

  return {
    userId: user.id,
    companyId: profile.company_id,
    role: profile.role ?? null,
    isSuperadmin,
  }
}

/**
 * Cached version of requireCompanyAccess for server components and server actions.
 * Creates its own Supabase client so React.cache() can deduplicate within a request.
 * Use this when you don't need the supabase client for subsequent queries in the same scope.
 */
export const requireCompanyAccessCached = cache(
  async (
    targetCompanyId?: string,
    options: CompanyAccessOptions = {}
  ): Promise<CompanyAccessContext> => {
    const supabase = await createClient()
    return requireCompanyAccess(supabase, targetCompanyId, options)
  }
)
