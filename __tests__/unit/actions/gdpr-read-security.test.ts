import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/authorization', () => ({
  requireAdminAccess: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkServerActionRateLimit: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('GDPR read action security guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an empty page payload when owner/admin MFA is required', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { requireAdminAccess } = await import('@/lib/security/authorization')
    const { checkServerActionRateLimit } = await import('@/lib/rate-limit')

    vi.mocked(createClient).mockResolvedValue({ from: vi.fn() } as never)
    vi.mocked(requireAdminAccess).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'MFA required. Complete setup or verification to continue.',
      mfaReason: 'verify',
    })

    const { getGdprPageData } = await import('@/app/(dashboard)/gdpr/actions')
    const result = await getGdprPageData()

    expect(result).toEqual({
      hasAccess: false,
      employees: [],
      deletedEmployees: [],
      auditLog: [],
      retentionStats: null,
    })
    expect(checkServerActionRateLimit).not.toHaveBeenCalled()
  })

  it('does not expose deleted employees when owner/admin MFA is required', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { requireAdminAccess } = await import('@/lib/security/authorization')
    const { checkServerActionRateLimit } = await import('@/lib/rate-limit')

    vi.mocked(createClient).mockResolvedValue({ from: vi.fn() } as never)
    vi.mocked(requireAdminAccess).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'MFA required. Complete setup or verification to continue.',
      mfaReason: 'verify',
    })

    const { getDeletedEmployeesAction } = await import('@/app/(dashboard)/gdpr/actions')
    const result = await getDeletedEmployeesAction()

    expect(result).toEqual([])
    expect(checkServerActionRateLimit).not.toHaveBeenCalled()
  })
})
