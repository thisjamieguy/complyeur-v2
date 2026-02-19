import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

function mockUpstashLimitFailure() {
  class MockRedis {
    constructor(_options: unknown) {}
  }

  class MockRatelimit {
    static slidingWindow = vi.fn(() => ({}))
    constructor(_options: unknown) {}
    limit = vi.fn(async () => {
      throw new Error('WRONGPASS invalid username-password pair or user is disabled')
    })
  }

  vi.doMock('@upstash/redis', () => ({
    Redis: MockRedis,
  }))

  vi.doMock('@upstash/ratelimit', () => ({
    Ratelimit: MockRatelimit,
  }))
}

describe('rateLimit fallback behavior', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'stale-token'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unmock('@upstash/redis')
    vi.unmock('@upstash/ratelimit')
    process.env = { ...ORIGINAL_ENV }
  })

  it('fails open in development when Upstash limit check throws', async () => {
    process.env.NODE_ENV = 'development'
    mockUpstashLimitFailure()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { rateLimit } = await import('@/lib/rate-limit')
    const result = await rateLimit('127.0.0.1', 'auth')

    expect(result.success).toBe(true)
    expect(result.limiterUnavailable).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('fails closed in production when Upstash limit check throws', async () => {
    process.env.NODE_ENV = 'production'
    mockUpstashLimitFailure()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { rateLimit } = await import('@/lib/rate-limit')
    const result = await rateLimit('127.0.0.1', 'auth')

    expect(result.success).toBe(false)
    expect(result.limiterUnavailable).toBe(true)
    expect(errorSpy).toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
