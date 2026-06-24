import { createHash } from 'crypto'
import { cookies } from 'next/headers'
import type { createClient } from '@/lib/supabase/server'
import { isPrivilegedRole } from '@/lib/permissions'

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
  role: string | null | undefined,
  isSuperadmin: boolean | null | undefined
): boolean {
  return isSuperadmin === true || isPrivilegedRole(role)
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
    process.env.NODE_ENV !== 'production' &&
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

/**
 * Step-up (re-authentication) support for irreversible actions.
 *
 * Being AAL2 only proves MFA was completed *at some point* during the session.
 * For irreversible operations (GDPR erasure) we additionally require that the
 * MFA verification happened *recently*, so that a hijacked or long-lived session
 * cannot destroy data without a fresh proof of identity ("sudo mode").
 */
export const STEP_UP_MAX_AGE_SECONDS = 5 * 60

export type StepUpResult = { ok: true } | { ok: false; reason: 'reverify' }

/**
 * Returns the Unix-seconds timestamp of the most recent MFA (TOTP) verification
 * in the current session, or null when none is present (e.g. the session is
 * only AAL1, so no TOTP authentication method is recorded).
 *
 * The AMR method label differs across Supabase versions ('totp' vs 'mfa/totp'),
 * so we match any method containing 'totp' to stay robust.
 */
export async function getLatestMfaVerificationTimestamp(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number | null> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const methods = data?.currentAuthenticationMethods
  if (error || !methods) return null

  // `currentAuthenticationMethods` is typed as `(string | AMREntry)[]`; only the
  // object entries carry a method label and timestamp.
  const totpTimestamps: number[] = []
  for (const entry of methods) {
    if (typeof entry === 'string') continue
    if (!String(entry.method).includes('totp')) continue
    if (typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp)) {
      totpTimestamps.push(entry.timestamp)
    }
  }

  if (totpTimestamps.length === 0) return null
  return Math.max(...totpTimestamps)
}

/**
 * Requires a recent MFA verification before an irreversible action.
 *
 * - Users without a verified factor are not blocked here: they have no second
 *   factor to step up with, and privileged users already have MFA enforced by
 *   {@link enforceMfaForPrivilegedUser} at the layout boundary.
 * - Users with a verified factor must have verified within `maxAgeSeconds`,
 *   otherwise they are asked to re-verify. Fails closed (reverify) when the
 *   last-verification timestamp cannot be determined.
 */
export async function requireRecentMfaVerification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: { maxAgeSeconds?: number; nowSeconds?: number } = {}
): Promise<StepUpResult> {
  const maxAgeSeconds = options.maxAgeSeconds ?? STEP_UP_MAX_AGE_SECONDS

  const { data: factorsData } = await supabase.auth.mfa.listFactors()
  const hasVerifiedFactor = Boolean(
    factorsData?.all?.some((factor) => factor.status === 'verified')
  )

  if (!hasVerifiedFactor) {
    return { ok: true }
  }

  const lastVerifiedAt = await getLatestMfaVerificationTimestamp(supabase)
  if (lastVerifiedAt === null) {
    return { ok: false, reason: 'reverify' }
  }

  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (nowSeconds - lastVerifiedAt > maxAgeSeconds) {
    return { ok: false, reason: 'reverify' }
  }

  return { ok: true }
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
