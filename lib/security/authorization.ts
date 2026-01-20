import type { createClient } from '@/lib/supabase/server'
import { hasPermission, type Permission, PERMISSIONS } from '@/lib/permissions'
import { enforceMfaForPrivilegedUser } from '@/lib/security/mfa'

type AuthProfile = {
  company_id: string | null
  role: string | null
  is_superadmin: boolean | null
}

export type AuthGuardSuccess = {
  allowed: true
  user: { id: string; email?: string | null }
  profile: AuthProfile
}

export type AuthGuardFailure = {
  allowed: false
  status: number
  error: string
  mfaReason?: 'enroll' | 'verify'
}

export type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure

async function getAuthProfile(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ user: { id: string; email?: string | null } | null; profile: AuthProfile | null }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role, is_superadmin')
    .eq('id', user.id)
    .single()

  return {
    user: { id: user.id, email: user.email },
    profile: profile ?? null,
  }
}

async function enforceMfaIfPrivileged(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: AuthProfile,
  userId: string
): Promise<Pick<AuthGuardFailure, 'error' | 'status' | 'mfaReason'> | null> {
  const isPrivileged = profile.role === 'admin' || profile.is_superadmin === true
  if (!isPrivileged) return null

  const mfa = await enforceMfaForPrivilegedUser(supabase, userId)
  if (mfa.ok) return null

  return {
    status: 403,
    error: 'MFA required. Complete setup or verification to continue.',
    mfaReason: mfa.reason,
  }
}

export async function requirePermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  permission: Permission
): Promise<AuthGuardResult> {
  const { user, profile } = await getAuthProfile(supabase)
  if (!user || !profile) {
    return { allowed: false, status: 401, error: 'Unauthorized' }
  }

  if (!hasPermission(profile.role, permission)) {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }

  const mfaFailure = await enforceMfaIfPrivileged(supabase, profile, user.id)
  if (mfaFailure) {
    return { allowed: false, ...mfaFailure }
  }

  return { allowed: true, user, profile }
}

export async function requireExportPermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  format: 'csv' | 'pdf'
): Promise<AuthGuardResult> {
  const permission =
    format === 'csv' ? PERMISSIONS.REPORTS_EXPORT_CSV : PERMISSIONS.REPORTS_EXPORT_PDF

  return requirePermission(supabase, permission)
}

export async function requireAdminAccess(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<AuthGuardResult> {
  const { user, profile } = await getAuthProfile(supabase)
  if (!user || !profile) {
    return { allowed: false, status: 401, error: 'Unauthorized' }
  }

  if (profile.role !== 'admin') {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }

  const mfaFailure = await enforceMfaIfPrivileged(supabase, profile, user.id)
  if (mfaFailure) {
    return { allowed: false, ...mfaFailure }
  }

  return { allowed: true, user, profile }
}
