/**
 * Supabase Auth Hook: Prevent Identity Linking
 *
 * This hook runs BEFORE a user is created or an identity is linked.
 * It enforces ComplyEur's policy: one authentication method per email.
 *
 * Deployment:
 * 1. Deploy this function: supabase functions deploy auth-hook-prevent-linking
 * 2. In Supabase Dashboard > Authentication > Hooks
 * 3. Add hook for "Before User Created" event
 * 4. Select this function
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface AuthHookPayload {
  user_id?: string
  email?: string
  email_verified?: boolean
  provider?: string
  identities?: Array<{
    provider: string
    identity_id: string
  }>
  // For identity linking attempts
  new_identity?: {
    provider: string
    identity_id: string
  }
  event_type: 'before_user_created' | 'before_identity_linked'
}

interface AuthHookResponse {
  decision: 'continue' | 'reject'
  message?: string
}

serve(async (req) => {
  try {
    const payload: AuthHookPayload = await req.json()

    console.log('Auth hook received:', {
      event_type: payload.event_type,
      email: payload.email,
      provider: payload.provider,
      has_identities: payload.identities?.length ?? 0
    })

    // Check 1: Reject unverified Google emails
    if (payload.provider === 'google' && !payload.email_verified) {
      return new Response(
        JSON.stringify({
          decision: 'reject',
          message: 'Google account email must be verified to sign in.'
        } satisfies AuthHookResponse),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check 2: Prevent identity linking (user already exists with different provider)
    if (payload.event_type === 'before_identity_linked') {
      // This means a user exists and is trying to add a new identity
      return new Response(
        JSON.stringify({
          decision: 'reject',
          message: 'This email is already registered with a different sign-in method. Please use your original sign-in method.'
        } satisfies AuthHookResponse),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check 3: For new user creation, verify no existing user with this email
    // This requires a database query using the service role
    if (payload.event_type === 'before_user_created' && payload.email) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

      // Check if email already exists in auth.users
      const response = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?filter=email.eq.${encodeURIComponent(payload.email)}`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.users && data.users.length > 0) {
          // User already exists with this email
          const existingUser = data.users[0]
          const existingProvider = existingUser.app_metadata?.provider || 'email'

          console.log('Blocking duplicate email:', {
            email: payload.email,
            existingProvider,
            attemptedProvider: payload.provider
          })

          return new Response(
            JSON.stringify({
              decision: 'reject',
              message: `This email is already registered. Please sign in with ${existingProvider === 'email' ? 'your password' : existingProvider}.`
            } satisfies AuthHookResponse),
            { headers: { 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // All checks passed - allow the operation
    return new Response(
      JSON.stringify({
        decision: 'continue'
      } satisfies AuthHookResponse),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auth hook error:', error)

    // On error, fail closed (reject) for security
    return new Response(
      JSON.stringify({
        decision: 'reject',
        message: 'Authentication temporarily unavailable. Please try again.'
      } satisfies AuthHookResponse),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
})
