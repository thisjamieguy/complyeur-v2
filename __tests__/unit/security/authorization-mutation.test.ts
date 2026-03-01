import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/security/mfa', () => ({
  enforceMfaForPrivilegedUser: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkServerActionRateLimit: vi.fn(),
}))

function createSupabase(options?: {
  user?: { id: string; email?: string | null } | null
  authError?: { message: string } | null
  profile?: { company_id: string | null; role: string | null; is_superadmin: boolean | null } | null
}) {
  const {
    user = { id: 'user-1', email: 'owner@company.com' },
    authError = null,
    profile = { company_id: 'company-1', role: 'owner', is_superadmin: false },
  } = options ?? {}

  const single = vi.fn().mockResolvedValue({ data: profile, error: null })
  const eq = vi.fn(() => ({ single, maybeSingle: single }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from,
  }
}

describe('privileged mutation authorization guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks owner/admin mutations when MFA is not satisfied', async () => {
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')
    const { checkServerActionRateLimit } = await import('@/lib/rate-limit')

    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({
      ok: false,
      reason: 'verify',
    })

    const supabase = createSupabase()
    const { requireOwnerOrAdminMutation } = await import('@/lib/security/authorization')
    const result = await requireOwnerOrAdminMutation(supabase as never, 'bulkDeleteData')

    expect(result).toEqual({
      allowed: false,
      status: 403,
      error: 'MFA required. Complete setup or verification to continue.',
      mfaReason: 'verify',
    })
    expect(checkServerActionRateLimit).not.toHaveBeenCalled()
  })

  it('blocks owner/admin mutations when the server-side rate limit fails', async () => {
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')
    const { checkServerActionRateLimit } = await import('@/lib/rate-limit')

    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({ ok: true })
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({
      allowed: false,
      error: 'Rate limit exceeded',
    })

    const supabase = createSupabase()
    const { requireOwnerOrAdminMutation } = await import('@/lib/security/authorization')
    const result = await requireOwnerOrAdminMutation(supabase as never, 'softDeleteEmployee')

    expect(result).toEqual({
      allowed: false,
      status: 429,
      error: 'Rate limit exceeded',
    })
  })

  it('blocks permitted mutations when the server-side rate limit fails', async () => {
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')
    const { checkServerActionRateLimit } = await import('@/lib/rate-limit')

    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({ ok: true })
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({
      allowed: false,
      error: 'Too many requests',
    })

    const supabase = createSupabase({
      profile: { company_id: 'company-1', role: 'manager', is_superadmin: false },
      user: { id: 'user-2', email: 'manager@company.com' },
    })
    const { requireMutationPermission } = await import('@/lib/security/authorization')
    const result = await requireMutationPermission(
      supabase as never,
      'trips.create',
      'bulkAddTripsAction'
    )

    expect(result).toEqual({
      allowed: false,
      status: 429,
      error: 'Too many requests',
    })
  })

  it('returns company-scoped context when auth, MFA, and rate limit checks pass', async () => {
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')
    const { checkServerActionRateLimit } = await import('@/lib/rate-limit')

    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({ ok: true })
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: true })

    const supabase = createSupabase({
      profile: { company_id: 'company-9', role: 'admin', is_superadmin: false },
      user: { id: 'user-9', email: 'admin@company.com' },
    })
    const { requireMutationPermission } = await import('@/lib/security/authorization')
    const result = await requireMutationPermission(
      supabase as never,
      'settings.update',
      'updateCompanySettings'
    )

    expect(result).toEqual({
      allowed: true,
      user: { id: 'user-9', email: 'admin@company.com' },
      profile: {
        company_id: 'company-9',
        role: 'admin',
        is_superadmin: false,
      },
      companyId: 'company-9',
      role: 'admin',
    })
  })
})
