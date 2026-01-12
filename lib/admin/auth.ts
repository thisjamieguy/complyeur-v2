import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface AdminProfile {
  is_superadmin: boolean | null
  full_name: string | null
}

/**
 * Checks if the current user is a super admin.
 * If not authenticated, redirects to login.
 * If authenticated but not superadmin, redirects to dashboard.
 *
 * Use this at the top of admin pages/layouts to protect them.
 */
export async function requireSuperAdmin() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?redirect=/admin')
  }

  // Check superadmin status
  // Note: is_superadmin column is added by the admin panel migration
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_superadmin, full_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_superadmin) {
    // Silent redirect - don't reveal admin panel exists
    redirect('/dashboard')
  }

  return { user, profile }
}

/**
 * Checks if the current user is a super admin.
 * Returns true/false, does not redirect.
 *
 * Use this for conditional rendering or checks.
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', user.id)
      .single()

    return profile?.is_superadmin === true
  } catch {
    return false
  }
}

/**
 * Gets the current admin user info.
 * Returns null if not authenticated or not a superadmin.
 */
export async function getAdminUser() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, is_superadmin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_superadmin) return null

    return {
      id: user.id,
      email: user.email,
      fullName: profile.full_name,
    }
  } catch {
    return null
  }
}
