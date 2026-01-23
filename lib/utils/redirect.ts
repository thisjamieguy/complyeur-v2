// lib/utils/redirect.ts

/**
 * Validates the redirect URL to prevent open redirect attacks.
 * Only allows relative paths starting with /
 */
export function validateRedirectUrl(next: string | null | undefined): string {
  // Default destination
  const defaultRedirect = '/dashboard'

  if (!next) return defaultRedirect

  // Must start with / (relative path) to prevent open redirects
  if (!next.startsWith('/')) return defaultRedirect

  // Disallow protocol-relative URLs //
  if (next.startsWith('//')) return defaultRedirect

  // Disallow absolute URLs
  if (next.includes('://')) return defaultRedirect

  // The URL is a safe, relative path
  return next
}
