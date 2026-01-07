import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth callback route handler
 *
 * This route handles the token exchange for:
 * - Email confirmation links
 * - Password reset links (magic links)
 * - OAuth callbacks (future)
 *
 * The flow:
 * 1. User clicks link in email (contains token in URL)
 * 2. Supabase redirects to this callback with code parameter
 * 3. We exchange the code for a session
 * 4. Redirect user to appropriate page
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Handle error responses from Supabase
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    // Redirect to login with error message
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (code) {
    const supabase = await createClient()

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Failed to verify email. Please try again.')}`
      )
    }

    // Successful authentication - redirect to intended destination
    // For password reset, we want to go to /reset-password
    // For email confirmation, we go to /dashboard
    const redirectTo = next.startsWith('/') ? next : '/dashboard'
    return NextResponse.redirect(`${origin}${redirectTo}`)
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
