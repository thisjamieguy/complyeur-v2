import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccessCached: vi.fn(),
}))

vi.mock('@/lib/performance', () => ({
  withDbTiming: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
}))

describe('employee data security filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scopes employee count queries to the authenticated company', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { requireCompanyAccessCached } = await import('@/lib/security/tenant-access')
    const eq = vi.fn().mockReturnThis()
    const is = vi.fn().mockResolvedValue({ count: 7, error: null })

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq,
          is,
        }),
      }),
    } as never)
    vi.mocked(requireCompanyAccessCached).mockResolvedValue({
      userId: 'user-1',
      companyId: 'company-7',
      role: 'owner',
      isSuperadmin: false,
    })

    const { getEmployeeCount } = await import('@/lib/data/employees')
    const count = await getEmployeeCount()

    expect(count).toBe(7)
    expect(eq).toHaveBeenCalledWith('company_id', 'company-7')
  })
})
