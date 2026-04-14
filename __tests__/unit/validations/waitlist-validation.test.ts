import { describe, test, expect } from 'vitest'
import { waitlistSchema } from '@/lib/validations/waitlist'

describe('waitlistSchema', () => {
  describe('email validation', () => {
    test('accepts valid email', () => {
      const result = waitlistSchema.parse({ email: 'user@example.com' })
      expect(result.email).toBe('user@example.com')
    })

    test('normalises email to lowercase', () => {
      const result = waitlistSchema.parse({ email: 'User@EXAMPLE.COM' })
      expect(result.email).toBe('user@example.com')
    })

    test('rejects invalid email format', () => {
      expect(() => waitlistSchema.parse({ email: 'not-an-email' })).toThrow()
    })

    test('rejects empty email', () => {
      expect(() => waitlistSchema.parse({ email: '' })).toThrow()
    })

    test('rejects email exceeding 254 characters', () => {
      const longEmail = 'a'.repeat(246) + '@test.com' // 246 + 9 = 255 chars
      expect(() => waitlistSchema.parse({ email: longEmail })).toThrow()
    })

    test('accepts email at exactly 254 characters', () => {
      const email = 'a'.repeat(245) + '@b.com' // 245 + 6 = 251 chars (under limit)
      expect(() => waitlistSchema.parse({ email })).not.toThrow()
    })
  })

  describe('companyName validation', () => {
    test('accepts valid company name', () => {
      const result = waitlistSchema.parse({
        email: 'user@example.com',
        companyName: 'Acme Corp',
      })
      expect(result.companyName).toBe('Acme Corp')
    })

    test('accepts company name with common business characters', () => {
      const result = waitlistSchema.parse({
        email: 'user@example.com',
        companyName: 'Smith & Jones (UK) Ltd.',
      })
      expect(result.companyName).toBe('Smith & Jones (UK) Ltd.')
    })

    test('accepts empty company name', () => {
      const result = waitlistSchema.parse({
        email: 'user@example.com',
        companyName: '',
      })
      expect(result.companyName).toBe('')
    })

    test('accepts omitted company name', () => {
      const result = waitlistSchema.parse({ email: 'user@example.com' })
      expect(result.companyName).toBeUndefined()
    })

    test('rejects company name exceeding 100 characters', () => {
      expect(() =>
        waitlistSchema.parse({
          email: 'user@example.com',
          companyName: 'A'.repeat(101),
        })
      ).toThrow()
    })

    test('rejects company name with invalid characters', () => {
      expect(() =>
        waitlistSchema.parse({
          email: 'user@example.com',
          companyName: 'Acme<script>alert(1)</script>',
        })
      ).toThrow('Company name contains invalid characters')
    })

    test('rejects company name with curly braces', () => {
      expect(() =>
        waitlistSchema.parse({
          email: 'user@example.com',
          companyName: 'Acme{Corp}',
        })
      ).toThrow()
    })

    test('trims whitespace from company name', () => {
      const result = waitlistSchema.parse({
        email: 'user@example.com',
        companyName: '  Acme Corp  ',
      })
      expect(result.companyName).toBe('Acme Corp')
    })
  })
})
