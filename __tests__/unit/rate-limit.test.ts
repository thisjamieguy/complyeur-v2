import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

function mockUpstashLimitFailure() {
  const limitMock = vi.fn(async () => {
    throw new Error('WRONGPASS invalid username-password pair or user is disabled')
  })

  class MockRedis {
    constructor(_options: unknown) {}
  }

  class MockRatelimit {
    static slidingWindow = vi.fn(() => ({}))
    constructor(_options: unknown) {}
    limit = limitMock
  }

  vi.doMock('@upstash/redis', () => ({
    Redis: MockRedis,
  }))

  vi.doMock('@upstash/ratelimit', () => ({
    Ratelimit: MockRatelimit,
  }))

  return { limitMock }
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
    vi.doUnmock('@upstash/redis')
    vi.doUnmock('@upstash/ratelimit')
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
    expect(result.limit).toBe(10)
    expect(warnSpy).toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('uses local fallback after the first development Upstash failure', async () => {
    process.env.NODE_ENV = 'development'
    const { limitMock } = mockUpstashLimitFailure()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { rateLimit } = await import('@/lib/rate-limit')

    await expect(rateLimit('127.0.0.1', 'auth')).resolves.toMatchObject({
      success: true,
      limit: 10,
    })
    await expect(rateLimit('127.0.0.1', 'auth')).resolves.toMatchObject({
      success: true,
      limit: 10,
    })

    expect(limitMock).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledTimes(1)
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

describe('rateLimit local in-memory fallback', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = { ...ORIGINAL_ENV }
  })

  it('enforces auth rate limit (10/min) without Upstash in development', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const identifier = `auth-local-${Date.now()}`

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const result = await rateLimit(identifier, 'auth')
      expect(result.success).toBe(true)
      expect(result.limit).toBe(10)
    }

    const blocked = await rateLimit(identifier, 'auth')
    expect(blocked.success).toBe(false)
    expect(blocked.limit).toBe(10)
    expect(blocked.remaining).toBe(0)
  })

  it('enforces password reset rate limit (5/hour) without Upstash in development', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const identifier = `reset-local-${Date.now()}`

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await rateLimit(identifier, 'password-reset')
      expect(result.success).toBe(true)
      expect(result.limit).toBe(5)
    }

    const blocked = await rateLimit(identifier, 'password-reset')
    expect(blocked.success).toBe(false)
    expect(blocked.limit).toBe(5)
    expect(blocked.remaining).toBe(0)
  })

  it('allows explicit local E2E fallback in production only for local Supabase', async () => {
    process.env.NODE_ENV = 'production'
    process.env.E2E_ALLOW_LOCAL_RATE_LIMIT_BYPASS = 'true'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { checkServerActionRateLimit, rateLimit } = await import('@/lib/rate-limit')

    await expect(rateLimit('local-e2e', 'api')).resolves.toMatchObject({
      success: true,
      limiterUnavailable: false,
    })
    await expect(
      checkServerActionRateLimit('user-1', 'calendarV2E2E')
    ).resolves.toMatchObject({ allowed: true })
    expect(warnSpy).toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('keeps production fail-closed when the E2E fallback targets remote Supabase', async () => {
    process.env.NODE_ENV = 'production'
    process.env.E2E_ALLOW_LOCAL_RATE_LIMIT_BYPASS = 'true'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { checkServerActionRateLimit, rateLimit } = await import('@/lib/rate-limit')

    await expect(rateLimit('remote-e2e', 'api')).resolves.toMatchObject({
      success: false,
      limiterUnavailable: true,
    })
    await expect(
      checkServerActionRateLimit('user-1', 'calendarV2E2E')
    ).resolves.toMatchObject({
      allowed: false,
      limiterUnavailable: true,
    })
    expect(errorSpy).toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
