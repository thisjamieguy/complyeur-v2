import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

/**
 * CRON Endpoint Authentication - Fail-Closed Implementation
 *
 * This module provides centralized authentication for all CRON endpoints.
 * It enforces a fail-closed security model:
 * - Production: CRON_SECRET must be configured; missing secret = hard failure
 * - All environments: Invalid/missing Authorization header = 401 rejection
 *
 * SOC 2 Control Mapping:
 * - CC6 (Logical Access): Ensures only authorized schedulers can invoke CRON jobs
 * - A1 (Availability): Prevents unauthorized manipulation of scheduled tasks
 */

export interface CronAuthResult {
  authorized: boolean
  error?: string
  status?: number
}

export interface CronAuthSuccess {
  authorized: true
}

export interface CronAuthFailure {
  authorized: false
  error: string
  status: number
}

export type CronAuthOutcome = CronAuthSuccess | CronAuthFailure

/**
 * Validates that CRON_SECRET is properly configured.
 * In production, this must be called at boot time to enforce fail-closed behavior.
 *
 * @throws Error in production if CRON_SECRET is not configured
 */
export function validateCronSecretConfigured(): void {
  const cronSecret = process.env.CRON_SECRET
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction && !cronSecret) {
    throw new Error(
      '[SECURITY] CRON_SECRET environment variable is required in production. ' +
        'CRON endpoints cannot operate without authentication. ' +
        'Set CRON_SECRET in your environment variables.'
    )
  }

  if (!isProduction && !cronSecret) {
    console.warn(
      '[SECURITY] CRON_SECRET is not configured. ' +
        'In production, this would cause a boot failure. ' +
        'Configure CRON_SECRET to test authentication locally.'
    )
  }
}

/**
 * Authenticates an incoming CRON request using Bearer token.
 *
 * Fail-closed behavior:
 * - If CRON_SECRET is not configured in production: 500 (misconfiguration)
 * - If CRON_SECRET is not configured in dev: 401 (no bypass)
 * - If Authorization header is missing: 401
 * - If Authorization header is invalid: 401
 * - If secret does not match: 401
 *
 * @param request - The incoming NextRequest
 * @returns CronAuthOutcome indicating success or failure with status
 */
export function authenticateCronRequest(request: NextRequest): CronAuthOutcome {
  const cronSecret = process.env.CRON_SECRET
  const isProduction = process.env.NODE_ENV === 'production'

  // Fail-closed: In production, missing secret is a server configuration error
  if (isProduction && !cronSecret) {
    console.error('[CRON Auth] FATAL: CRON_SECRET not configured in production')
    return {
      authorized: false,
      error: 'Server misconfiguration: CRON authentication not available',
      status: 500,
    }
  }

  // Fail-closed: In development without secret, reject all requests
  // This differs from fail-open which would allow requests through
  if (!cronSecret) {
    console.warn('[CRON Auth] CRON_SECRET not configured - rejecting request (fail-closed)')
    return {
      authorized: false,
      error: 'CRON_SECRET not configured. Authentication cannot proceed.',
      status: 401,
    }
  }

  // Validate Authorization header exists
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    console.warn('[CRON Auth] Missing Authorization header')
    return {
      authorized: false,
      error: 'Unauthorized: Missing Authorization header',
      status: 401,
    }
  }

  // Validate Bearer token format
  if (!authHeader.startsWith('Bearer ')) {
    console.warn('[CRON Auth] Invalid Authorization header format')
    return {
      authorized: false,
      error: 'Unauthorized: Invalid Authorization header format',
      status: 401,
    }
  }

  // Constant-time comparison to prevent timing attacks
  const providedSecret = authHeader.slice(7) // Remove 'Bearer ' prefix
  if (!constantTimeCompare(providedSecret, cronSecret)) {
    console.warn('[CRON Auth] Invalid CRON_SECRET provided')
    return {
      authorized: false,
      error: 'Unauthorized: Invalid credentials',
      status: 401,
    }
  }

  // Authentication successful
  return { authorized: true }
}

/**
 * Higher-order function that wraps a CRON handler with authentication.
 * Use this to protect CRON endpoints with a single function call.
 *
 * @param handler - The actual CRON handler to execute if authenticated
 * @returns A wrapped handler that enforces authentication
 *
 * @example
 * export const GET = withCronAuth(async (request) => {
 *   // Your CRON logic here - only runs if authenticated
 *   return NextResponse.json({ success: true })
 * })
 */
export function withCronAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = authenticateCronRequest(request)

    if (!authResult.authorized) {
      // Type narrowing: authResult is CronAuthFailure here
      const failure = authResult as CronAuthFailure
      return NextResponse.json(
        { error: failure.error },
        { status: failure.status }
      )
    }

    // Authentication passed - execute the actual handler
    return handler(request)
  }
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if strings are equal, false otherwise.
 */
function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
