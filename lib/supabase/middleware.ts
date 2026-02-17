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

  const needsOnboarding = !profile.onboarding_completed_at

  return { supabaseResponse, user, needsOnboarding, sessionExpired: false }
}
