import { beforeEach, describe, expect, it, vi } from 'vitest'

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/security/mfa', () => ({
  enforceMfaForPrivilegedUser: vi.fn(),
}))

vi.mock('@/lib/billing/entitlements', () => ({
  checkEntitlement: vi.fn(),
}))

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({
    user,
    children,
  }: {
    user: { canAccessAdminPanel: boolean }
    children: React.ReactNode
  }) => (
    <div>
      <span data-testid="admin-flag">{String(user.canAccessAdminPanel)}</span>
      {children}
    </div>
  ),
}))

vi.mock('@/components/data-refresh-handler', () => ({
  DataRefreshHandler: () => <div data-testid="refresh-handler" />,
}))

describe('DashboardLayout admin panel access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows admin access only for persisted superadmins', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')
    const { checkEntitlement } = await import('@/lib/billing/entitlements')
    const DashboardLayout = (await import('@/app/(dashboard)/layout')).default

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'user@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            role: 'owner',
            is_superadmin: false,
            first_name: 'Test',
            last_name: 'User',
          },
          error: null,
        }),
      }),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({ ok: true })
    vi.mocked(checkEntitlement)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)

    const tree = await DashboardLayout({ children: <div>Dashboard Child</div> })

    expect(tree.props.user.canAccessAdminPanel).toBe(false)
    expect(tree.props.children).toBeTruthy()
  })

  it('shows admin access for persisted superadmins', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')
    const { checkEntitlement } = await import('@/lib/billing/entitlements')
    const DashboardLayout = (await import('@/app/(dashboard)/layout')).default

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-2', email: 'superadmin@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            role: 'owner',
            is_superadmin: true,
            first_name: 'Super',
            last_name: 'Admin',
          },
          error: null,
        }),
      }),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({ ok: true })
    vi.mocked(checkEntitlement)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    const tree = await DashboardLayout({ children: <div>Dashboard Child</div> })

    expect(tree.props.user.canAccessAdminPanel).toBe(true)
  })

  it('redirects owner/admin users to MFA when verification is required', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')
    const { checkEntitlement } = await import('@/lib/billing/entitlements')
    const DashboardLayout = (await import('@/app/(dashboard)/layout')).default

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-3', email: 'owner@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            role: 'owner',
            is_superadmin: false,
            first_name: 'Owner',
            last_name: 'User',
          },
          error: null,
        }),
      }),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({
      ok: false,
      reason: 'verify',
    })
    vi.mocked(checkEntitlement)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)

    await expect(DashboardLayout({ children: <div>Dashboard Child</div> })).rejects.toThrow(
      'REDIRECT:/mfa'
    )
    expect(redirectMock).toHaveBeenCalledWith('/mfa')
  })
})
