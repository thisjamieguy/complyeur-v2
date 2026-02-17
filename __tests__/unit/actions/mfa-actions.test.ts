import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/mfa', () => ({
  getMfaStatusForUser: vi.fn(),
  hashSecret: vi.fn((value: string) => `hashed:${value}`),
  setBackupSessionCookie: vi.fn(),
}))

function createDeleteBuilder() {
  return {
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
}

function createInsertBuilder() {
  return {
    insert: vi.fn().mockResolvedValue({ error: null }),
  }
}

describe('generateBackupCodesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks generation when user is not currently MFA-verified', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { getMfaStatusForUser } = await import('@/lib/security/mfa')

    const from = vi.fn()
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from,
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(getMfaStatusForUser).mockResolvedValue({
      currentLevel: 'aal1',
      nextLevel: 'aal2',
      hasVerifiedFactor: true,
      backupSessionValid: false,
    })

    const { generateBackupCodesAction } = await import('@/lib/actions/mfa')
    const result = await generateBackupCodesAction()

    expect(result).toEqual({
      success: false,
      error: 'Verify MFA before generating backup codes',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('generates backup codes when current session is aal2', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { getMfaStatusForUser } = await import('@/lib/security/mfa')

    const deleteBuilder = createDeleteBuilder()
    const insertBuilder = createInsertBuilder()

    const from = vi.fn((table: string) => {
      if (table !== 'mfa_backup_codes') {
        throw new Error(`Unexpected table: ${table}`)
      }
      if (from.mock.calls.length === 1) return { delete: vi.fn(() => deleteBuilder) }
      return insertBuilder
    })

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from,
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(getMfaStatusForUser).mockResolvedValue({
      currentLevel: 'aal2',
      nextLevel: 'aal2',
      hasVerifiedFactor: true,
      backupSessionValid: false,
    })

    const { generateBackupCodesAction } = await import('@/lib/actions/mfa')
    const result = await generateBackupCodesAction()

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Expected success')

    expect(result.codes).toHaveLength(10)
    expect(deleteBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(insertBuilder.insert).toHaveBeenCalledTimes(1)
    const insertedRows = vi.mocked(insertBuilder.insert).mock.calls[0]?.[0]
    expect(Array.isArray(insertedRows)).toBe(true)
    expect(insertedRows).toHaveLength(10)
  })

  it('generates backup codes when backup session is valid', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { getMfaStatusForUser } = await import('@/lib/security/mfa')

    const deleteBuilder = createDeleteBuilder()
    const insertBuilder = createInsertBuilder()

    const from = vi.fn((table: string) => {
      if (table !== 'mfa_backup_codes') {
        throw new Error(`Unexpected table: ${table}`)
      }
      if (from.mock.calls.length === 1) return { delete: vi.fn(() => deleteBuilder) }
      return insertBuilder
    })

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from,
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(getMfaStatusForUser).mockResolvedValue({
      currentLevel: 'aal1',
      nextLevel: 'aal2',
      hasVerifiedFactor: true,
      backupSessionValid: true,
    })

    const { generateBackupCodesAction } = await import('@/lib/actions/mfa')
    const result = await generateBackupCodesAction()

    expect(result.success).toBe(true)
    expect(insertBuilder.insert).toHaveBeenCalledTimes(1)
  })
})
