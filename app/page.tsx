import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// No metadata - this page immediately redirects to /landing or /dashboard
// Having duplicate metadata between / and /landing hurts SEO
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
}

export const dynamic = 'force-dynamic'

interface HomePageProps {
  searchParams: Promise<{
    error?: string
    error_code?: string
    error_description?: string
  }>
}

function mapRootAuthErrorToMessage(
  error: string,
  errorCode?: string,
  errorDescription?: string
): string {
  const normalizedError = error.toLowerCase()
  const normalizedDescription = (errorDescription ?? '').toLowerCase()

  if (normalizedError === 'access_denied') {
    return 'Sign-in was cancelled. Please try again.'
  }

  if (normalizedError === 'unauthorized_client') {
    return 'This application is not authorized for Google sign-in.'
  }

  if (
    normalizedError === 'server_error' &&
    (
      normalizedDescription.includes('unable to exchange external code') ||
      normalizedDescription.includes('invalid_client') ||
      errorCode === 'unexpected_failure'
    )
  ) {
    return 'Google sign-in is misconfigured in local development. Use email sign-in or update local Google OAuth credentials.'
  }

  return 'Sign-in failed. Please try again.'
}

export default async function Home({ searchParams }: HomePageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams

  // Redirect authenticated users to dashboard, others to landing page
  if (user) {
    redirect('/dashboard')
  }

  // Surface provider callback errors on /login instead of silently landing.
  if (params.error) {
    const message = mapRootAuthErrorToMessage(
      params.error,
      params.error_code,
      params.error_description
    )
    redirect(`/login?error=${encodeURIComponent(message)}`)
  }

  redirect('/landing')
}
