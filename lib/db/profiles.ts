import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { DatabaseError, NotFoundError } from '@/lib/errors'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import type { Profile, ProfileWithCompany, ProfileUpdate } from '@/types/database-helpers'

/**
 * Get whether the user has completed the dashboard tour.
 * Wrapped in React.cache() — deduplicated within a single request.
 */
export const getDashboardTourState = cache(async (userId: string): Promise<string | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('dashboard_tour_completed_at')
    .eq('id', userId)
    .single()
  return data?.dashboard_tour_completed_at ?? null
})

/**
 * Get the current user's profile with company data
 */
export async function getCurrentUserProfile(): Promise<ProfileWithCompany | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*, companies(id, name, slug, created_at, updated_at)')
    .eq('id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found
      return null
    }
    console.error('Error fetching profile:', error)
    throw new DatabaseError('Failed to fetch user profile')
  }

  return profile as ProfileWithCompany
}

/**
 * Get a profile by user ID
 * Requires authenticated user in the same company (enforced by RLS + app guard)
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  await requireCompanyAccess(supabase)

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching profile:', error)
    throw new DatabaseError('Failed to fetch profile')
  }

  return profile
}

/**
 * Update a user's profile
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<Profile> {
  const supabase = await createClient()

  const { data: targetProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (fetchError || !targetProfile?.company_id) {
    throw new NotFoundError('Profile not found')
  }

  await requireCompanyAccess(supabase, targetProfile.company_id)

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw new DatabaseError('Failed to update profile')
  }

  if (!profile) {
    throw new NotFoundError('Profile not found')
  }

  return profile
}

/**
 * Get all profiles for a company
 * Verifies the caller belongs to the target company
 */
export async function getCompanyProfiles(companyId: string): Promise<Profile[]> {
  const supabase = await createClient()
  await requireCompanyAccess(supabase, companyId)

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    console.error('Error fetching company profiles:', error)
    throw new DatabaseError('Failed to fetch company profiles')
  }

  return profiles ?? []
}
