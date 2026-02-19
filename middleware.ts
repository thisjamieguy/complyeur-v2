import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit } from '@/lib/rate-limit'
import { buildContentSecurityPolicy, createCspNonce } from '@/lib/security/csp'
import {
  formatMaxRequestBodyError,
  getMaxRequestBodyBytesForPath,
} from '@/lib/constants/request-limits'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static assets from /public to bypass auth/session checks.
  // Without this, image/logo requests can be redirected as protected routes.
  const isStaticAssetRequest = /\.[^/]+$/.test(pathname)
  if (isStaticAssetRequest) {
    return NextResponse.next()
  }

  const nonce = createCspNonce()
  const cspHeader = buildContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const withSecurityHeaders = (response: NextResponse): NextResponse => {
    response.headers.set('Content-Security-Policy', cspHeader)
    return response
  }

  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']
  const publicMarketingRoutes = [
    '/',
    '/landing',
    '/about',
    '/contact',
    '/faq',
    '/pricing',
    '/privacy',
    '/terms',
    '/accessibility',
    '/sitemap.xml',
    '/robots.txt',
    '/icon.svg',
  ]
  const isAuthRoute = authRoutes.includes(pathname)
  const isLandingVariantRoute = pathname.startsWith('/landing')
  const isPublicMarketingRoute =
    publicMarketingRoutes.includes(pathname) || isLandingVariantRoute

  // Legacy landing variant route: always promote traffic to current landing page.
  if (pathname === '/landing-v2') {
    return withSecurityHeaders(NextResponse.redirect(new URL('/landing', request.url)))
  }

  // 1a. Maintenance Mode - block mutations when enabled
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
  if (isMaintenanceMode && request.method !== 'GET' && request.method !== 'HEAD') {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Service is temporarily under maintenance. Please try again shortly.' },
        { status: 503 }
      )
    )
  }

  // 1b. Body size limit - endpoint-aware request caps
  const maxBodySize = getMaxRequestBodyBytesForPath(pathname)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > maxBodySize) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: formatMaxRequestBodyError(maxBodySize) },
        { status: 413 }
      )
    )
  }

  // 1c. Rate Limiting - applies to API routes, auth form submissions, and public form POSTs
  // Uses Upstash Redis for distributed rate limiting in serverless environments
  // Excluded: auth/callback (OAuth redirects from providers)
  const isAuthCallback = pathname.startsWith('/auth/callback')
  const isAuthPage = pathname.startsWith('/login') ||
      pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password') || pathname.startsWith('/auth/')
  const isPostToPublicForm = isPublicMarketingRoute && request.method === 'POST'
  const shouldRateLimit = !isAuthCallback && (
    pathname.startsWith('/api/') ||
    (isAuthPage && request.method === 'POST') ||
    isPostToPublicForm
  )
  if (shouldRateLimit) {
    const rateLimitResponse = await checkRateLimit(request)
    if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse)
  }

  // Public marketing routes do not require per-request Supabase auth hydration.
  // Skipping this avoids an external call on every anonymous landing-page request.
  if (isPublicMarketingRoute) {
    return withSecurityHeaders(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    )
  }

  // 2. Auth & Session Management
  const { supabaseResponse, user, needsOnboarding } = await updateSession(request, requestHeaders)

  // Public routes that don't require authentication
  const isPublicRoute =
    isPublicMarketingRoute || pathname.startsWith('/api/') || pathname.startsWith('/auth/')

  const isOnboardingRoute = pathname.startsWith('/onboarding')

  // Protected routes: everything that isn't public or auth or onboarding
  // This covers all (dashboard) route group pages: /calendar, /import, /settings,
  // /employee, /exports, /gdpr, /trip-forecast, /future-job-alerts, etc.
  const isProtectedRoute = !isPublicRoute && !isAuthRoute && !isOnboardingRoute

  const redirectWithCookies = (url: URL) => {
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return withSecurityHeaders(response)
  }

  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (user && isAuthRoute) {
    return redirectWithCookies(new URL('/dashboard', request.url))
  }

  // If user is not authenticated and trying to access protected or onboarding routes, redirect to landing
  if (!user && (isProtectedRoute || isOnboardingRoute)) {
    return redirectWithCookies(new URL('/landing', request.url))
  }

  // Onboarding redirect logic
  if (user && needsOnboarding && !isOnboardingRoute) {
    return redirectWithCookies(new URL('/onboarding', request.url))
  }

  // If user completed onboarding but visits /onboarding, redirect to dashboard
  if (user && !needsOnboarding && isOnboardingRoute) {
    return redirectWithCookies(new URL('/dashboard', request.url))
  }

  // Continue with the response
  return withSecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - files in /public (all paths containing a file extension)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
