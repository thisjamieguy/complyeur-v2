import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/mfa', () => ({
  enforceMfaForPrivilegedUser: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkServerActionRateLimit: vi.fn(),
}))

vi.mock('@/lib/db/alerts', () => ({
  getCompanySettings: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

function createProfileBuilder(profile: {
  company_id: string | null
  role: string | null
  is_superadmin: boolean | null
}) {
  const single = vi.fn().mockResolvedValue({ data: profile, error: null })
  const eq = vi.fn(() => ({ single }))
  const select = vi.fn(() => ({ eq }))

  return { select }
}

describe('updateCompanySettings security guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects direct privileged mutation calls when MFA is not satisfied', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')
    const { checkServerActionRateLimit } = await import('@/lib/rate-limit')
    const { getCompanySettings } = await import('@/lib/db/alerts')

    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({
      ok: false,
      reason: 'verify',
    })
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: true })

    const update = vi.fn(() => ({
      eq: vi.fn(),
    }))

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return createProfileBuilder({
          company_id: 'company-1',
          role: 'owner',
          is_superadmin: false,
        })
      }

      if (table === 'company_settings') {
        return { update }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@company.com' } },
          error: null,
        }),
      },
      from,
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const { updateCompanySettings } = await import('@/lib/actions/settings')
    const result = await updateCompanySettings({ retention_months: 24 })

    expect(result).toEqual({
      success: false,
      error: 'MFA required. Complete setup or verification to continue.',
    })
    expect(update).not.toHaveBeenCalled()
    expect(getCompanySettings).not.toHaveBeenCalled()
  })

  it('rejects direct privileged mutation calls from users without settings access', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')
    const { checkServerActionRateLimit } = await import('@/lib/rate-limit')

    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({ ok: true })
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: true })

    const update = vi.fn(() => ({
      eq: vi.fn(),
    }))

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return createProfileBuilder({
          company_id: 'company-1',
          role: 'viewer',
          is_superadmin: false,
        })
      }

      if (table === 'company_settings') {
        return { update }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-2', email: 'viewer@company.com' } },
          error: null,
        }),
      },
      from,
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const { updateCompanySettings } = await import('@/lib/actions/settings')
    const result = await updateCompanySettings({ retention_months: 24 })

    expect(result).toEqual({
      success: false,
      error: 'Only owners and admins can update settings',
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('returns a rate-limit error for direct privileged mutation calls before settings writes run', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')
    const { checkServerActionRateLimit } = await import('@/lib/rate-limit')
    const { getCompanySettings } = await import('@/lib/db/alerts')

    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({ ok: true })
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({
      allowed: false,
      error: 'Rate limit exceeded',
    })

    const update = vi.fn(() => ({
      eq: vi.fn(),
    }))

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return createProfileBuilder({
          company_id: 'company-1',
          role: 'owner',
          is_superadmin: false,
        })
      }

      if (table === 'company_settings') {
        return { update }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@company.com' } },
          error: null,
        }),
      },
      from,
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const { updateCompanySettings } = await import('@/lib/actions/settings')
    const result = await updateCompanySettings({ retention_months: 24 })

    expect(result).toEqual({
      success: false,
      error: 'Rate limit exceeded',
    })
    expect(update).not.toHaveBeenCalled()
    expect(getCompanySettings).not.toHaveBeenCalled()
  })
})
