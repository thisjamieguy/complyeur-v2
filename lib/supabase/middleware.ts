import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabaseResponse, user, sessionExpired: false }
  }

  // Skip profile validation for auth callback route - it handles its own profile creation
  // This prevents race conditions where the profile hasn't been created yet
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/auth/callback')) {
    return { supabaseResponse, user, sessionExpired: false }
  }

  // Try to read company_id and onboarding status from user_metadata (set during
  // auth callback / onboarding completion). This avoids a profiles DB query on
  // every authenticated request — the data is already available from getUser().
  const meta = user.user_metadata ?? {}
  const metaCompanyId = meta.company_id as string | undefined
  const metaOnboardingCompleted = meta.onboarding_completed as boolean | undefined

  if (metaCompanyId) {
    // Metadata is present — skip profiles query entirely
    const SITE_OWNER_EMAILS = ['james.walsh23@outlook.com', 'complyeur@gmail.com']
    const isSiteOwner = SITE_OWNER_EMAILS.includes(user.email?.toLowerCase() ?? '')
    const needsOnboarding = !isSiteOwner && metaOnboardingCompleted !== true

    return { supabaseResponse, user, needsOnboarding, sessionExpired: false }
  }

  // Fallback: metadata not yet set (existing users before this change).
  // Query profiles and sync metadata for future requests.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, company_id, created_at, onboarding_completed_at')
    .eq('id', user.id)
    .single()

  // For new users (created within last 30 seconds), allow time for profile creation
  // This handles the race condition where OAuth callback hasn't finished creating the profile
  const userCreatedAt = user.created_at ? new Date(user.created_at) : null
  const isNewUser = userCreatedAt && (Date.now() - userCreatedAt.getTime()) < 30000

  if (profileError || !profile?.company_id) {
    // Don't sign out new users immediately - give profile creation time to complete
    if (isNewUser) {
      return { supabaseResponse, user, needsOnboarding: false, sessionExpired: false }
    }
    await supabase.auth.signOut()
    return { supabaseResponse, user: null, needsOnboarding: false, sessionExpired: true }
  }

  // Backfill user_metadata so subsequent requests skip the profiles query.
  // Fire-and-forget — don't block the response for this.
  supabase.auth.updateUser({
    data: {
      company_id: profile.company_id,
      onboarding_completed: !!profile.onboarding_completed_at,
    },
  }).catch((err) => {
    console.warn('[Middleware] Failed to backfill user_metadata:', err)
  })

  // Site owner always bypasses onboarding
  const SITE_OWNER_EMAILS = ['james.walsh23@outlook.com', 'complyeur@gmail.com']
  const isSiteOwner = SITE_OWNER_EMAILS.includes(user.email?.toLowerCase() ?? '')
  const needsOnboarding = !isSiteOwner && !profile.onboarding_completed_at

  return { supabaseResponse, user, needsOnboarding, sessionExpired: false }
}
