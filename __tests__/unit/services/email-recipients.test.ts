import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { getPrimaryCompanyRecipientEmail } from '@/lib/services/email-recipients'

function makeClient(
  rows: Array<{ email: string | null; role: string | null }>,
  error: { message: string } | null = null
): SupabaseClient {
  const chain = {
    eq: vi.fn(() => chain),
    not: vi.fn(async () => ({ data: rows, error })),
  }

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => chain),
    })),
  } as unknown as SupabaseClient
}

describe('getPrimaryCompanyRecipientEmail', () => {
  it('prefers the owner email over lower-priority roles', async () => {
    const client = makeClient([
      { email: 'viewer@company.test', role: 'viewer' },
      { email: ' OWNER@COMPANY.TEST ', role: 'owner' },
      { email: 'admin@company.test', role: 'admin' },
    ])

    const result = await getPrimaryCompanyRecipientEmail(client, 'company-1')

    expect(result).toEqual({ email: 'owner@company.test' })
  })

  it('falls back to admin before manager and viewer', async () => {
    const client = makeClient([
      { email: 'viewer@company.test', role: 'viewer' },
      { email: 'manager@company.test', role: 'manager' },
      { email: 'admin@company.test', role: 'admin' },
    ])

    const result = await getPrimaryCompanyRecipientEmail(client, 'company-1')

    expect(result).toEqual({ email: 'admin@company.test' })
  })

  it('returns null when no usable profile email exists', async () => {
    const client = makeClient([
      { email: null, role: 'owner' },
      { email: 'not-an-email', role: 'admin' },
    ])

    const result = await getPrimaryCompanyRecipientEmail(client, 'company-1')

    expect(result).toEqual({ email: null })
  })

  it('returns the query error message without throwing', async () => {
    const client = makeClient([], { message: 'profiles unavailable' })

    const result = await getPrimaryCompanyRecipientEmail(client, 'company-1')

    expect(result).toEqual({ email: null, error: 'profiles unavailable' })
  })
})
