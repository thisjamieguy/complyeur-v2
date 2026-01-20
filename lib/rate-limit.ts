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
 * - Password reset: 5 requests per hour per IP
 *
 * FAIL-CLOSED BEHAVIOR (SOC 2 CC6/A1):
 * - Production: If Upstash is not configured, requests are REJECTED (503)
 * - Development: If Upstash is not configured, requests are ALLOWED (for local dev)
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
  /** Indicates rate limiter is unavailable (fail-closed in production) */
  limiterUnavailable?: boolean
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
 *
 * FAIL-CLOSED BEHAVIOR:
 * - Production: If rate limiter is unavailable, requests are REJECTED (503)
 * - Development/Test: If rate limiter is unavailable, requests are ALLOWED (for local dev)
 *
 * This ensures SOC 2 CC6/A1 compliance by preventing unthrottled access in production.
 */
export async function rateLimit(
  identifier: string,
  type: 'api' | 'auth' | 'password-reset' = 'api'
): Promise<RateLimitResult> {
  const isProduction = process.env.NODE_ENV === 'production'

  // FAIL-CLOSED: In production, reject requests if rate limiter is unavailable
  if (!redis) {
    if (isProduction) {
      console.error(
        '[RateLimit] FAIL-CLOSED: Upstash not configured in production. ' +
        'Rejecting request. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
      )
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: Date.now() + 60000,
        limiterUnavailable: true,
      }
    }
    // Development/test: allow requests but log warning
    console.warn(
      '[RateLimit] Upstash not configured. Rate limiting disabled in development.'
    )
    return {
      success: true,
      limit: 60,
      remaining: 60,
      reset: Date.now() + 60000,
    }
  }

  const limiter =
    type === 'password-reset' ? passwordResetRateLimiter :
    type === 'auth' ? authRateLimiter :
    apiRateLimiter

  // FAIL-CLOSED: If limiter instance is null despite redis being configured, reject
  if (!limiter) {
    if (isProduction) {
      console.error('[RateLimit] FAIL-CLOSED: Rate limiter instance unavailable.')
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: Date.now() + 60000,
        limiterUnavailable: true,
      }
    }
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
 *
 * Returns:
 * - null: Request allowed, continue processing
 * - 429 response: Rate limit exceeded
 * - 503 response: Rate limiter unavailable (fail-closed in production)
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

  const { success, limit, remaining, reset, limiterUnavailable } = await rateLimit(ip, limitType)

  if (!success) {
    // FAIL-CLOSED: Return 503 if rate limiter is unavailable in production
    if (limiterUnavailable) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'Rate limiting service is unavailable. Please try again later.',
          code: 'RATE_LIMITER_UNAVAILABLE',
        },
        {
          status: 503,
          headers: {
            'Retry-After': '60',
          },
        }
      )
    }

    // Standard 429 for rate limit exceeded
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
 *
 * FAIL-CLOSED BEHAVIOR:
 * - Production: If rate limiter is unavailable, action is REJECTED
 * - Development/Test: If rate limiter is unavailable, action is ALLOWED
 */
export async function checkServerActionRateLimit(
  userId: string,
  actionName: string
): Promise<{ allowed: boolean; error?: string; limiterUnavailable?: boolean }> {
  const isProduction = process.env.NODE_ENV === 'production'

  // FAIL-CLOSED: In production, reject if rate limiter is unavailable
  if (!redis) {
    if (isProduction) {
      console.error(
        '[RateLimit] FAIL-CLOSED: Server action rejected - rate limiter unavailable.'
      )
      return {
        allowed: false,
        error: 'Service temporarily unavailable. Please try again later.',
        limiterUnavailable: true,
      }
    }
    // Development: allow without rate limiting
    return { allowed: true }
  }

  // Use user ID + action name as identifier for more granular control
  const identifier = `action:${userId}:${actionName}`

  const { success, reset, limiterUnavailable } = await rateLimit(identifier, 'api')

  if (!success) {
    if (limiterUnavailable) {
      return {
        allowed: false,
        error: 'Service temporarily unavailable. Please try again later.',
        limiterUnavailable: true,
      }
    }
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    return {
      allowed: false,
      error: `Too many requests. Please try again in ${retryAfter} seconds.`,
    }
  }

  return { allowed: true }
}
