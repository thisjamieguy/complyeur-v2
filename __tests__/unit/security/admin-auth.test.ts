import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/mfa', () => ({
  enforceMfaForPrivilegedUser: vi.fn(),
}))

describe('requireSuperAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects non-superadmins even when their email might otherwise be allowlisted', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { redirect } = await import('next/navigation')
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'admin@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { is_superadmin: false },
          error: null,
        }),
      }),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({ ok: true })
    vi.mocked(redirect).mockImplementation(((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    }) as never)

    const { requireSuperAdmin } = await import('@/lib/admin/auth')

    await expect(requireSuperAdmin()).rejects.toThrow('REDIRECT:/dashboard')
    expect(enforceMfaForPrivilegedUser).not.toHaveBeenCalled()
  })

  it('allows persisted superadmins and enforces MFA with superadmin context', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-2', email: 'real-superadmin@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { is_superadmin: true },
          error: null,
        }),
      }),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({ ok: true })

    const { requireSuperAdmin } = await import('@/lib/admin/auth')
    const result = await requireSuperAdmin()

    expect(enforceMfaForPrivilegedUser).toHaveBeenCalledWith(
      supabase,
      'user-2',
      expect.objectContaining({
        userEmail: 'real-superadmin@example.com',
        isSuperadmin: true,
      })
    )
    expect(result.profile.is_superadmin).toBe(true)
  })
})
