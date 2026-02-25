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

describe('enrollTotpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes stale unverified TOTP factors before enrolling a new one', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    const unenroll = vi.fn().mockResolvedValue({ error: null })
    const enroll = vi.fn().mockResolvedValue({
      data: {
        id: 'factor-new',
        totp: {
          qr_code: 'data:image/svg+xml;base64,abc',
          secret: 'secret-123',
        },
      },
      error: null,
    })

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: {
              totp: [{ id: 'factor-unverified' }],
              all: [{ id: 'factor-unverified', factor_type: 'totp', status: 'unverified' }],
            },
          }),
          unenroll,
          enroll,
        },
      },
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const { enrollTotpAction } = await import('@/lib/actions/mfa')
    const result = await enrollTotpAction()

    expect(unenroll).toHaveBeenCalledWith({ factorId: 'factor-unverified' })
    expect(enroll).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      success: true,
      factorId: 'factor-new',
      qrCode: 'data:image/svg+xml;base64,abc',
      secret: 'secret-123',
    })
  })
})

describe('unenrollTotpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires an explicit proof code before resetting MFA', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const { unenrollTotpAction } = await import('@/lib/actions/mfa')
    const result = await unenrollTotpAction('totp', '')

    expect(result).toEqual({
      success: false,
      error: 'Enter a verification code to reset MFA',
    })
  })

  it('rejects malformed backup codes for MFA reset', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    const listFactors = vi.fn().mockResolvedValue({
      data: { totp: [{ id: 'factor-1' }], all: [{ id: 'factor-1', factor_type: 'totp' }] },
    })

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
        mfa: {
          listFactors,
        },
      },
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const { unenrollTotpAction } = await import('@/lib/actions/mfa')
    const result = await unenrollTotpAction('backup', 'ABC')

    expect(result).toEqual({
      success: false,
      error: 'Invalid backup code',
    })
  })

  it('requires successful TOTP verification before MFA reset', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    const challengeAndVerify = vi.fn().mockResolvedValue({
      error: { message: 'Invalid code' },
    })
    const unenroll = vi.fn()

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: { totp: [{ id: 'factor-1' }], all: [{ id: 'factor-1', factor_type: 'totp' }] },
          }),
          challengeAndVerify,
          unenroll,
        },
      },
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const { unenrollTotpAction } = await import('@/lib/actions/mfa')
    const result = await unenrollTotpAction('totp', '123456')

    expect(result).toEqual({
      success: false,
      error: 'Invalid code',
    })
    expect(unenroll).not.toHaveBeenCalled()
  })

  it('clears recovery artifacts and unenrolls when TOTP reset proof is valid', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    const deleteBackupCodesEq = vi.fn().mockResolvedValue({ error: null })
    const deleteBackupSessionsEq = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn((table: string) => {
      if (table === 'mfa_backup_codes') {
        return { delete: vi.fn(() => ({ eq: deleteBackupCodesEq })) }
      }
      if (table === 'mfa_backup_sessions') {
        return { delete: vi.fn(() => ({ eq: deleteBackupSessionsEq })) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const challengeAndVerify = vi.fn().mockResolvedValue({ error: null })
    const unenroll = vi.fn().mockResolvedValue({ error: null })

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: { totp: [{ id: 'factor-1' }], all: [{ id: 'factor-1', factor_type: 'totp' }] },
          }),
          challengeAndVerify,
          unenroll,
        },
      },
      from,
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const { unenrollTotpAction } = await import('@/lib/actions/mfa')
    const result = await unenrollTotpAction('totp', '123456')

    expect(result).toEqual({ success: true })
    expect(deleteBackupCodesEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(deleteBackupSessionsEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(unenroll).toHaveBeenCalledWith({ factorId: 'factor-1' })
  })
})
