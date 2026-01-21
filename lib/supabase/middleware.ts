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
    .select('id, company_id, last_activity_at, created_at')
    .eq('id', user.id)
    .single()

  // For new users (created within last 30 seconds), allow time for profile creation
  // This handles the race condition where OAuth callback hasn't finished creating the profile
  const userCreatedAt = user.created_at ? new Date(user.created_at) : null
  const isNewUser = userCreatedAt && (Date.now() - userCreatedAt.getTime()) < 30000

  if (profileError || !profile?.company_id) {
    // Don't sign out new users immediately - give profile creation time to complete
    if (isNewUser) {
      return { supabaseResponse, user, sessionExpired: false }
    }
    await supabase.auth.signOut()
    return { supabaseResponse, user: null, sessionExpired: true }
  }

  const { data: settings } = await supabase
    .from('company_settings')
    .select('session_timeout_minutes')
    .eq('company_id', profile.company_id)
    .single()

  const sessionTimeoutMinutes = settings?.session_timeout_minutes ?? 30
  const now = new Date()
  const lastActivityAt = profile.last_activity_at ? new Date(profile.last_activity_at) : null

  if (lastActivityAt) {
    const inactivityMs = now.getTime() - lastActivityAt.getTime()
    if (inactivityMs > sessionTimeoutMinutes * 60 * 1000) {
      await supabase.auth.signOut()
      return { supabaseResponse, user: null, sessionExpired: true }
    }
  }

  await supabase
    .from('profiles')
    .update({ last_activity_at: now.toISOString() })
    .eq('id', user.id)

  return { supabaseResponse, user, sessionExpired: false }
}
