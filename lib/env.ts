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

/**
 * Normalizes a URL to origin-only form (scheme + host + optional port).
 * This prevents accidental double-slash path construction when env vars contain trailing slashes.
 */
function normalizeOrigin(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return url.replace(/\/+$/, '')
  }
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
 * Auth links must be generated from canonical deployment configuration and
 * must never trust request Host/X-Forwarded-Host headers.
 *
 * Resolution order:
 * 1. NEXT_PUBLIC_APP_URL (canonical)
 * 2. VERCEL_URL (preview/production fallback)
 * 3. localhost (development fallback)
 *
 * @param _requestHeaders - kept for backward compatibility with existing call sites
 */
export function getBaseUrl(_requestHeaders?: Headers): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    return normalizeOrigin(appUrl)
  }

  // In Vercel production/preview, fall back to VERCEL_URL.
  if (process.env.VERCEL_URL) {
    return normalizeOrigin(`https://${process.env.VERCEL_URL}`)
  }

  // Final fallback for local development only.
  return 'http://localhost:3000'
}
