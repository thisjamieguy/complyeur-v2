import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  requireOwnerOrAdminMutationMock,
  requireCompanyAccessMock,
  logGdprActionMock,
  employeeUpdateMock,
  alertUpdateMock,
  notificationUpdateMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  requireOwnerOrAdminMutationMock: vi.fn(),
  requireCompanyAccessMock: vi.fn(),
  logGdprActionMock: vi.fn(),
  employeeUpdateMock: vi.fn(),
  alertUpdateMock: vi.fn(),
  notificationUpdateMock: vi.fn(),
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
    employeeUpdateMock.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    })
    alertUpdateMock.mockReturnValue({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      })),
    })
    notificationUpdateMock.mockReturnValue({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      })),
    })

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
              update: employeeUpdateMock,
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
          case 'alerts':
            return {
              update: alertUpdateMock,
            }
          case 'notification_log':
            return {
              update: notificationUpdateMock,
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
    expect(employeeUpdateMock).toHaveBeenCalledWith({
      name: 'ANON_EMPLOYEE',
      email: null,
      anonymized_at: expect.any(String),
      anonymized_by: 'user-1',
    })
    expect(alertUpdateMock).toHaveBeenCalledWith({
      message: 'Compliance alert for anonymized employee',
    })
    expect(notificationUpdateMock).toHaveBeenCalledWith({
      subject: 'Schengen Compliance Alert for anonymized employee',
    })
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
