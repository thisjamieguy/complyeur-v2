import { describe, expect, it } from 'vitest'
import { getAuthErrorMessage } from '@/lib/errors'

describe('getAuthErrorMessage', () => {
  it('maps Supabase fetch failures to an actionable auth-service message', () => {
    expect(getAuthErrorMessage({ message: 'fetch failed' })).toBe(
      'Authentication service is unavailable. Please check that Supabase is running and try again.'
    )
  })
})
