import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import {
  authenticateCronRequest,
  validateCronSecretConfigured,
} from '@/lib/security/cron-auth'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) headers['authorization'] = authHeader
  return new NextRequest('http://localhost:3000/api/cron/billing', { headers })
}

describe('authenticateCronRequest', () => {
  describe('when CRON_SECRET is configured', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'super-secret-value'
      process.env.NODE_ENV = 'test'
    })

    it('authorises a request with the correct Bearer token', () => {
      const result = authenticateCronRequest(makeRequest('Bearer super-secret-value'))
      expect(result.authorized).toBe(true)
    })

    it('rejects a request with a wrong token', () => {
      const result = authenticateCronRequest(makeRequest('Bearer wrong-secret'))
      expect(result.authorized).toBe(false)
      if (!result.authorized) {
        expect(result.status).toBe(401)
      }
    })

    it('rejects a request with no Authorization header', () => {
      const result = authenticateCronRequest(makeRequest())
      expect(result.authorized).toBe(false)
      if (!result.authorized) {
        expect(result.status).toBe(401)
      }
    })

    it('rejects a non-Bearer Authorization scheme', () => {
      const result = authenticateCronRequest(makeRequest('Basic super-secret-value'))
      expect(result.authorized).toBe(false)
      if (!result.authorized) {
        expect(result.status).toBe(401)
      }
    })

    it('rejects an empty Bearer token', () => {
      const result = authenticateCronRequest(makeRequest('Bearer '))
      expect(result.authorized).toBe(false)
    })

    it('is case-sensitive — partial match is rejected', () => {
      const result = authenticateCronRequest(makeRequest('Bearer super-secret-valu'))
      expect(result.authorized).toBe(false)
    })
  })

  describe('when CRON_SECRET is absent (dev)', () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET
      process.env.NODE_ENV = 'test'
    })

    it('rejects all requests fail-closed even in dev', () => {
      const result = authenticateCronRequest(makeRequest('Bearer anything'))
      expect(result.authorized).toBe(false)
      if (!result.authorized) {
        expect(result.status).toBe(401)
      }
    })
  })

  describe('when CRON_SECRET is absent in production', () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET
      process.env.NODE_ENV = 'production'
    })

    afterEach(() => {
      process.env.NODE_ENV = 'test'
    })

    it('returns 500 server misconfiguration — never 401 bypass', () => {
      const result = authenticateCronRequest(makeRequest('Bearer anything'))
      expect(result.authorized).toBe(false)
      if (!result.authorized) {
        expect(result.status).toBe(500)
        expect(result.error).toMatch(/misconfiguration/i)
      }
    })
  })
})

describe('validateCronSecretConfigured', () => {
  describe('in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    afterEach(() => {
      process.env.NODE_ENV = 'test'
    })

    it('throws if CRON_SECRET is not set', () => {
      delete process.env.CRON_SECRET
      expect(() => validateCronSecretConfigured()).toThrow(/CRON_SECRET/)
    })

    it('does not throw if CRON_SECRET is set', () => {
      process.env.CRON_SECRET = 'prod-secret'
      expect(() => validateCronSecretConfigured()).not.toThrow()
    })
  })

  describe('outside production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test'
    })

    it('does not throw if CRON_SECRET is missing', () => {
      delete process.env.CRON_SECRET
      expect(() => validateCronSecretConfigured()).not.toThrow()
    })
  })
})
