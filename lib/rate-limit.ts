import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Distributed Rate Limiter using Upstash Redis
 *
 * This implementation works correctly in serverless/edge environments (Vercel)
 * because it uses Redis for distributed state instead of in-memory storage.
 *
 * Rate limits:
 * - API routes: 60 requests per minute per IP
 * - Auth endpoints: 10 requests per minute per IP (stricter to prevent brute force)
 *
 * If Upstash is not configured, falls back to allowing all requests with a warning.
 */

// Check if Upstash is configured
const isUpstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Create Redis client only if configured
const redis = isUpstashConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Standard rate limiter for API routes (60 requests per minute)
const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      prefix: 'ratelimit:api',
      analytics: true,
    })
  : null

// Stricter rate limiter for auth endpoints (10 requests per minute)
const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'ratelimit:auth',
      analytics: true,
    })
  : null

// Even stricter for password reset (5 requests per hour)
const passwordResetRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      prefix: 'ratelimit:password-reset',
      analytics: true,
    })
  : null

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Get client IP from request headers
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

/**
 * Check rate limit for a request
 */
export async function rateLimit(
  identifier: string,
  type: 'api' | 'auth' | 'password-reset' = 'api'
): Promise<RateLimitResult> {
  // If Upstash is not configured, allow all requests but log warning
  if (!redis) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[RateLimit] Upstash not configured. Rate limiting disabled. ' +
        'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
      )
    }
    return {
      success: true,
      limit: 60,
      remaining: 60,
      reset: Date.now() + 60000
    }
  }

  const limiter =
    type === 'password-reset' ? passwordResetRateLimiter :
    type === 'auth' ? authRateLimiter :
    apiRateLimiter

  if (!limiter) {
    return { success: true, limit: 60, remaining: 60, reset: Date.now() + 60000 }
  }

  const result = await limiter.limit(identifier)

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

/**
 * Middleware helper to check rate limits for API routes
 */
export async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIp(request)
  const pathname = request.nextUrl.pathname

  // Determine rate limit type based on route
  let limitType: 'api' | 'auth' | 'password-reset' = 'api'

  if (pathname.includes('/forgot-password') || pathname.includes('/reset-password')) {
    limitType = 'password-reset'
  } else if (
    pathname.includes('/login') ||
    pathname.includes('/signup') ||
    pathname.includes('/auth')
  ) {
    limitType = 'auth'
  }

  const { success, limit, remaining, reset } = await rateLimit(ip, limitType)

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    )
  }

  return null // No error, continue
}

/**
 * Rate limit for server actions (called directly from action code)
 * Use this to protect server actions that don't go through middleware
 */
export async function checkServerActionRateLimit(
  userId: string,
  actionName: string
): Promise<{ allowed: boolean; error?: string }> {
  if (!redis) {
    return { allowed: true }
  }

  // Use user ID + action name as identifier for more granular control
  const identifier = `action:${userId}:${actionName}`

  const { success, reset } = await rateLimit(identifier, 'api')

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    return {
      allowed: false,
      error: `Too many requests. Please try again in ${retryAfter} seconds.`,
    }
  }

  return { allowed: true }
}
