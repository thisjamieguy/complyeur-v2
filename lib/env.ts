/**
 * Environment variable validation
 * This module validates all required environment variables at startup
 * and provides typed exports for use throughout the application.
 */

function getRequiredEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Please check your .env.local file and ensure all required variables are set.`
    )
  }
  return value
}

function getOptionalEnvVar(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue
}

// Public environment variables (available on client and server)
export const env = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),

  // App
  NEXT_PUBLIC_APP_URL: getOptionalEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
} as const

// Validate URL format (allow http:// for local development)
const isValidUrl = env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://') ||
  env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http://127.0.0.1') ||
  env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http://localhost')

if (!isValidUrl) {
  throw new Error(
    `Invalid NEXT_PUBLIC_SUPABASE_URL: must start with https:// (or http://127.0.0.1 or http://localhost for local dev). ` +
    `Got: ${env.NEXT_PUBLIC_SUPABASE_URL}`
  )
}

export type Env = typeof env

/**
 * Gets the base URL dynamically based on the environment.
 * For Server Actions: pass headers to extract the host from the request.
 * Falls back to VERCEL_URL for Vercel deployments, then NEXT_PUBLIC_APP_URL.
 *
 * @param requestHeaders - Headers from the incoming request (from next/headers)
 */
export function getBaseUrl(requestHeaders?: Headers): string {
  // 1. Try to get from request headers (works in Server Actions)
  if (requestHeaders) {
    const host = requestHeaders.get('host')
    const protocol = requestHeaders.get('x-forwarded-proto') || 'https'
    if (host) {
      return `${protocol}://${host}`
    }
  }

  // 2. Check for Vercel deployment URL (preview and production)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 3. Fall back to configured app URL (or localhost default)
  return env.NEXT_PUBLIC_APP_URL
}
