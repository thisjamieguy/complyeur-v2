/**
 * Verifies that the proxy applies security headers on every response.
 *
 * The full set of headers is declared in next.config.ts (served by Next.js
 * itself at the HTTP level), but the proxy layer also sets CSP on every
 * pass-through.  These tests verify the proxy-level guarantees so regressions
 * are caught before they reach CI.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  checkRateLimitMock,
  updateSessionMock,
  buildContentSecurityPolicyMock,
} = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  updateSessionMock: vi.fn(),
  buildContentSecurityPolicyMock: vi.fn(() => "default-src 'self'; script-src 'self'"),
}))

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: checkRateLimitMock }))
vi.mock('@/lib/supabase/middleware', () => ({ updateSession: updateSessionMock }))
vi.mock('@/lib/security/csp', () => ({
  buildContentSecurityPolicy: buildContentSecurityPolicyMock,
}))

import { proxy } from '@/proxy'

const AUTH_USER = { id: 'user-1', email: 'user@example.com' }

function makeRequest(pathname: string, method = 'GET'): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`, { method })
}

beforeEach(() => {
  checkRateLimitMock.mockReset()
  updateSessionMock.mockReset()
  checkRateLimitMock.mockResolvedValue(null)
  updateSessionMock.mockResolvedValue({
    supabaseResponse: NextResponse.next(),
    user: AUTH_USER,
    needsOnboarding: false,
  })
})

describe('proxy: Content-Security-Policy header', () => {
  it('is present on a marketing page response', async () => {
    const res = await proxy(makeRequest('/'))
    expect(res.headers.get('content-security-policy')).not.toBeNull()
  })

  it('is present on a static asset response', async () => {
    const res = await proxy(makeRequest('/logo.png'))
    expect(res.headers.get('content-security-policy')).not.toBeNull()
  })

  it('is present on a protected API response', async () => {
    const res = await proxy(makeRequest('/api/billing/status'))
    expect(res.headers.get('content-security-policy')).not.toBeNull()
  })

  it('uses the value returned by buildContentSecurityPolicy', async () => {
    const res = await proxy(makeRequest('/'))
    expect(res.headers.get('content-security-policy')).toBe(
      "default-src 'self'; script-src 'self'"
    )
  })
})

describe('proxy: sensitive query param stripping', () => {
  it('strips ?password= from login GET requests', async () => {
    const req = makeRequest('/login?password=secret123')
    const res = await proxy(req)
    expect(res.status).toBe(302)
    const location = res.headers.get('location') ?? ''
    expect(location).not.toContain('password')
  })

  it('strips ?confirmPassword= from signup GET requests', async () => {
    const req = makeRequest('/signup?confirmPassword=s3cr3t')
    const res = await proxy(req)
    expect(res.status).toBe(302)
    const location = res.headers.get('location') ?? ''
    expect(location).not.toContain('confirmPassword')
  })

  it('does not redirect login GET without sensitive params', async () => {
    const req = makeRequest('/login?next=%2Fdashboard')
    const res = await proxy(req)
    // Should NOT be a 302 redirect from param stripping (may be 307 from auth redirect)
    expect(res.headers.get('location') ?? '').not.toContain('confirmPassword')
    expect(res.headers.get('location') ?? '').not.toContain('password=')
  })
})

describe('proxy: unauthenticated access', () => {
  beforeEach(() => {
    updateSessionMock.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: null,
      needsOnboarding: false,
    })
  })

  it('redirects unauthenticated users from /dashboard to /landing', async () => {
    const res = await proxy(makeRequest('/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/landing')
  })

  it('redirects unauthenticated users from /calendar to /landing', async () => {
    const res = await proxy(makeRequest('/calendar'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/landing')
  })

  it('redirects unauthenticated users from /settings to /landing', async () => {
    const res = await proxy(makeRequest('/settings'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/landing')
  })

  it('still serves public marketing routes to unauthenticated users', async () => {
    const res = await proxy(makeRequest('/pricing'))
    expect(res.status).not.toBe(307)
  })

  it('still serves /api/health to unauthenticated requests', async () => {
    const res = await proxy(makeRequest('/api/health'))
    // Should not be a 401 — health is a public API route
    expect(res.status).not.toBe(401)
  })
})

describe('proxy: authenticated redirects away from auth pages', () => {
  it('redirects authenticated users from /login to /dashboard', async () => {
    const res = await proxy(makeRequest('/login'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('redirects authenticated users from /signup to /dashboard', async () => {
    const res = await proxy(makeRequest('/signup'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
  })
})

describe('proxy: Content-Type on redirects', () => {
  it('sets Content-Type on redirect responses to avoid ZAP warning', async () => {
    updateSessionMock.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: null,
      needsOnboarding: false,
    })
    const res = await proxy(makeRequest('/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('content-type')).toBeTruthy()
  })
})
