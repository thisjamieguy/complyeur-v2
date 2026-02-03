import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { enforceMfaForPrivilegedUser } from '@/lib/security/mfa'

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

  const mfa = await enforceMfaForPrivilegedUser(supabase, user.id)
  if (!mfa.ok) {
    redirect('/mfa')
  }

  return { user, profile }
}
