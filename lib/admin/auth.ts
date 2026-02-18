import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { enforceMfaForPrivilegedUser } from '@/lib/security/mfa'

const ADMIN_PANEL_ALLOWED_EMAILS = ['james.walsh23@outlook.com', 'complyeur@gmail.com']

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

function deriveAdminName(user: {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}): string | null {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>

  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : ''
  if (fullName) return fullName

  const given = typeof metadata.given_name === 'string' ? metadata.given_name.trim() : ''
  const family = typeof metadata.family_name === 'string' ? metadata.family_name.trim() : ''
  const combined = [given, family].filter(Boolean).join(' ').trim()
  if (combined) return combined

  const email = user.email ?? ''
  if (email.includes('@')) return email.split('@')[0]

  return null
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

  if (!ADMIN_PANEL_ALLOWED_EMAILS.includes(normalizeEmail(user.email))) {
    redirect('/dashboard')
  }

  // Check superadmin status
  // Note: is_superadmin column is added by the admin panel migration
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_superadmin) {
    // Silent redirect - don't reveal admin panel exists
    redirect('/dashboard')
  }

  const mfa = await enforceMfaForPrivilegedUser(supabase, user.id, user.email)
  if (!mfa.ok) {
    redirect('/mfa')
  }

  return {
    user,
    profile: {
      is_superadmin: true,
      full_name: deriveAdminName(user),
    },
  }
}
