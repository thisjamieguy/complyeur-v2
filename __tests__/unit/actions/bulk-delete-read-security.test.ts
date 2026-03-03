import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkServerActionRateLimit: vi.fn(),
}))

describe('bulk delete read-path security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scopes profile lookup to the authenticated user before loading deletion counts', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { checkServerActionRateLimit } = await import('@/lib/rate-limit')

    const profileEq = vi.fn().mockReturnThis()
    const profileSingle = vi.fn().mockResolvedValue({
      data: { company_id: 'company-1', role: 'owner' },
      error: null,
    })

    const countHead = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ count: 1, error: null }),
      in: vi.fn().mockResolvedValue({ count: 1, error: null }),
    }

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: profileEq,
              single: profileSingle,
            }),
          }
        }

        return {
          select: vi.fn().mockReturnValue(countHead),
        }
      }),
    }

    profileEq.mockReturnValue({ single: profileSingle })

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: true })

    const { getDataCounts } = await import('@/lib/actions/bulk-delete')
    await getDataCounts()

    expect(profileEq).toHaveBeenCalledWith('id', 'user-123')
  })
})
