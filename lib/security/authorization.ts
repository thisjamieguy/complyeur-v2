import type { createClient } from '@/lib/supabase/server'
import {
  hasPermission,
  type Permission,
  PERMISSIONS,
  isOwnerOrAdmin,
  ROLES,
} from '@/lib/permissions'
import { enforceMfaForPrivilegedUser } from '@/lib/security/mfa'
import { checkServerActionRateLimit } from '@/lib/rate-limit'

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
  mfaReason?: 'enroll' | 'verify' | 'backup_codes'
}

export type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure

export type MutationGuardSuccess = AuthGuardSuccess & {
  companyId: string
  role: string | null
}

export type MutationGuardResult = MutationGuardSuccess | AuthGuardFailure

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

async function enforceMfaIfRequired(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null },
  profile: AuthProfile
): Promise<Pick<AuthGuardFailure, 'error' | 'status' | 'mfaReason'> | null> {
  const mfa = await enforceMfaForPrivilegedUser(supabase, user.id, {
    userEmail: user.email,
    role: profile.role,
    isSuperadmin: profile.is_superadmin,
  })
  if (mfa.ok) return null

  const message =
    mfa.reason === 'backup_codes'
      ? 'Backup codes are required. Generate and save backup recovery codes to continue.'
      : 'MFA required. Complete setup or verification to continue.'

  return {
    status: 403,
    error: message,
    mfaReason: mfa.reason,
  }
}

async function enforceMutationRateLimit(
  userId: string,
  actionName: string
): Promise<Pick<AuthGuardFailure, 'error' | 'status'> | null> {
  const rateLimit = await checkServerActionRateLimit(userId, actionName)

  if (rateLimit.allowed) {
    return null
  }

  return {
    status: 429,
    error: rateLimit.error ?? 'Rate limit exceeded',
  }
}

function toMutationGuardSuccess(
  user: { id: string; email?: string | null },
  profile: AuthProfile
): MutationGuardSuccess {
  return {
    allowed: true,
    user,
    profile,
    companyId: profile.company_id as string,
    role: profile.role,
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

  const mfaFailure = await enforceMfaIfRequired(supabase, user, profile)
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

  if (!isOwnerOrAdmin(profile.role)) {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }

  const mfaFailure = await enforceMfaIfRequired(supabase, user, profile)
  if (mfaFailure) {
    return { allowed: false, ...mfaFailure }
  }

  return { allowed: true, user, profile }
}

export async function requireMutationPermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  permission: Permission,
  actionName: string
): Promise<MutationGuardResult> {
  const { user, profile } = await getAuthProfile(supabase)
  if (!user || !profile?.company_id) {
    return { allowed: false, status: 401, error: 'Unauthorized' }
  }

  if (!hasPermission(profile.role, permission)) {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }

  const mfaFailure = await enforceMfaIfRequired(supabase, user, profile)
  if (mfaFailure) {
    return { allowed: false, ...mfaFailure }
  }

  const rateLimitFailure = await enforceMutationRateLimit(user.id, actionName)
  if (rateLimitFailure) {
    return { allowed: false, ...rateLimitFailure }
  }

  return toMutationGuardSuccess(user, profile)
}

export async function requireOwnerOrAdminMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actionName: string
): Promise<MutationGuardResult> {
  const { user, profile } = await getAuthProfile(supabase)
  if (!user || !profile?.company_id) {
    return { allowed: false, status: 401, error: 'Unauthorized' }
  }

  if (!isOwnerOrAdmin(profile.role)) {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }

  const mfaFailure = await enforceMfaIfRequired(supabase, user, profile)
  if (mfaFailure) {
    return { allowed: false, ...mfaFailure }
  }

  const rateLimitFailure = await enforceMutationRateLimit(user.id, actionName)
  if (rateLimitFailure) {
    return { allowed: false, ...rateLimitFailure }
  }

  return toMutationGuardSuccess(user, profile)
}

export async function requireOwnerMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actionName: string
): Promise<MutationGuardResult> {
  const { user, profile } = await getAuthProfile(supabase)
  if (!user || !profile?.company_id) {
    return { allowed: false, status: 401, error: 'Unauthorized' }
  }

  if (profile.role !== ROLES.OWNER) {
    return { allowed: false, status: 403, error: 'Forbidden' }
  }

  const mfaFailure = await enforceMfaIfRequired(supabase, user, profile)
  if (mfaFailure) {
    return { allowed: false, ...mfaFailure }
  }

  const rateLimitFailure = await enforceMutationRateLimit(user.id, actionName)
  if (rateLimitFailure) {
    return { allowed: false, ...rateLimitFailure }
  }

  return toMutationGuardSuccess(user, profile)
}
