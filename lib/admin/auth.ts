import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { enforceMfaForPrivilegedUser } from '@/lib/security/mfa'

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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[requireSuperAdmin] Failed to fetch profile flag:', profileError.message)
  }

  if (profile?.is_superadmin !== true) {
    redirect('/dashboard')
  }

  const mfa = await enforceMfaForPrivilegedUser(supabase, user.id, {
    userEmail: user.email,
    isSuperadmin: true,
  })
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
