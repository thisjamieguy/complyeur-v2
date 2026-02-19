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

import { middleware } from '@/middleware'

describe('middleware /api/health rate limit coverage', () => {
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

  it('applies rate limiting to /api/health requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')

    const response = await middleware(request)

    expect(checkRateLimitMock).toHaveBeenCalledTimes(1)
    expect(updateSessionMock).toHaveBeenCalledTimes(1)
    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
  })
})
