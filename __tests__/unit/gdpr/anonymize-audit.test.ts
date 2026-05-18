import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  requireOwnerOrAdminMutationMock,
  requireCompanyAccessMock,
  logGdprActionMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  requireOwnerOrAdminMutationMock: vi.fn(),
  requireCompanyAccessMock: vi.fn(),
  logGdprActionMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/security/authorization', () => ({
  requireOwnerOrAdminMutation: requireOwnerOrAdminMutationMock,
}))

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: requireCompanyAccessMock,
}))

vi.mock('@/lib/gdpr/audit', () => ({
  createEmployeeAuditLabel: vi.fn(() => 'EMP_EMPLOYEE'),
  logGdprAction: logGdprActionMock,
}))

describe('anonymizeEmployee audit minimisation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requireOwnerOrAdminMutationMock.mockResolvedValue({
      allowed: true,
      companyId: 'company-1',
      user: {
        id: 'user-1',
        email: 'admin@complyeur.test',
      },
    })

    requireCompanyAccessMock.mockResolvedValue(undefined)

    createClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        switch (table) {
          case 'employees':
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'employee-1',
                      company_id: 'company-1',
                      name: 'Alice Example',
                      anonymized_at: null,
                      deleted_at: null,
                    },
                    error: null,
                  }),
                })),
              })),
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              })),
            }
          case 'trips':
            return {
              select: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  count: 2,
                  error: null,
                }),
              })),
            }
          default:
            throw new Error(`Unexpected table query: ${table}`)
        }
      }),
    })
  })

  it('does not write raw employee names into audit metadata', async () => {
    const { anonymizeEmployee } = await import('@/lib/gdpr/anonymize')
    const result = await anonymizeEmployee('employee-1', 'GDPR erasure request')

    expect(result.success).toBe(true)
    expect(logGdprActionMock).toHaveBeenCalledTimes(1)

    const [auditEntry] = logGdprActionMock.mock.calls[0]
    expect(auditEntry.details).toMatchObject({
      employee_id: 'employee-1',
      employee_label: 'EMP_EMPLOYEE',
      anonymized_name: 'ANON_EMPLOYEE',
      reason: 'GDPR erasure request',
    })
    expect(auditEntry.details).not.toHaveProperty('original_name')
    expect(JSON.stringify(auditEntry.details)).not.toContain('Alice Example')
  })
})
