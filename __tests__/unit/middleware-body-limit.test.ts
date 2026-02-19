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

describe('middleware body size limits', () => {
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

  it('rejects non-import request bodies above 1MB', async () => {
    const request = new NextRequest('http://localhost:3000/api/health', {
      method: 'POST',
      headers: {
        'content-length': String((1 * 1024 * 1024) + 1),
      },
    })

    const response = await middleware(request)
    const body = await response.json()

    expect(response.status).toBe(413)
    expect(body.error).toBe('Request body too large. Maximum size is 1MB.')
  })

  it('allows import requests up to 10MB cap', async () => {
    const request = new NextRequest('http://localhost:3000/import', {
      method: 'POST',
      headers: {
        'content-length': String(2 * 1024 * 1024),
      },
    })

    const response = await middleware(request)

    expect(response.status).not.toBe(413)
    expect(checkRateLimitMock).not.toHaveBeenCalled()
    expect(updateSessionMock).toHaveBeenCalledTimes(1)
  })

  it('rejects import request bodies above 10MB', async () => {
    const request = new NextRequest('http://localhost:3000/import', {
      method: 'POST',
      headers: {
        'content-length': String((10 * 1024 * 1024) + 1),
      },
    })

    const response = await middleware(request)
    const body = await response.json()

    expect(response.status).toBe(413)
    expect(body.error).toBe('Request body too large. Maximum size is 10MB.')
  })
})
