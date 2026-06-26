import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import { SUPABASE_COOKIE_OPTIONS } from '@/lib/supabase/cookie-options'
import { DEFAULT_SETTINGS } from '@/lib/types/settings'
import type { User } from '@supabase/supabase-js'

const DEFAULT_SESSION_TIMEOUT_MINUTES = DEFAULT_SETTINGS.session_timeout_minutes
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/check-email']

function getSiteOwnerEmails(): string[] {
  const configured = process.env.SITE_OWNER_EMAILS
  if (!configured) return []
  return configured.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

function inferCompanyNameFromEmail(email: string): string {
  try {
    const domain = email.split('@')[1]
    if (!domain) return 'My Company'
    const companyPart = domain.split('.')[0]
    if (!companyPart) return 'My Company'

    return companyPart
      .replace(/[-_]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'My Company'
  } catch {
    return 'My Company'
  }
}

type ProfileContext = {
  companyId: string
  onboardingCompleted: boolean
}

type UpdateSessionResult = {
  supabaseResponse: NextResponse
  user: User | null
  needsOnboarding?: boolean
  sessionExpired: boolean
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.includes(pathname) || pathname.startsWith('/auth/')
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
}

function getEffectiveSessionTimeoutMinutes(timeoutMinutes: number | null | undefined): number {
  if (
    typeof timeoutMinutes === 'number' &&
    Number.isFinite(timeoutMinutes) &&
    timeoutMinutes >= 5 &&
    timeoutMinutes <= 120
  ) {
    return timeoutMinutes
  }

  return DEFAULT_SESSION_TIMEOUT_MINUTES
}

async function invalidateSession(
  supabase: ReturnType<typeof createServerClient>,
  request: NextRequest,
  supabaseResponse: NextResponse,
  user: User,
  logMessage: string,
  logContext: Record<string, unknown>
): Promise<UpdateSessionResult> {
  console.warn(logMessage, logContext)

  await supabase.auth.signOut()

  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')

  if (isApiRoute) {
    const response = NextResponse.json({ error: 'Session expired' }, { status: 401 })
    copyCookies(supabaseResponse, response)
    return { supabaseResponse: response, user, needsOnboarding: false, sessionExpired: true }
  }

  if (isAuthRoute(pathname)) {
    return { supabaseResponse, user: null, needsOnboarding: false, sessionExpired: true }
  }

  const response = NextResponse.redirect(new URL('/login', request.url))
  copyCookies(supabaseResponse, response)

  return {
    supabaseResponse: response,
    user,
    needsOnboarding: pathname.startsWith('/onboarding'),
    sessionExpired: true,
  }
}

async function recoverProfileContextForAuthenticatedUser(
  supabase: ReturnType<typeof createServerClient>,
  user: User
): Promise<ProfileContext | null> {
  const email = user.email
  if (!email) return null

  // First, attach the account to any pending team invite.
  const { data: invitedCompanyId } = await supabase.rpc(
    'accept_pending_invite_for_auth_user',
    {
      p_user_id: user.id,
      p_user_email: email,
    }
  )

  if (invitedCompanyId) {
    const { data: invitedProfile } = await supabase
      .from('profiles')
      .select('company_id, onboarding_completed_at')
      .eq('id', user.id)
      .maybeSingle()

    if (invitedProfile?.company_id) {
      return {
        companyId: invitedProfile.company_id,
        onboardingCompleted: !!invitedProfile.onboarding_completed_at,
      }
    }
  }

  // Fallback: provision a company/profile for authenticated users missing profile context.
  const provider = (user.app_metadata?.provider as string | undefined) ?? 'email'
  const firstName = (user.user_metadata?.given_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    null
  const lastName = (user.user_metadata?.family_name as string | undefined) ?? null
  const termsAcceptedAt = new Date().toISOString()

  const fullSignature = await supabase.rpc(
    'create_company_and_profile',
    {
      user_id: user.id,
      user_email: email,
      company_name: inferCompanyNameFromEmail(email),
      user_terms_accepted_at: termsAcceptedAt,
      user_auth_provider: provider,
      user_first_name: firstName,
      user_last_name: lastName,
    }
  )

  let createdCompanyId = fullSignature.data
  let createError = fullSignature.error

  // Backward compatibility for environments still on the legacy RPC signature.
  if (createError?.code === 'PGRST202') {
    const legacySignature = await supabase.rpc(
      'create_company_and_profile',
      {
        user_id: user.id,
        user_email: email,
        company_name: inferCompanyNameFromEmail(email),
        user_terms_accepted_at: termsAcceptedAt,
      }
    )
    createdCompanyId = legacySignature.data
    createError = legacySignature.error
  }

  if (createError) {
    console.warn(
      '[Middleware] Failed to recover profile context via create_company_and_profile',
      {
        userId: user.id,
        errorCode: createError.code ?? null,
        errorMessage: createError.message ?? null,
      }
    )
    return null
  }

  if (!createdCompanyId) return null

  return {
    companyId: createdCompanyId,
    onboardingCompleted: true,
  }
}

export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers = request.headers
): Promise<UpdateSessionResult> {
  const nextRequestConfig = {
    headers: requestHeaders,
  }

  let supabaseResponse = NextResponse.next({
    request: nextRequestConfig,
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
            request: nextRequestConfig,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
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
    .select('id, company_id, created_at, onboarding_completed_at, last_activity_at')
    .eq('id', user.id)
    .maybeSingle()

  // For new users (created within last 30 seconds), allow time for profile creation
  // This handles the race condition where OAuth callback hasn't finished creating the profile
  const userCreatedAt = user.created_at ? new Date(user.created_at) : null
  const isNewUser = userCreatedAt && (Date.now() - userCreatedAt.getTime()) < 30000

  // Don't sign out new users immediately - give profile creation time to complete
  if (isNewUser && (profileError || !profile?.company_id)) {
    return { supabaseResponse, user, needsOnboarding: false, sessionExpired: false }
  }

  if (profileError) {
    return invalidateSession(
      supabase,
      request,
      supabaseResponse,
      user,
      '[Middleware] Signing out authenticated user due profile lookup error',
      {
        userId: user.id,
        profileError: profileError.message,
      }
    )
  }

  let profileContext = profile
    ? {
        companyId: profile.company_id,
        onboardingCompleted: !!profile.onboarding_completed_at,
        lastActivityAt: profile.last_activity_at,
      }
    : null

  if (!profileContext?.companyId) {
    const recoveredContext = await recoverProfileContextForAuthenticatedUser(supabase, user)
    if (recoveredContext?.companyId) {
      profileContext = {
        companyId: recoveredContext.companyId,
        onboardingCompleted: recoveredContext.onboardingCompleted,
        lastActivityAt: profile?.last_activity_at ?? null,
      }
    } else {
      return invalidateSession(
        supabase,
        request,
        supabaseResponse,
        user,
        '[Middleware] Signing out authenticated user due missing profile context',
        { userId: user.id }
      )
    }
  }

  const { data: companySettings, error: companySettingsError } = await supabase
    .from('company_settings')
    .select('session_timeout_minutes')
    .eq('company_id', profileContext.companyId)
    .maybeSingle()

  if (companySettingsError) {
    return invalidateSession(
      supabase,
      request,
      supabaseResponse,
      user,
      '[Middleware] Signing out authenticated user due company settings lookup error',
      {
        userId: user.id,
        companyId: profileContext.companyId,
        companySettingsError: companySettingsError.message,
      }
    )
  }

  const sessionTimeoutMinutes = getEffectiveSessionTimeoutMinutes(
    companySettings?.session_timeout_minutes
  )

  if (profileContext.lastActivityAt) {
    const lastActivityTime = Date.parse(profileContext.lastActivityAt)

    if (Number.isNaN(lastActivityTime)) {
      return invalidateSession(
        supabase,
        request,
        supabaseResponse,
        user,
        '[Middleware] Signing out authenticated user due invalid last activity timestamp',
        {
          userId: user.id,
          companyId: profileContext.companyId,
          lastActivityAt: profileContext.lastActivityAt,
        }
      )
    }

    const sessionAgeMs = Date.now() - lastActivityTime
    if (sessionAgeMs > sessionTimeoutMinutes * 60_000) {
      return invalidateSession(
        supabase,
        request,
        supabaseResponse,
        user,
        '[Middleware] Signing out authenticated user due inactivity timeout',
        {
          userId: user.id,
          companyId: profileContext.companyId,
          sessionTimeoutMinutes,
          lastActivityAt: profileContext.lastActivityAt,
        }
      )
    }
  }

  const { error: lastActivityUpdateError } = await supabase
    .from('profiles')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', user.id)

  if (lastActivityUpdateError) {
    return invalidateSession(
      supabase,
      request,
      supabaseResponse,
      user,
      '[Middleware] Signing out authenticated user due last activity update error',
      {
        userId: user.id,
        companyId: profileContext.companyId,
        lastActivityUpdateError: lastActivityUpdateError.message,
      }
    )
  }

  // Keep user_metadata in sync for other server paths that consume it.
  supabase.auth.updateUser({
    data: {
      company_id: profileContext.companyId,
      onboarding_completed: profileContext.onboardingCompleted,
    },
  }).catch((err) => {
    console.warn('[Middleware] Failed to backfill user_metadata:', err instanceof Error ? err.message : 'Unknown error')
  })

  // Site owner always bypasses onboarding
  const isSiteOwner = getSiteOwnerEmails().includes(user.email?.toLowerCase() ?? '')
  const needsOnboarding = !isSiteOwner && !profileContext.onboardingCompleted

  return { supabaseResponse, user, needsOnboarding, sessionExpired: false }
}
