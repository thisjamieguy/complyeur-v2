import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth callback route handler
 *
 * This route handles the token exchange for:
 * - Email confirmation links
 * - Password reset links (magic links)
 * - Google OAuth callbacks
 *
 * For OAuth users, this also provisions their company/profile on first sign-in.
 */

import { validateRedirectUrl } from '@/lib/utils/redirect'

/**
 * Extracts company name from email domain.
 * user@acme-corp.com → Acme Corp
 */
function inferCompanyNameFromEmail(email: string): string {
  try {
    const domain = email.split('@')[1]
    if (!domain) return 'My Company'

    // Remove TLD (.com, .co.uk, etc.)
    const parts = domain.split('.')
    const companyPart = parts[0]

    // Convert hyphens/underscores to spaces and capitalize
    const formatted = companyPart
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    return formatted || 'My Company'
  } catch {
    return 'My Company'
  }
}

/**
 * Maps OAuth error codes to user-friendly messages.
 */
function getOAuthErrorMessage(error: string, description: string | null): string {
  const normalizedDescription = (description ?? '').toLowerCase()

  // Handle auth hook rejection messages
  if (normalizedDescription.includes('already registered')) {
    return description ?? 'This email is already registered. Please use your existing sign-in method.'
  }

  // Surface common production configuration failures with actionable messages
  if (normalizedDescription.includes('redirect_uri_mismatch')) {
    return 'Google sign-in configuration mismatch detected (redirect URI). Please contact support.'
  }

  if (
    normalizedDescription.includes('invalid_client') ||
    (normalizedDescription.includes('client') && normalizedDescription.includes('secret'))
  ) {
    return 'Google sign-in configuration issue detected (client credentials). Please contact support.'
  }

  // Handle specific OAuth errors
  const errorMessages: Record<string, string> = {
    'access_denied': 'Sign-in was cancelled. Please try again.',
    'unauthorized_client': 'This application is not authorized for Google sign-in.',
    'invalid_request': 'Invalid sign-in request. Please try again.',
    'server_error': 'Google sign-in is temporarily unavailable. Please use email sign-in and try again later.',
    'temporarily_unavailable': 'Google sign-in is temporarily unavailable. Please use email sign-in and try again later.',
  }

  return errorMessages[error] || description || 'Sign-in failed. Please try again.'
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const next = validateRedirectUrl(searchParams.get('next'))

  // Handle error responses from Supabase or OAuth provider
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('[auth/callback] OAuth error:', error)

    const userMessage = getOAuthErrorMessage(error, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(userMessage)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const supabase = await createClient()

  // Exchange the code for a session
  const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] Code exchange error:', exchangeError.message)

    // Check if this is an auth hook rejection
    if (exchangeError.message?.includes('already registered')) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`
    )
  }

  const user = sessionData?.user
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Failed to authenticate. Please try again.')}`
    )
  }

  // Check if this is an OAuth user
  const provider = user.app_metadata?.provider
  const isOAuthUser = provider && provider !== 'email'

  // Check if user already has a profile (returning user)
  const profileResult = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileResult.error) {
    console.error('[auth/callback] Profile lookup error:', profileResult.error.message)
  }

  let existingProfile = profileResult.data

  // If profile is missing, first attempt to accept a pending invite by email.
  // This handles existing auth users who were invited later.
  if (!existingProfile && user.email) {
    const { data: invitedCompanyId, error: inviteAcceptError } = await supabase.rpc(
      'accept_pending_invite_for_auth_user',
      {
        p_user_id: user.id,
        p_user_email: user.email,
      }
    )

    if (inviteAcceptError) {
      console.error('[auth/callback] Invite acceptance error:', inviteAcceptError.message)
    } else if (invitedCompanyId) {
      const refreshedProfile = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('id', user.id)
        .maybeSingle()

      if (refreshedProfile.error) {
        console.error('[auth/callback] Profile refresh after invite acceptance failed:', refreshedProfile.error.message)
      } else {
        existingProfile = refreshedProfile.data
        // Sync to user_metadata so middleware can skip the profiles query
        await supabase.auth.updateUser({
          data: { company_id: invitedCompanyId, onboarding_completed: false },
        })
      }
    }
  }

  let isNewOAuthUser = false

  if (isOAuthUser && !existingProfile) {
    const email = user.email || ''
    const companyName = inferCompanyNameFromEmail(email)

    console.log('[auth/callback] Creating company/profile for new OAuth user:', {
      userId: user.id,
      provider,
    })

    // Extract name from OAuth metadata if available
    const firstName = user.user_metadata?.given_name || user.user_metadata?.full_name?.split(' ')[0] || null
    const lastName = user.user_metadata?.family_name || null

    const { data: companyId, error: createError } = await supabase.rpc(
      'create_company_and_profile',
      {
        user_id: user.id,
        user_email: email,
        company_name: companyName,
        user_terms_accepted_at: new Date().toISOString(),
        user_auth_provider: provider,
        user_first_name: firstName,
        user_last_name: lastName
      }
    )

    if (createError) {
      console.error('[auth/callback] Failed to create company/profile for OAuth user:', createError.message)

      // Sign out the user to prevent orphaned auth account
      await supabase.auth.signOut()

      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Failed to set up your account. Please try again or contact support.')}`
      )
    }

    console.log('[auth/callback] Company created for OAuth user')

    // Sync to user_metadata so middleware can skip the profiles query
    await supabase.auth.updateUser({
      data: { company_id: companyId, onboarding_completed: false },
    })

    isNewOAuthUser = true
  }

  // Update last activity (non-blocking - don't fail auth if this fails)
  const { error: activityError } = await supabase
    .from('profiles')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', user.id)

  if (activityError) {
    // Log but don't block auth - last_activity_at column may not exist yet
    console.warn('Failed to update last activity after auth callback:', activityError.message)
  }

  // New OAuth users go to onboarding; returning users go to intended destination.
  const destination = isNewOAuthUser
    ? '/onboarding'
    : next
  return NextResponse.redirect(`${origin}${destination}`)
}
