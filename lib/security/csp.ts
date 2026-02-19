export function createCspNonce(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function buildContentSecurityPolicy(nonce: string): string {
  const isProduction = process.env.NODE_ENV === 'production'

  const scriptSrc = isProduction
    ? [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
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
    "connect-src 'self' https://*.supabase.co https://*.sentry.io https://cdn-cookieyes.com https://log.cookieyes.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]

  return directives.join('; ')
}
