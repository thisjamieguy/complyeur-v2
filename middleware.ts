import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Rate Limiting - applies to API routes and auth routes
  // Uses Upstash Redis for distributed rate limiting in serverless environments
  // Health endpoint is excluded for monitoring availability
  const isHealthEndpoint = pathname === '/api/health'
  if (!isHealthEndpoint && (pathname.startsWith('/api/') || pathname.startsWith('/login') ||
      pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password') || pathname.startsWith('/auth/'))) {
    const rateLimitResponse = await checkRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse
  }

  // 2. Auth & Session Management
  const { supabaseResponse, user } = await updateSession(request)

  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']
  const isAuthRoute = authRoutes.includes(pathname)

  // Protected routes (everything under /dashboard, /test-endpoints, and /admin)
  // Note: Route groups like (dashboard) don't appear in the actual URL pathname
  const isProtectedRoute = pathname.startsWith('/dashboard') ||
                           pathname.startsWith('/test-endpoints') ||
                           pathname.startsWith('/admin')

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

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!user && isProtectedRoute) {
    return redirectWithCookies(new URL('/login', request.url))
  }

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
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
