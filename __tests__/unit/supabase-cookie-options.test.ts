import { describe, expect, it } from 'vitest'
import { SUPABASE_COOKIE_OPTIONS } from '@/lib/supabase/cookie-options'

describe('Supabase cookie security options', () => {
  it('enforces httpOnly and sameSite=lax for auth cookies', () => {
    expect(SUPABASE_COOKIE_OPTIONS.httpOnly).toBe(true)
    expect(SUPABASE_COOKIE_OPTIONS.sameSite).toBe('lax')
    expect(SUPABASE_COOKIE_OPTIONS.path).toBe('/')
  })
})
