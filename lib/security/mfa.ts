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
  | { ok: false; reason: 'enroll' | 'verify' }

export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex')
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

  const hasVerifiedFactor = assurance.nextLevel === 'aal2'
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
  userId: string
): Promise<MfaEnforcementResult> {
  const status = await getMfaStatusForUser(supabase, userId)

  if (!status.hasVerifiedFactor) {
    return { ok: false, reason: 'enroll' }
  }

  if (status.currentLevel === 'aal2' || status.backupSessionValid) {
    return { ok: true }
  }

  return { ok: false, reason: 'verify' }
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
