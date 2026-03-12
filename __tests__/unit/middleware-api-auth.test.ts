import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  checkRateLimitMock,
  updateSessionMock,
  createCspNonceMock,
  buildContentSecurityPolicyMock,
} = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  updateSessionMock: vi.fn(),
  createCspNonceMock: vi.fn(() => 'nonce-test'),
  buildContentSecurityPolicyMock: vi.fn(() => "default-src 'self'"),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
}))

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: updateSessionMock,
}))

vi.mock('@/lib/security/csp', () => ({
  createCspNonce: createCspNonceMock,
  buildContentSecurityPolicy: buildContentSecurityPolicyMock,
}))

import { proxy as middleware } from '@/proxy'

describe('middleware API authentication defaults', () => {
  beforeEach(() => {
    checkRateLimitMock.mockReset()
    updateSessionMock.mockReset()
    createCspNonceMock.mockClear()
    buildContentSecurityPolicyMock.mockClear()

    checkRateLimitMock.mockResolvedValue(null)
    updateSessionMock.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: null,
      needsOnboarding: false,
    })
  })

  it('returns 401 for unauthenticated protected API routes', async () => {
    const request = new NextRequest('http://localhost:3000/api/billing/status')

    const response = await middleware(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
    expect(checkRateLimitMock).toHaveBeenCalledTimes(1)
    expect(updateSessionMock).toHaveBeenCalledTimes(1)
  })

  it('allows authenticated protected API routes without redirecting to onboarding', async () => {
    updateSessionMock.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: { id: 'user-1' },
      needsOnboarding: true,
    })

    const request = new NextRequest('http://localhost:3000/api/billing/status')
    const response = await middleware(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
    expect(updateSessionMock).toHaveBeenCalledTimes(1)
  })

  it('keeps allowlisted public API routes reachable without a session', async () => {
    const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
      method: 'POST',
    })

    const response = await middleware(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(checkRateLimitMock).toHaveBeenCalledTimes(1)
    expect(updateSessionMock).toHaveBeenCalledTimes(1)
  })
})
