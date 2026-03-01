import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('generateDsarExport auth boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers before any employee query runs', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    const from = vi.fn()
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
      from,
    } as never)

    const { generateDsarExport } = await import('@/lib/gdpr/dsar-export')
    const result = await generateDsarExport('employee-1')

    expect(result).toEqual({
      success: false,
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
    })
    expect(from).not.toHaveBeenCalled()
  })
})
