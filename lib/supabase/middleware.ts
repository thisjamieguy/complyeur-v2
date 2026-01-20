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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, company_id, last_activity_at')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
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
