import type { NextRequest } from 'next/server'
import { enforceBillingEntitlements } from '@/lib/billing/entitlement-middleware'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCompanyAccess } from '@/lib/security/tenant-access'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: jest.fn(),
}))

function createSupabaseMock(entitlements: {
  tier_slug: string | null
  subscription_status: string | null
}) {
  type ServerClient = Awaited<ReturnType<typeof createClient>>

  const single = jest.fn().mockResolvedValue({
    data: entitlements,
    error: null,
  })

  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  const from = jest.fn().mockReturnValue({ select })

  return {
    from,
  } as unknown as ServerClient
}

describe('enforceBillingEntitlements', () => {
  const mockedCreateClient = jest.mocked(createClient)
  const mockedCreateAdminClient = jest.mocked(createAdminClient)
  const mockedRequireCompanyAccess = jest.mocked(requireCompanyAccess)

  beforeEach(() => {
    jest.clearAllMocks()
    mockedRequireCompanyAccess.mockResolvedValue({
      companyId: 'company_123',
      userId: 'user_123',
      role: 'owner',
      isSuperadmin: false,
    })
  })

  it('returns 403 when subscription status is invalid', async () => {
    mockedCreateClient.mockResolvedValue(
      createSupabaseMock({
        tier_slug: 'starter',
        subscription_status: 'canceled',
      })
    )

    const request = new Request('http://localhost/dashboard') as unknown as NextRequest
    const result = await enforceBillingEntitlements(request)

    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.response.status).toBe(403)
      const payload = await result.response.json()
      expect(payload.error).toContain('Subscription is not active')
    }
  })

  it('redirects to billing portal when plan is not allowed and redirect mode is enabled', async () => {
    mockedCreateClient.mockResolvedValue(
      createSupabaseMock({
        tier_slug: 'starter',
        subscription_status: 'active',
      })
    )

    const request = new Request('http://localhost/dashboard') as unknown as NextRequest
    const result = await enforceBillingEntitlements(request, {
      allowedPlans: ['professional'],
      redirectToPortal: true,
    })

    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.response.status).toBe(307)
      const location = result.response.headers.get('location')
      expect(location).toContain('/api/billing/portal')
    }
  })

  it('returns allowed=true when subscription, plan, and seat limits are valid', async () => {
    mockedCreateClient.mockResolvedValue(
      createSupabaseMock({
        tier_slug: 'starter',
        subscription_status: 'active',
      })
    )
    type AdminClient = ReturnType<typeof createAdminClient>

    mockedCreateAdminClient.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: {
          active_users: 2,
          pending_invites: 1,
          limit: 5,
          available: 2,
        },
        error: null,
      }),
    } as unknown as AdminClient)

    const request = new Request('http://localhost/dashboard') as unknown as NextRequest
    const result = await enforceBillingEntitlements(request, {
      allowedPlans: ['starter', 'professional'],
      requiredAdditionalSeats: 1,
    })

    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.context.companyId).toBe('company_123')
      expect(result.context.subscriptionStatus).toBe('active')
      expect(result.context.seatUsage?.limit).toBe(5)
    }
  })
})
