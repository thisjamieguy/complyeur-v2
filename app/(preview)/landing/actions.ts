'use server'

import { createClient } from '@/lib/supabase/server'
import { waitlistSchema } from '@/lib/validations/waitlist'
import { sendWaitlistEmail } from '@/lib/services/waitlist-email'
import {
  encryptWaitlistEmail,
  hashWaitlistEmail,
  isWaitlistEmailEncryptionRequired,
  normalizeWaitlistEmail,
} from '@/lib/security/waitlist-encryption'

export type WaitlistState = {
  success: boolean
  message: string
  error?: string
}

type WaitlistInsertPayload = {
  company_name: string | null
  source: string
  email: string | null
  email_hash: string | null
  email_ciphertext: string | null
  email_iv: string | null
  email_tag: string | null
  email_key_version: string | null
  email_encryption_algorithm: string | null
}

type WaitlistInsertResult = { error: { code?: string } | null }

type WaitlistInsertClient = {
  from: (table: 'waitlist') => {
    insert: (value: WaitlistInsertPayload) => Promise<WaitlistInsertResult>
  }
}

/**
 * Verify Cloudflare Turnstile token server-side
 * Returns true if verification succeeds or if Turnstile is not configured (graceful degradation)
 */
async function verifyTurnstileToken(token: string | null): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // If Turnstile is not configured, allow through (graceful degradation)
  if (!secretKey) {
    console.warn('[Turnstile] Secret key not configured - skipping verification')
    return { success: true }
  }

  // If no token provided but Turnstile is configured, it might be a load failure
  // Allow through with warning for graceful degradation
  if (!token) {
    console.warn('[Turnstile] No token provided - allowing graceful degradation')
    return { success: true }
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    })

    const data = await response.json() as {
      success: boolean
      'error-codes'?: string[]
      challenge_ts?: string
      hostname?: string
    }

    if (!data.success) {
      console.error('[Turnstile] Verification failed:', data['error-codes'])
      return {
        success: false,
        error: 'Security verification failed. Please try again.',
      }
    }

    return { success: true }
  } catch (err) {
    // If Cloudflare is down, allow through (graceful degradation)
    console.error('[Turnstile] Verification request failed:', err)
    return { success: true }
  }
}

export async function joinWaitlist(
  _prevState: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  // Verify Turnstile token first
  const turnstileToken = formData.get('cf-turnstile-response') as string | null
  const turnstileResult = await verifyTurnstileToken(turnstileToken)

  if (!turnstileResult.success) {
    return {
      success: false,
      message: turnstileResult.error || 'Security verification failed. Please try again.',
      error: 'turnstile',
    }
  }

  // Parse and validate input
  const rawData = {
    email: formData.get('email'),
    companyName: formData.get('companyName') || '',
  }

  const result = waitlistSchema.safeParse(rawData)

  if (!result.success) {
    const firstError = result.error.issues[0]
    return {
      success: false,
      message: firstError?.message || 'Invalid input',
      error: 'validation',
    }
  }

  const { email, companyName } = result.data

  try {
    const supabase = await createClient()
    const normalizedEmail = normalizeWaitlistEmail(email)

    const waitlistInsert: WaitlistInsertPayload = {
      company_name: companyName || null,
      source: 'landing',
      email: normalizedEmail,
      email_hash: null,
      email_ciphertext: null,
      email_iv: null,
      email_tag: null,
      email_key_version: null,
      email_encryption_algorithm: null,
    }

    try {
      const encryptedEmail = encryptWaitlistEmail(normalizedEmail)
      waitlistInsert.email = null
      waitlistInsert.email_hash = hashWaitlistEmail(normalizedEmail)
      waitlistInsert.email_ciphertext = encryptedEmail.ciphertext
      waitlistInsert.email_iv = encryptedEmail.iv
      waitlistInsert.email_tag = encryptedEmail.tag
      waitlistInsert.email_key_version = encryptedEmail.keyVersion
      waitlistInsert.email_encryption_algorithm = encryptedEmail.algorithm
    } catch (encryptionError) {
      if (isWaitlistEmailEncryptionRequired()) {
        throw encryptionError
      }

      console.warn(
        '[Waitlist] WAITLIST_EMAIL_ENCRYPTION_KEY not configured - storing plaintext waitlist email in non-production environment'
      )
    }

    // Insert into waitlist table
    const waitlistClient = supabase as unknown as WaitlistInsertClient
    const { error: insertError } = await waitlistClient.from('waitlist').insert(waitlistInsert)

    if (insertError) {
      // Check for duplicate email
      if (insertError.code === '23505') {
        return {
          success: false,
          message: "You're already on the waitlist! We'll be in touch soon.",
          error: 'duplicate',
        }
      }

      console.error('[Waitlist] Insert error:', insertError)
      return {
        success: false,
        message: 'Something went wrong. Please try again.',
        error: 'database',
      }
    }

    // Send confirmation email (fire and forget - don't block on this)
    sendWaitlistEmail({ email: normalizedEmail, companyName: companyName || undefined }).catch(
      (err) => console.error('[Waitlist] Email error:', err)
    )

    return {
      success: true,
      message: "You're on the list! Check your inbox for confirmation.",
    }
  } catch (err) {
    console.error('[Waitlist] Unexpected error:', err)
    return {
      success: false,
      message: 'Something went wrong. Please try again.',
      error: 'unknown',
    }
  }
}
