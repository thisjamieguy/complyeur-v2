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
 * Checks if a hostname represents a local development environment.
 */
function isLocalHost(host: string): boolean {
  const localPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
  const lowerHost = host.toLowerCase()
  return localPatterns.some(pattern => lowerHost.includes(pattern))
}

/**
 * Gets the base URL dynamically based on the environment.
 * For Server Actions: pass headers to extract the host from the request.
 * Falls back to VERCEL_URL for Vercel deployments, then NEXT_PUBLIC_APP_URL.
 *
 * @param requestHeaders - Headers from the incoming request (from next/headers)
 */
export function getBaseUrl(requestHeaders?: Headers): string {
  // 1. In Vercel production/preview, prefer VERCEL_URL to avoid any header manipulation issues
  // This ensures OAuth redirects always go to the correct Vercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 2. Try to get from request headers (works in Server Actions for non-Vercel deployments)
  if (requestHeaders) {
    const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host')
    const protocol = requestHeaders.get('x-forwarded-proto') || 'https'

    // Only use header-based URL if it's not a local address
    if (host && !isLocalHost(host)) {
      return `${protocol}://${host}`
    }
  }

  // 3. Fall back to configured app URL (read at runtime, not from cached env object)
  // This handles non-Vercel deployments where NEXT_PUBLIC_APP_URL is set
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl && !isLocalHost(appUrl)) {
    return appUrl
  }

  // 4. Final fallback for local development only
  return 'http://localhost:3000'
}
