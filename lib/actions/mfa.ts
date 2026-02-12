"use server"

import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import {
  getMfaStatusForUser,
  hashSecret,
  setBackupSessionCookie,
} from '@/lib/security/mfa'

type MfaStatusResult =
  | {
      success: true
      currentLevel: 'aal1' | 'aal2' | null
      nextLevel: 'aal1' | 'aal2' | null
      hasVerifiedFactor: boolean
      backupSessionValid: boolean
      backupCodesRemaining: number
      totpFactorId: string | null
    }
  | { success: false; error: string }

export async function getMfaStatusAction(): Promise<MfaStatusResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const status = await getMfaStatusForUser(supabase, user.id)
  const { data: factors } = await supabase.auth.mfa.listFactors()

  const totpFactorId =
    factors?.totp?.[0]?.id ??
    factors?.all?.find((factor) => factor.factor_type === 'totp')?.id ??
    null

  const { count } = await supabase
    .from('mfa_backup_codes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('used_at', null)

  return {
    success: true,
    currentLevel: status.currentLevel,
    nextLevel: status.nextLevel,
    hasVerifiedFactor: status.hasVerifiedFactor,
    backupSessionValid: status.backupSessionValid,
    backupCodesRemaining: count ?? 0,
    totpFactorId,
  }
}

type EnrollResult =
  | { success: true; factorId: string; qrCode: string; secret: string }
  | { success: false; error: string }

export async function enrollTotpAction(): Promise<EnrollResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: factors } = await supabase.auth.mfa.listFactors()
  if (factors?.totp && factors.totp.length > 0) {
    return { success: false, error: 'MFA already enrolled' }
  }

  const unverifiedTotp = factors?.all?.find(
    (factor) => factor.factor_type === 'totp' && factor.status === 'unverified'
  )
  if (unverifiedTotp) {
    await supabase.auth.mfa.unenroll({ factorId: unverifiedTotp.id })
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'ComplyEur',
    issuer: 'ComplyEur',
  })

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Failed to enroll MFA' }
  }

  const qrCode = data.totp?.qr_code
  const secret = data.totp?.secret

  if (!qrCode || !secret) {
    return { success: false, error: 'Missing MFA enrollment data' }
  }

  return { success: true, factorId: data.id, qrCode, secret }
}

type VerifyResult =
  | { success: true }
  | { success: false; error: string }

export async function verifyTotpAction(factorId: string, code: string): Promise<VerifyResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!factorId || !code) {
    return { success: false, error: 'Missing MFA code' }
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: code.replace(/\s/g, ''),
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

type BackupCodesResult =
  | { success: true; codes: string[] }
  | { success: false; error: string }

const BACKUP_CODE_COUNT = 10
const BACKUP_CODE_LENGTH = 8
const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function normalizeBackupCode(value: string): string {
  return value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
}

function generateBackupCode(): string {
  const bytes = randomBytes(BACKUP_CODE_LENGTH)
  let code = ''
  for (let i = 0; i < BACKUP_CODE_LENGTH; i += 1) {
    code += BACKUP_CODE_ALPHABET[bytes[i] % BACKUP_CODE_ALPHABET.length]
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

export async function generateBackupCodesAction(): Promise<BackupCodesResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const status = await getMfaStatusForUser(supabase, user.id)
  if (!status.hasVerifiedFactor) {
    return { success: false, error: 'Enroll MFA before generating backup codes' }
  }

  const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => generateBackupCode())
  const inserts = codes.map((code) => ({
    user_id: user.id,
    code_hash: hashSecret(normalizeBackupCode(code)),
  }))

  await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id)
  const { error } = await supabase.from('mfa_backup_codes').insert(inserts)

  if (error) {
    return { success: false, error: 'Failed to save backup codes' }
  }

  return { success: true, codes }
}

type VerifyBackupCodeResult =
  | { success: true }
  | { success: false; error: string }

export async function verifyBackupCodeAction(code: string): Promise<VerifyBackupCodeResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const status = await getMfaStatusForUser(supabase, user.id)
  if (!status.hasVerifiedFactor) {
    return { success: false, error: 'MFA not enrolled' }
  }

  const normalized = normalizeBackupCode(code)
  if (normalized.length !== BACKUP_CODE_LENGTH) {
    return { success: false, error: 'Invalid backup code' }
  }

  const codeHash = hashSecret(normalized)
  const { data: record, error } = await supabase
    .from('mfa_backup_codes')
    .select('id, used_at')
    .eq('user_id', user.id)
    .eq('code_hash', codeHash)
    .single()

  if (error || !record || record.used_at) {
    return { success: false, error: 'Invalid or already used backup code' }
  }

  const { error: updateError } = await supabase
    .from('mfa_backup_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', record.id)

  if (updateError) {
    return { success: false, error: 'Failed to redeem backup code' }
  }

  const sessionToken = randomBytes(32).toString('hex')
  const sessionHash = hashSecret(sessionToken)
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  await supabase.from('mfa_backup_sessions').delete().eq('user_id', user.id)
  const { error: sessionError } = await supabase
    .from('mfa_backup_sessions')
    .insert({
      user_id: user.id,
      session_hash: sessionHash,
      expires_at: expiresAt,
    })

  if (sessionError) {
    return { success: false, error: 'Failed to create backup session' }
  }

  await setBackupSessionCookie(sessionToken)
  return { success: true }
}
