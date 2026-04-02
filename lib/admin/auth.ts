import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { enforceMfaForPrivilegedUser } from '@/lib/security/mfa'

export type SuperAdminSessionFailureKind = 'unauthenticated' | 'forbidden' | 'mfa_required'

export type SuperAdminSessionResult =
  | { ok: true; user: User }
  | {
      ok: false
      status: 401 | 403
      error: string
      kind: SuperAdminSessionFailureKind
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
 * Validates superadmin session without redirecting — for server actions that must
 * return structured errors (including 401/403 semantics) to the client.
 */
export async function verifySuperAdminSession(): Promise<SuperAdminSessionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ok: false,
      status: 401,
      error: 'Not authenticated',
      kind: 'unauthenticated',
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[verifySuperAdminSession] Failed to fetch profile flag:', profileError.message)
  }

  if (profile?.is_superadmin !== true) {
    return { ok: false, status: 403, error: 'Forbidden', kind: 'forbidden' }
  }

  const mfa = await enforceMfaForPrivilegedUser(supabase, user.id, {
    userEmail: user.email,
    isSuperadmin: true,
  })
  if (!mfa.ok) {
    return {
      ok: false,
      status: 403,
      error: 'Additional verification is required to perform this action',
      kind: 'mfa_required',
    }
  }

  return { ok: true, user }
}

/**
 * Checks if the current user is a super admin.
 * If not authenticated, redirects to login.
 * If authenticated but not superadmin, redirects to dashboard.
 *
 * Use this at the top of admin pages/layouts to protect them.
 */
export async function requireSuperAdmin() {
  const result = await verifySuperAdminSession()

  if (!result.ok) {
    if (result.kind === 'unauthenticated') {
      redirect('/login?redirect=/admin')
    }
    if (result.kind === 'mfa_required') {
      redirect('/mfa')
    }
    redirect('/dashboard')
  }

  const { user } = result

  return {
    user,
    profile: {
      is_superadmin: true,
      full_name: deriveAdminName(user),
    },
  }
}
