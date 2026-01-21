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
  // Handle auth hook rejection messages
  if (description?.includes('already registered')) {
    return description
  }

  // Handle specific OAuth errors
  const errorMessages: Record<string, string> = {
    'access_denied': 'Sign-in was cancelled. Please try again.',
    'unauthorized_client': 'This application is not authorized for Google sign-in.',
    'invalid_request': 'Invalid sign-in request. Please try again.',
    'server_error': 'Google sign-in is temporarily unavailable. Please try again later.',
    'temporarily_unavailable': 'Google sign-in is temporarily unavailable. Please try again later.',
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
    console.error('Auth callback error:', { error, errorDescription })

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
    console.error('Code exchange error:', exchangeError)

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

  if (isOAuthUser) {
    // Check if user already has a profile (returning OAuth user)
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Profile lookup error:', profileError)
      // Continue anyway - we'll try to create if needed
    }

    // If no profile exists, this is a new OAuth user - create company/profile
    if (!existingProfile) {
      const email = user.email || ''
      const companyName = inferCompanyNameFromEmail(email)

      console.log('Creating company/profile for new OAuth user:', {
        userId: user.id,
        email,
        provider,
        inferredCompany: companyName
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
        console.error('Failed to create company/profile for OAuth user:', createError)

        // Sign out the user to prevent orphaned auth account
        await supabase.auth.signOut()

        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent('Failed to set up your account. Please try again or contact support.')}`
        )
      }

      console.log('Successfully created company for OAuth user:', { companyId })
    }
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

  // Success - redirect to intended destination
  return NextResponse.redirect(`${origin}${next}`)
}
