import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export interface InviteEmailDispatchResult {
  success: boolean
  recoverableExistingUser: boolean
  error?: string
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isRecoverableInviteError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('already been registered') ||
    lower.includes('already registered') ||
    lower.includes('user already registered') ||
    lower.includes('already exists')
  )
}

export async function dispatchInviteEmail(
  admin: SupabaseClient,
  email: string,
  redirectPath: string
): Promise<InviteEmailDispatchResult> {
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(redirectPath)}`

  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })

  if (!error) {
    return { success: true, recoverableExistingUser: false }
  }

  if (isRecoverableInviteError(error.message)) {
    return { success: true, recoverableExistingUser: true }
  }

  return {
    success: false,
    recoverableExistingUser: false,
    error: error.message,
  }
}
