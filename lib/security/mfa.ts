import { createHash } from 'crypto'
import { cookies } from 'next/headers'
import type { createClient } from '@/lib/supabase/server'

export const MFA_BACKUP_SESSION_COOKIE = 'mfa_backup_session'
const MFA_BACKUP_SESSION_TTL_HOURS = 12

export type MfaStatus = {
  currentLevel: 'aal1' | 'aal2' | null
  nextLevel: 'aal1' | 'aal2' | null
  hasVerifiedFactor: boolean
  backupSessionValid: boolean
}

export type MfaEnforcementResult =
  | { ok: true }
  | { ok: false; reason: 'enroll' | 'verify' | 'backup_codes' }

export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export interface MfaEnforcementContext {
  userEmail?: string | null
  role?: string | null
  isSuperadmin?: boolean | null
}

export function shouldEnforceMfaForRole(
  _role: string | null | undefined,
  isSuperadmin: boolean | null | undefined
): boolean {
  return isSuperadmin === true
}

export async function getMfaStatusForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<MfaStatus> {
  const { data: assurance, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (error || !assurance) {
    return {
      currentLevel: null,
      nextLevel: null,
      hasVerifiedFactor: false,
      backupSessionValid: false,
    }
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors()
  const hasVerifiedFactor = Boolean(
    factorsData?.all?.some((factor) => factor.status === 'verified')
  )
  const backupSessionValid = await hasValidBackupSession(supabase, userId, hasVerifiedFactor)

  return {
    currentLevel: assurance.currentLevel ?? null,
    nextLevel: assurance.nextLevel ?? null,
    hasVerifiedFactor,
    backupSessionValid,
  }
}

export async function enforceMfaForPrivilegedUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  context: MfaEnforcementContext = {}
): Promise<MfaEnforcementResult> {
  // Keep local/dev behavior aligned with production by default.
  // MFA bypass is only allowed for explicitly tagged automated test runs.
  const bypassMfaForE2E =
    process.env.DISABLE_MFA_FOR_E2E === 'true' &&
    process.env.MFA_BYPASS_CONTEXT === 'playwright'

  if (bypassMfaForE2E) {
    return { ok: true }
  }

  let role = context.role
  let isSuperadmin = context.isSuperadmin

  if (role === undefined || isSuperadmin === undefined) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, is_superadmin')
      .eq('id', userId)
      .maybeSingle()

    if (error || !profile) {
      // Fail closed when we cannot determine privilege context.
      return { ok: false, reason: 'verify' }
    }

    role = profile.role
    isSuperadmin = profile.is_superadmin
  }

  if (!shouldEnforceMfaForRole(role, isSuperadmin)) {
    return { ok: true }
  }

  const status = await getMfaStatusForUser(supabase, userId)

  if (!status.hasVerifiedFactor) {
    return { ok: false, reason: 'enroll' }
  }

  if (status.currentLevel !== 'aal2' && !status.backupSessionValid) {
    return { ok: false, reason: 'verify' }
  }

  const { count: remainingBackupCodes, error: backupCodeCountError } = await supabase
    .from('mfa_backup_codes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('used_at', null)

  if (backupCodeCountError || !remainingBackupCodes || remainingBackupCodes < 1) {
    return { ok: false, reason: 'backup_codes' }
  }

  return { ok: true }
}

export async function setBackupSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  const expiresAt = new Date(Date.now() + MFA_BACKUP_SESSION_TTL_HOURS * 60 * 60 * 1000)

  cookieStore.set(MFA_BACKUP_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
}

export async function clearBackupSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(MFA_BACKUP_SESSION_COOKIE)
}

async function hasValidBackupSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  hasVerifiedFactor: boolean
): Promise<boolean> {
  if (!hasVerifiedFactor) return false

  const cookieStore = await cookies()
  const token = cookieStore.get(MFA_BACKUP_SESSION_COOKIE)?.value
  if (!token) return false

  const sessionHash = hashSecret(token)
  const { data, error } = await supabase
    .from('mfa_backup_sessions')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('session_hash', sessionHash)
    .single()

  if (error || !data) {
    await clearBackupSessionCookie()
    return false
  }

  const expiresAt = new Date(data.expires_at)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    await supabase.from('mfa_backup_sessions').delete().eq('id', data.id)
    await clearBackupSessionCookie()
    return false
  }

  return true
}
