import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import type { User } from '@supabase/supabase-js'

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
    onboardingCompleted: false,
  }
}

export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers = request.headers
) {
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
    console.warn(
      '[Middleware] Signing out authenticated user due profile lookup error',
      {
        userId: user.id,
        profileError: profileError.message,
      }
    )

    await supabase.auth.signOut()
    return { supabaseResponse, user: null, needsOnboarding: false, sessionExpired: true }
  }

  if (!profile?.company_id) {
    const recoveredContext = await recoverProfileContextForAuthenticatedUser(supabase, user)
    if (recoveredContext?.companyId) {
      // Best-effort metadata sync so future requests bypass profile query.
      await supabase.auth.updateUser({
        data: {
          company_id: recoveredContext.companyId,
          onboarding_completed: recoveredContext.onboardingCompleted,
        },
      }).catch(() => undefined)

      const SITE_OWNER_EMAILS = ['james.walsh23@outlook.com', 'complyeur@gmail.com']
      const isSiteOwner = SITE_OWNER_EMAILS.includes(user.email?.toLowerCase() ?? '')
      const needsOnboarding = !isSiteOwner && !recoveredContext.onboardingCompleted
      return { supabaseResponse, user, needsOnboarding, sessionExpired: false }
    }

    console.warn(
      '[Middleware] Signing out authenticated user due missing profile context',
      { userId: user.id }
    )
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
    console.warn('[Middleware] Failed to backfill user_metadata:', err instanceof Error ? err.message : 'Unknown error')
  })

  // Site owner always bypasses onboarding
  const SITE_OWNER_EMAILS = ['james.walsh23@outlook.com', 'complyeur@gmail.com']
  const isSiteOwner = SITE_OWNER_EMAILS.includes(user.email?.toLowerCase() ?? '')
  const needsOnboarding = !isSiteOwner && !profile.onboarding_completed_at

  return { supabaseResponse, user, needsOnboarding, sessionExpired: false }
}
