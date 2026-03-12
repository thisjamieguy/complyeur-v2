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

describe('middleware public blog route coverage', () => {
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

  it('keeps the blog index reachable without a session', async () => {
    const request = new NextRequest('http://localhost:3000/blog')

    const response = await middleware(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
    expect(checkRateLimitMock).not.toHaveBeenCalled()
    expect(updateSessionMock).not.toHaveBeenCalled()
  })

  it('keeps blog detail pages reachable without a session', async () => {
    const request = new NextRequest('http://localhost:3000/blog/eu-business-travel-guide')

    const response = await middleware(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
    expect(checkRateLimitMock).not.toHaveBeenCalled()
    expect(updateSessionMock).not.toHaveBeenCalled()
  })
})
