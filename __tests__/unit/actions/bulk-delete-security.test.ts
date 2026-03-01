import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/security/authorization', () => ({
  requireOwnerOrAdminMutation: vi.fn(),
}))

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: vi.fn(),
}))

vi.mock('@/lib/gdpr/audit', () => ({
  logGdprAction: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('bulk delete security guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects direct bulk delete calls from non-admin users before the service-role client is created', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { requireOwnerOrAdminMutation } = await import('@/lib/security/authorization')

    vi.mocked(createClient).mockResolvedValue({} as never)
    vi.mocked(requireOwnerOrAdminMutation).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'Forbidden',
    })

    const { bulkDeleteData } = await import('@/lib/actions/bulk-delete')
    const result = await bulkDeleteData({
      employeeIds: [],
      tripIds: [],
      mappingIds: [],
      historyIds: [],
    })

    expect(result).toEqual({
      success: false,
      employees: 0,
      trips: 0,
      mappings: 0,
      history: 0,
      errors: ['Owner or admin access required'],
    })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('returns a rate-limit error for direct bulk delete calls before the service-role client is created', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { requireOwnerOrAdminMutation } = await import('@/lib/security/authorization')

    vi.mocked(createClient).mockResolvedValue({} as never)
    vi.mocked(requireOwnerOrAdminMutation).mockResolvedValue({
      allowed: false,
      status: 429,
      error: 'Rate limit exceeded',
    })

    const { bulkDeleteData } = await import('@/lib/actions/bulk-delete')
    const result = await bulkDeleteData({
      employeeIds: [],
      tripIds: [],
      mappingIds: [],
      historyIds: [],
    })

    expect(result).toEqual({
      success: false,
      employees: 0,
      trips: 0,
      mappings: 0,
      history: 0,
      errors: ['Rate limit exceeded'],
    })
    expect(createAdminClient).not.toHaveBeenCalled()
  })
})
