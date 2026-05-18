import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/authorization', () => ({
  requireAdminAccess: vi.fn(),
}))

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: vi.fn(),
}))

describe('generateDsarExport auth boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers before any employee query runs', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { requireAdminAccess } = await import('@/lib/security/authorization')

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
    vi.mocked(requireAdminAccess).mockResolvedValue({
      allowed: false,
      status: 401,
      error: 'Unauthorized',
    })

    const { generateDsarExport } = await import('@/lib/gdpr/dsar-export')
    const result = await generateDsarExport('employee-1')

    expect(result).toEqual({
      success: false,
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects cross-tenant DSAR export attempts for swapped employee IDs without leaking export data', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { requireAdminAccess } = await import('@/lib/security/authorization')
    const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

    const employeeQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'employee-cross-tenant',
              company_id: 'company-2',
              name: 'Other Tenant Employee',
            },
            error: null,
          }),
        })),
      })),
    }

    const companyQuery = {
      select: vi.fn(),
    }

    const from = vi.fn((table: string) => {
      if (table === 'employees') return employeeQuery
      if (table === 'companies') return companyQuery
      throw new Error(`Unexpected table query: ${table}`)
    })

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(),
      },
      from,
    } as never)

    vi.mocked(requireAdminAccess).mockResolvedValue({
      allowed: true,
      user: { id: 'user-1', email: 'admin@complyeur.test' },
      profile: { company_id: 'company-1', role: 'admin', is_superadmin: false },
    })

    vi.mocked(requireCompanyAccess).mockRejectedValue(new Error('Forbidden'))

    const { generateDsarExport } = await import('@/lib/gdpr/dsar-export')
    const result = await generateDsarExport('employee-cross-tenant')

    expect(result).toEqual({
      success: false,
      error: 'Forbidden',
      code: 'EXPORT_ERROR',
    })
    expect(requireCompanyAccess).toHaveBeenCalledWith(expect.anything(), 'company-2')
    expect(companyQuery.select).not.toHaveBeenCalled()
    expect(result).not.toHaveProperty('zipBuffer')
  })
})
