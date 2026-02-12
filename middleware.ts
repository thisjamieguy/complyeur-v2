import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static assets from /public to bypass auth/session checks.
  // Without this, image/logo requests can be redirected as protected routes.
  const isStaticAssetRequest = /\.[^/]+$/.test(pathname)
  if (isStaticAssetRequest) {
    return NextResponse.next()
  }

  // 1. Rate Limiting - applies to API routes and auth form submissions (POST only)
  // Uses Upstash Redis for distributed rate limiting in serverless environments
  // Excluded: health endpoint (monitoring), auth/callback (OAuth redirects from providers)
  // Note: Only rate limit POST requests to auth pages to avoid limiting page views
  const isHealthEndpoint = pathname === '/api/health'
  const isAuthCallback = pathname.startsWith('/auth/callback')
  const isAuthPage = pathname.startsWith('/login') ||
      pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password') || pathname.startsWith('/auth/')
  const shouldRateLimit = !isHealthEndpoint && !isAuthCallback && (
    pathname.startsWith('/api/') ||
    (isAuthPage && request.method === 'POST')
  )
  if (shouldRateLimit) {
    const rateLimitResponse = await checkRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse
  }

  // 2. Auth & Session Management
  const { supabaseResponse, user } = await updateSession(request)

  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']
  const isAuthRoute = authRoutes.includes(pathname)

  // Public routes that don't require authentication
  const publicRoutes = [
    '/', '/landing', '/about', '/contact', '/faq', '/pricing',
    '/privacy', '/terms', '/accessibility',
    '/sitemap.xml', '/robots.txt', '/icon.svg',
  ]
  const isLandingVariantRoute = pathname.startsWith('/landing')
  const isPublicRoute = publicRoutes.includes(pathname) ||
                        isLandingVariantRoute ||
                        pathname.startsWith('/api/') ||
                        pathname.startsWith('/auth/')

  // Protected routes: everything that isn't public or auth
  // This covers all (dashboard) route group pages: /calendar, /import, /settings,
  // /employee, /exports, /gdpr, /trip-forecast, /future-job-alerts, etc.
  const isProtectedRoute = !isPublicRoute && !isAuthRoute

  const redirectWithCookies = (url: URL) => {
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (user && isAuthRoute) {
    return redirectWithCookies(new URL('/dashboard', request.url))
  }

  // If user is not authenticated and trying to access protected routes, redirect to landing
  if (!user && isProtectedRoute) {
    return redirectWithCookies(new URL('/landing', request.url))
  }

  // Redirect all auth routes to landing page (waitlist mode - no signups/logins yet)
  // TEMPORARILY DISABLED FOR E2E TESTING - uncomment to re-enable waitlist mode
  // if (!user && isAuthRoute) {
  //   return redirectWithCookies(new URL('/landing', request.url))
  // }

  // Continue with the response
  return supabaseResponse
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
