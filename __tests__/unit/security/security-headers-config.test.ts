/**
 * Verifies that next.config.ts declares the required security response headers.
 *
 * These are applied by Next.js at the HTTP layer (not the proxy layer), so
 * they can only be tested by inspecting the config object rather than making
 * live requests.  A regression here means headers would be silently dropped
 * from all responses.
 */
import { describe, expect, it, vi } from 'vitest'

// Import the raw next config before Sentry wraps it.
// We test the config object directly, not the Sentry-wrapped version.
import nextConfig from '@/next.config'
import { shouldEnforceHttps } from '@/lib/security/transport-security'

type HeaderEntry = { key: string; value: string }

// Synchronously read headers from the config by calling the async function
async function resolveHeaders(): Promise<HeaderEntry[]> {
  if (!nextConfig.headers) return []
  const rules = await nextConfig.headers()
  // The catch-all rule ('/:path*') is first in the array
  const catchAll = rules.find((r) => r.source === '/:path*')
  return (catchAll?.headers ?? []) as HeaderEntry[]
}

function headerValue(headers: HeaderEntry[], key: string): string | undefined {
  return headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value
}

describe('next.config.ts: security response headers', () => {
  it('does not declare Strict-Transport-Security in the local test config', async () => {
    const headers = await resolveHeaders()
    const hsts = headerValue(headers, 'Strict-Transport-Security')

    expect(hsts).toBeUndefined()
  })

  it('enforces HTTPS for known production HTTPS deployments', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.complyeur.com')

    expect(shouldEnforceHttps()).toBe(true)

    vi.unstubAllEnvs()
  })

  it('does not enforce HTTPS for localhost even in production mode', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(shouldEnforceHttps({
      hostname: 'localhost',
      protocol: 'http:',
    })).toBe(false)

    vi.unstubAllEnvs()
  })

  it('declares X-Content-Type-Options: nosniff', async () => {
    const headers = await resolveHeaders()
    expect(headerValue(headers, 'X-Content-Type-Options')).toBe('nosniff')
  })

  it('declares X-Frame-Options to prevent clickjacking', async () => {
    const headers = await resolveHeaders()
    const xfo = headerValue(headers, 'X-Frame-Options')
    expect(xfo).toBeTruthy()
    expect(['DENY', 'SAMEORIGIN']).toContain(xfo)
  })

  it('declares Referrer-Policy', async () => {
    const headers = await resolveHeaders()
    const rp = headerValue(headers, 'Referrer-Policy')
    expect(rp).toBeTruthy()
    // Must not be unsafe 'unsafe-url'
    expect(rp).not.toBe('unsafe-url')
  })

  it('declares Permissions-Policy that restricts camera, microphone, geolocation', async () => {
    const headers = await resolveHeaders()
    const pp = headerValue(headers, 'Permissions-Policy')
    expect(pp).toBeTruthy()
    expect(pp).toContain('camera=()')
    expect(pp).toContain('microphone=()')
    expect(pp).toContain('geolocation=()')
  })

  it('disables the X-Powered-By header', () => {
    // poweredByHeader: false in nextConfig removes "X-Powered-By: Next.js"
    expect(nextConfig.poweredByHeader).toBe(false)
  })

  it('declares Cross-Origin-Opener-Policy', async () => {
    const headers = await resolveHeaders()
    expect(headerValue(headers, 'Cross-Origin-Opener-Policy')).toBeTruthy()
  })

  it('declares Cross-Origin-Resource-Policy', async () => {
    const headers = await resolveHeaders()
    expect(headerValue(headers, 'Cross-Origin-Resource-Policy')).toBeTruthy()
  })
})
