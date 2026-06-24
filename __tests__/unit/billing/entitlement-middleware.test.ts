import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enforceBillingEntitlements } from '@/lib/billing/entitlement-middleware'
import { createClient } from '@/lib/supabase/server'
import { requireCompanyAccess } from '@/lib/security/tenant-access'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: vi.fn(),
}))

function createSupabaseMock(entitlements: {
  tier_slug: string | null
  subscription_status: string | null
  trial_ends_at: string | null
}) {
  const single = vi.fn(async () => ({
    data: entitlements,
    error: null,
  }))
  const eq = vi.fn(() => ({ single }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))

  return { from }
}

describe('enforceBillingEntitlements', () => {
  const mockedCreateClient = vi.mocked(createClient)
  const mockedRequireCompanyAccess = vi.mocked(requireCompanyAccess)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedRequireCompanyAccess.mockResolvedValue({
      companyId: 'company_123',
      userId: 'user_123',
      role: 'owner',
      isSuperadmin: false,
    })
  })

  it('denies expired trialing entitlements', async () => {
    mockedCreateClient.mockResolvedValue(
      createSupabaseMock({
        tier_slug: 'starter',
        subscription_status: 'trialing',
        trial_ends_at: '2026-01-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof createClient>>
    )

    const request = new Request('http://localhost/dashboard') as unknown as NextRequest
    const result = await enforceBillingEntitlements(request)

    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.response.status).toBe(403)
      const payload = await result.response.json()
      expect(payload.error).toContain('Trial has expired')
    }
  })

  it('allows unexpired trialing entitlements', async () => {
    mockedCreateClient.mockResolvedValue(
      createSupabaseMock({
        tier_slug: 'starter',
        subscription_status: 'trialing',
        trial_ends_at: '2099-01-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof createClient>>
    )

    const request = new Request('http://localhost/dashboard') as unknown as NextRequest
    const result = await enforceBillingEntitlements(request)

    expect(result.allowed).toBe(true)
  })
})
