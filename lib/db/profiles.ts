import { createClient } from '@/lib/supabase/server'
import { DatabaseError, NotFoundError } from '@/lib/errors'
import type { Profile, ProfileWithCompany, ProfileUpdate } from '@/types/database'

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
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const supabase = await createClient()

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
 */
export async function getCompanyProfiles(companyId: string): Promise<Profile[]> {
  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching company profiles:', error)
    throw new DatabaseError('Failed to fetch company profiles')
  }

  return profiles ?? []
}
