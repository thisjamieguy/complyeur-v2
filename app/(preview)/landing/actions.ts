'use server'

import { createClient } from '@/lib/supabase/server'
import { waitlistSchema } from '@/lib/validations/waitlist'
import { sendWaitlistEmail } from '@/lib/services/waitlist-email'

export type WaitlistState = {
  success: boolean
  message: string
  error?: string
}

export async function joinWaitlist(
  _prevState: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
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

    // Insert into waitlist table
    const { error: insertError } = await (supabase as any)
      .from('waitlist')
      .insert({
        email,
        company_name: companyName || null,
        source: 'landing',
      })

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
    sendWaitlistEmail({ email, companyName: companyName || undefined }).catch(
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
