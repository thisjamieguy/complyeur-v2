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

function createEmployeeSelectQuery(employeeCompanyId: string) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'employee-cross-tenant',
            company_id: employeeCompanyId,
            name: 'Other Tenant Employee',
            anonymized_at: null,
            deleted_at: null,
          },
          error: null,
        }),
      })),
    })),
  }
}

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

  it('rejects cross-tenant anonymization attempts for swapped employee IDs without updating or logging', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { requireOwnerOrAdminMutation } = await import('@/lib/security/authorization')
    const { requireCompanyAccess } = await import('@/lib/security/tenant-access')
    const { logGdprAction } = await import('@/lib/gdpr/audit')

    const employeesQuery = createEmployeeSelectQuery('company-2')
    const tripsQuery = {
      select: vi.fn(),
    }

    const from = vi.fn((table: string) => {
      if (table === 'employees') return employeesQuery
      if (table === 'trips') return tripsQuery
      throw new Error(`Unexpected table query: ${table}`)
    })

    vi.mocked(createClient).mockResolvedValue({ from } as never)
    vi.mocked(requireOwnerOrAdminMutation).mockResolvedValue({
      allowed: true,
      companyId: 'company-1',
      role: 'admin',
      user: { id: 'user-1', email: 'admin@complyeur.test' },
      profile: { company_id: 'company-1', role: 'admin', is_superadmin: false },
    })
    vi.mocked(requireCompanyAccess).mockRejectedValue(new Error('Forbidden'))

    const { anonymizeEmployee } = await import('@/lib/gdpr/anonymize')
    const result = await anonymizeEmployee('employee-cross-tenant', 'security test')

    expect(result).toEqual({
      success: false,
      error: 'Forbidden',
      code: 'DATABASE_ERROR',
    })
    expect(requireCompanyAccess).toHaveBeenCalledWith(expect.anything(), 'company-2')
    expect(tripsQuery.select).not.toHaveBeenCalled()
    expect(vi.mocked(logGdprAction)).not.toHaveBeenCalled()
  })

  it('rejects cross-tenant soft-delete attempts for swapped employee IDs without updating or logging', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { requireOwnerOrAdminMutation } = await import('@/lib/security/authorization')
    const { requireCompanyAccess } = await import('@/lib/security/tenant-access')
    const { logGdprAction } = await import('@/lib/gdpr/audit')

    const employeesQuery = createEmployeeSelectQuery('company-2')
    const tripsQuery = {
      select: vi.fn(),
    }

    const from = vi.fn((table: string) => {
      if (table === 'employees') return employeesQuery
      if (table === 'trips') return tripsQuery
      throw new Error(`Unexpected table query: ${table}`)
    })

    vi.mocked(createClient).mockResolvedValue({ from } as never)
    vi.mocked(requireOwnerOrAdminMutation).mockResolvedValue({
      allowed: true,
      companyId: 'company-1',
      role: 'admin',
      user: { id: 'user-1', email: 'admin@complyeur.test' },
      profile: { company_id: 'company-1', role: 'admin', is_superadmin: false },
    })
    vi.mocked(requireCompanyAccess).mockRejectedValue(new Error('Forbidden'))

    const { softDeleteEmployee } = await import('@/lib/gdpr/soft-delete')
    const result = await softDeleteEmployee('employee-cross-tenant', 'security test')

    expect(result).toEqual({
      success: false,
      error: 'Forbidden',
      code: 'DATABASE_ERROR',
    })
    expect(requireCompanyAccess).toHaveBeenCalledWith(expect.anything(), 'company-2')
    expect(tripsQuery.select).not.toHaveBeenCalled()
    expect(vi.mocked(logGdprAction)).not.toHaveBeenCalled()
  })
})
