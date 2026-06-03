import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  logGdprActionMock,
  notificationUpdateMock,
  employeeDeleteMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  logGdprActionMock: vi.fn(),
  notificationUpdateMock: vi.fn(),
  employeeDeleteMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/gdpr/audit', () => ({
  createEmployeeAuditLabel: vi.fn(() => 'EMP_EMPLOYEE'),
  logGdprAction: logGdprActionMock,
}))

describe('hardDeleteEmployee notification redaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    notificationUpdateMock.mockReturnValue({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      })),
    })

    employeeDeleteMock.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
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
                    },
                    error: null,
                  }),
                })),
              })),
              delete: employeeDeleteMock,
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

  it('scrubs direct notification identifiers before deleting the employee', async () => {
    const { hardDeleteEmployee } = await import('@/lib/gdpr/soft-delete')
    const result = await hardDeleteEmployee('employee-1', 'company-1', false, {
      auditUserId: 'admin-1',
    })

    expect(result).toEqual({
      success: true,
      tripsDeleted: 2,
    })
    expect(notificationUpdateMock).toHaveBeenCalledWith({
      recipient_email: 'redacted-notification-recipient@complyeur.local',
      subject: 'Schengen Compliance Alert for deleted employee',
    })
    expect(employeeDeleteMock).toHaveBeenCalledTimes(1)
    expect(logGdprActionMock.mock.calls[0]?.[0]).toMatchObject({
      companyId: 'company-1',
      userId: 'admin-1',
      action: 'HARD_DELETE',
    })
  })
})
