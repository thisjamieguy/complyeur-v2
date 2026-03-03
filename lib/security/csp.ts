/**
 * Build the Content Security Policy header value.
 *
 * Note: We use 'unsafe-inline' for script-src because CookieYes (GDPR consent
 * manager) dynamically injects inline scripts at runtime that cannot be
 * nonce-tagged. CookieYes loads in the root layout across all pages. Replacing
 * 'unsafe-inline' with nonce-based CSP would break consent management.
 *
 * Mitigations for the absence of nonces:
 * - Supabase Auth uses HttpOnly cookies (XSS cannot steal session tokens)
 * - RLS enforces tenant isolation at the database level
 * - frame-ancestors 'none' blocks clickjacking
 * - object-src 'none' blocks plugin-based attacks (Flash, Java)
 * - base-uri 'self' prevents base-tag hijacking
 * - upgrade-insecure-requests forces HTTPS in production
 */
export function buildContentSecurityPolicy(): string {
  const isProduction = process.env.NODE_ENV === 'production'

  const scriptSrc = isProduction
    ? [
        "'self'",
        "'unsafe-inline'",
        'https://*.supabase.co',
        'https://*.vercel-scripts.com',
        'https://cdn-cookieyes.com',
      ]
    : [
        "'self'",
        "'unsafe-eval'",
        "'unsafe-inline'",
        'https://*.supabase.co',
        'https://*.vercel-scripts.com',
        'https://cdn-cookieyes.com',
      ]

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.supabase.co",
    "font-src 'self'",
    "object-src 'none'",
    "worker-src 'self'",
    "connect-src 'self' https://*.supabase.co https://*.sentry.io https://cdn-cookieyes.com https://log.cookieyes.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ]

  return directives.join('; ')
}
