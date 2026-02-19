import { describe, expect, it } from 'vitest'
import { getTrustedClientIpFromHeaders } from '@/lib/security/client-ip'

function createHeaders(values: Record<string, string>): Headers {
  return new Headers(values)
}

describe('getTrustedClientIpFromHeaders', () => {
  it('prefers trusted provider headers over forwarded chains', () => {
    const headers = createHeaders({
      'x-forwarded-for': '203.0.113.10, 10.0.0.1',
      'x-vercel-forwarded-for': '198.51.100.7',
    })

    const ip = getTrustedClientIpFromHeaders(headers, { fallbackIp: null })

    expect(ip).toBe('198.51.100.7')
  })

  it('rejects ambiguous x-forwarded-for chains', () => {
    const headers = createHeaders({
      'x-forwarded-for': '203.0.113.10, 10.0.0.1',
    })

    const ip = getTrustedClientIpFromHeaders(headers, { fallbackIp: null })

    expect(ip).toBeNull()
  })

  it('returns fallback when no trusted ip can be parsed', () => {
    const headers = createHeaders({
      'x-forwarded-for': 'unknown',
    })

    const ip = getTrustedClientIpFromHeaders(headers, { fallbackIp: '127.0.0.1' })

    expect(ip).toBe('127.0.0.1')
  })
})
