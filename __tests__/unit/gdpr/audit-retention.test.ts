import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock, createAdminClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

describe('GDPR audit retention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts a retained audit chain anchored by a purge checkpoint', async () => {
    const auditEntries = [
      {
        id: 'entry-2',
        company_id: 'company-1',
        user_id: 'user-1',
        action: 'SOFT_DELETE',
        entity_type: 'employee',
        entity_id: 'employee-1',
        details: {
          employee_id: 'employee-1',
          employee_label: 'EMP_EMPLOYEE',
        },
        previous_hash: 'purged-hash',
        entry_hash: 'c000000000000000000000000000000000000000000000000000000000000000',
        created_at: '2026-05-01T00:00:00.000Z',
      },
    ]

    createClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'audit_log') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  order: vi.fn().mockResolvedValue({
                    data: auditEntries,
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }

        if (table === 'gdpr_audit_retention_checkpoints') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    chain_start_hash: 'purged-hash',
                    purged_through: '2026-04-30T00:00:00.000Z',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table query: ${table}`)
      }),
    })

    const subtleDigest = vi
      .spyOn(globalThis.crypto.subtle, 'digest')
      .mockResolvedValue(
        Uint8Array.from(
          Array.from({ length: 32 }, (_, index) => (index === 0 ? 0xc0 : 0x00))
        ).buffer
      )

    const { verifyAuditChain } = await import('@/lib/gdpr/audit')
    const result = await verifyAuditChain('company-1')

    expect(result.isValid).toBe(true)
    expect(result.entriesChecked).toBe(1)
    expect(result.issues).toEqual([])

    subtleDigest.mockRestore()
  })

  it('returns a summary for expired GDPR audit log cleanup', async () => {
    createAdminClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            company_id: 'company-1',
            deleted_rows: 3,
            purged_through: '2026-02-01T00:00:00.000Z',
            chain_start_hash: 'hash-3',
          },
        ],
        error: null,
      }),
    })

    const { purgeExpiredGdprAuditLogs } = await import('@/lib/gdpr/audit')
    const result = await purgeExpiredGdprAuditLogs(90)

    expect(result).toEqual({
      companiesAffected: 1,
      totalDeletedRows: 3,
      checkpoints: [
        {
          companyId: 'company-1',
          deletedRows: 3,
          purgedThrough: '2026-02-01T00:00:00.000Z',
          chainStartHash: 'hash-3',
        },
      ],
    })
  })
})
