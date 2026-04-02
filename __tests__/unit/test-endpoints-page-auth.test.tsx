import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/admin/auth', () => ({
  requireSuperAdmin: vi.fn(),
}))

vi.mock('@/components/testing/test-endpoints-page', () => ({
  TestEndpointsPage: () => <div data-testid="test-endpoints-page" />,
}))

describe('Test endpoints page access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires superadmin access before rendering the diagnostics page', async () => {
    const { requireSuperAdmin } = await import('@/lib/admin/auth')
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      user: { id: 'user-1', email: 'admin@example.com' },
      profile: { is_superadmin: true, full_name: 'Admin User' },
    } as never)

    const TestEndpointsRoute = (await import('@/app/(dashboard)/test-endpoints/page')).default
    const tree = await TestEndpointsRoute()

    expect(requireSuperAdmin).toHaveBeenCalledTimes(1)
    expect(tree.type).toBeDefined()
  })
})
