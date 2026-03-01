import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/authorization', () => ({
  requireOwnerOrAdminMutation: vi.fn(),
}))

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: vi.fn(),
  requireCompanyAccessCached: vi.fn(),
}))

vi.mock('@/lib/gdpr/audit', () => ({
  logGdprAction: vi.fn(),
}))

describe('GDPR destructive action security guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects direct soft-delete calls from non-admin users before any employee query runs', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { requireOwnerOrAdminMutation } = await import('@/lib/security/authorization')

    const from = vi.fn()
    vi.mocked(createClient).mockResolvedValue({ from } as never)
    vi.mocked(requireOwnerOrAdminMutation).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'Forbidden',
    })

    const { softDeleteEmployee } = await import('@/lib/gdpr/soft-delete')
    const result = await softDeleteEmployee('employee-1', 'security test')

    expect(result).toEqual({
      success: false,
      error: 'Only owners and administrators can delete employees',
      code: 'UNAUTHORIZED',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('returns a rate-limit result for direct GDPR destructive calls before any employee query runs', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { requireOwnerOrAdminMutation } = await import('@/lib/security/authorization')

    const from = vi.fn()
    vi.mocked(createClient).mockResolvedValue({ from } as never)
    vi.mocked(requireOwnerOrAdminMutation).mockResolvedValue({
      allowed: false,
      status: 429,
      error: 'Rate limit exceeded',
    })

    const { softDeleteEmployee } = await import('@/lib/gdpr/soft-delete')
    const result = await softDeleteEmployee('employee-1', 'security test')

    expect(result).toEqual({
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects direct anonymization calls from non-admin users before any employee query runs', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { requireOwnerOrAdminMutation } = await import('@/lib/security/authorization')

    const from = vi.fn()
    vi.mocked(createClient).mockResolvedValue({ from } as never)
    vi.mocked(requireOwnerOrAdminMutation).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'Forbidden',
    })

    const { anonymizeEmployee } = await import('@/lib/gdpr/anonymize')
    const result = await anonymizeEmployee('employee-1', 'security test')

    expect(result).toEqual({
      success: false,
      error: 'Only owners and administrators can anonymize employees',
      code: 'UNAUTHORIZED',
    })
    expect(from).not.toHaveBeenCalled()
  })
})
