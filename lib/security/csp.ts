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
        'https://www.clarity.ms',
      ]
    : [
        "'self'",
        "'unsafe-eval'",
        "'unsafe-inline'",
        'https://*.supabase.co',
        'https://*.vercel-scripts.com',
        'https://cdn-cookieyes.com',
        'https://www.clarity.ms',
      ]

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    // style-src 'unsafe-inline' is required because multiple dependencies set
    // dynamic inline style attributes at runtime that cannot be nonce- or
    // hash-bound:
    //   - @tanstack/react-virtual (dynamic transforms for virtualized rows)
    //   - @radix-ui/react-{popover,dialog,dropdown-menu,select,tooltip,
    //     scroll-area} (floating-element position/transform via inline styles)
    //   - sonner (toast transform/opacity animations)
    //   - cmdk, react-day-picker (positioning)
    //   - CookieYes third-party consent banner (https://cdn-cookieyes.com)
    // CSP style-src nonces only apply to <style> elements, not to style="..."
    // attributes. The only strict alternative is 'unsafe-hashes' with a SHA256
    // per literal inline style value, which is not feasible against libraries
    // that compute style values dynamically per render. Revisit if any of the
    // named libraries publish a nonce-friendly mode.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.supabase.co https://c.clarity.ms",
    "font-src 'self'",
    "object-src 'none'",
    "worker-src 'self'",
    "connect-src 'self' https://*.supabase.co https://*.sentry.io https://cdn-cookieyes.com https://log.cookieyes.com https://www.clarity.ms https://c.clarity.ms",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ]

  return directives.join('; ')
}
