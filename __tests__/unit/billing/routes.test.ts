import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as checkoutPOST } from '@/app/api/billing/checkout/route'
import { POST as portalPOST } from '@/app/api/billing/portal/route'
import { GET as statusGET } from '@/app/api/billing/status/route'
import { getStripe } from '@/lib/billing/stripe'

const {
  createClientMock,
  createAdminClientMock,
  checkServerActionRateLimitMock,
  getStripeMock,
  enforceMfaForPrivilegedUserMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  checkServerActionRateLimitMock: vi.fn(),
  getStripeMock: vi.fn(),
  enforceMfaForPrivilegedUserMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkServerActionRateLimit: checkServerActionRateLimitMock,
}))

vi.mock('@/lib/billing/stripe', () => ({
  getStripe: getStripeMock,
  STRIPE_API_VERSION: '2026-01-28.clover',
}))

vi.mock('@/lib/security/mfa', () => ({
  enforceMfaForPrivilegedUser: enforceMfaForPrivilegedUserMock,
}))

interface QueryResult<T> {
  data: T | null
  error: unknown
}

interface MockSupabaseOptions {
  user?: { id: string; email?: string | null } | null
  tables?: Record<
    string,
    {
      single?: QueryResult<unknown>
      maybeSingle?: QueryResult<unknown>
    }
  >
}

function createSupabaseMock(options: MockSupabaseOptions = {}) {
  const from = vi.fn((table: string) => {
    const defaultProfilesResult = {
      data: {
        company_id: 'company_123',
        role: 'owner',
        is_superadmin: false,
        status: 'active',
      },
      error: null,
    }
    const tableConfig = options.tables?.[table] ?? (
      table === 'profiles' ? { single: defaultProfilesResult } : {}
    )
    const eq = vi.fn(() => ({
      single: vi.fn(async () => tableConfig.single ?? { data: null, error: null }),
      maybeSingle: vi.fn(async () => tableConfig.maybeSingle ?? { data: null, error: null }),
    }))

    return {
      select: vi.fn(() => ({ eq })),
    }
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user:
            options.user === undefined
              ? { id: 'user_123', email: 'billing@complyeur.test' }
              : options.user,
        },
        error: null,
      }),
    },
    from,
  }
}

describe('billing routes', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    checkServerActionRateLimitMock.mockResolvedValue({ allowed: true })
    enforceMfaForPrivilegedUserMock.mockResolvedValue({ ok: true })
  })

  describe('/api/billing/checkout', () => {
    it('rejects invalid plans before auth or database work', async () => {
      const request = new NextRequest('https://app.test/api/billing/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          planSlug: 'invalid',
          billingInterval: 'monthly',
        }),
      })

      const response = await checkoutPOST(request)
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload.error).toBe('Invalid plan selected.')
      expect(createClientMock).not.toHaveBeenCalled()
    })

    it('returns 429 when checkout is rate limited', async () => {
      const supabase = createSupabaseMock()
      createClientMock.mockResolvedValue(supabase)
      checkServerActionRateLimitMock.mockResolvedValue({
        allowed: false,
        error: 'Too many requests. Please try again later.',
      })

      const request = new NextRequest('https://app.test/api/billing/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          planSlug: 'starter',
          billingInterval: 'monthly',
        }),
      })

      const response = await checkoutPOST(request)
      const payload = await response.json()

      expect(response.status).toBe(429)
      expect(payload.error).toBe('Too many requests. Please try again later.')
      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('rejects checkout for users without billing management permission', async () => {
      const supabase = createSupabaseMock({
        tables: {
          profiles: {
            single: {
              data: {
                company_id: 'company_123',
                role: 'viewer',
                is_superadmin: false,
                status: 'active',
              },
              error: null,
            },
          },
        },
      })
      createClientMock.mockResolvedValue(supabase)

      const request = new NextRequest('https://app.test/api/billing/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          planSlug: 'starter',
          billingInterval: 'monthly',
        }),
      })

      const response = await checkoutPOST(request)
      const payload = await response.json()

      expect(response.status).toBe(403)
      expect(payload.error).toBe('Forbidden')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('creates a Stripe checkout session with the expected payload', async () => {
      const supabase = createSupabaseMock({
        tables: {
          profiles: {
            single: {
              data: { company_id: 'company_123', role: 'owner', is_superadmin: false, status: 'active' },
              error: null,
            },
          },
          tiers: {
            maybeSingle: {
              data: {
                slug: 'starter',
                is_active: true,
                stripe_price_id_monthly: 'price_monthly_123',
                stripe_price_id_annual: 'price_annual_123',
                max_employees: 50,
                max_users: 5,
                can_export_csv: true,
                can_export_pdf: true,
                can_forecast: true,
                can_calendar: true,
                can_bulk_import: true,
                can_api_access: false,
                can_sso: false,
                can_audit_logs: false,
              },
              error: null,
            },
          },
          companies: {
            maybeSingle: {
              data: { stripe_customer_id: null },
              error: null,
            },
          },
        },
      })

      createClientMock.mockResolvedValue(supabase)
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          url: 'https://checkout.stripe.test/session/cs_test_123',
        }),
      })
      process.env.STRIPE_SECRET_KEY = 'sk_test_checkout_route'

      const request = new NextRequest('https://app.test/api/billing/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          planSlug: 'starter',
          billingInterval: 'monthly',
        }),
      })

      const response = await checkoutPOST(request)
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.url).toBe('https://checkout.stripe.test/session/cs_test_123')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/checkout/sessions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk_test_checkout_route',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Stripe-Version': '2026-01-28.clover',
          }),
          cache: 'no-store',
        })
      )

      const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
      const body = new URLSearchParams(String(requestInit.body))
      const successUrl = new URL(String(body.get('success_url')))
      const cancelUrl = new URL(String(body.get('cancel_url')))

      expect(body.get('mode')).toBe('subscription')
      expect(body.get('line_items[0][price]')).toBe('price_monthly_123')
      expect(body.get('line_items[0][quantity]')).toBe('1')
      expect(body.get('allow_promotion_codes')).toBe('true')
      expect(body.get('metadata[plan_slug]')).toBe('starter')
      expect(body.get('metadata[billing_interval]')).toBe('monthly')
      expect(body.get('metadata[source]')).toBe('pricing')
      expect(body.get('metadata[company_id]')).toBe('company_123')
      expect(body.get('metadata[user_id]')).toBe('user_123')
      expect(body.get('client_reference_id')).toBe('user_123')
      expect(body.get('customer_email')).toBe('billing@complyeur.test')

      expect(successUrl.pathname).toBe('/pricing')
      expect(successUrl.searchParams.get('checkout')).toBe('success')
      expect(successUrl.searchParams.get('session_id')).toBe('{CHECKOUT_SESSION_ID}')

      expect(cancelUrl.pathname).toBe('/pricing')
      expect(cancelUrl.searchParams.get('checkout')).toBe('cancelled')
    })

    it('surfaces invalid promo codes and skips checkout session creation', async () => {
      const supabase = createSupabaseMock({
        tables: {
          profiles: {
            single: {
              data: { company_id: 'company_123', role: 'owner', is_superadmin: false, status: 'active' },
              error: null,
            },
          },
          tiers: {
            maybeSingle: {
              data: {
                slug: 'starter',
                is_active: true,
                stripe_price_id_monthly: 'price_monthly_123',
                stripe_price_id_annual: 'price_annual_123',
                max_employees: 50,
                max_users: 5,
                can_export_csv: true,
                can_export_pdf: true,
                can_forecast: true,
                can_calendar: true,
                can_bulk_import: true,
                can_api_access: false,
                can_sso: false,
                can_audit_logs: false,
              },
              error: null,
            },
          },
        },
      })

      createClientMock.mockResolvedValue(supabase)
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [],
        }),
      })
      process.env.STRIPE_SECRET_KEY = 'sk_test_checkout_route'

      const request = new NextRequest('https://app.test/api/billing/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          planSlug: 'starter',
          billingInterval: 'monthly',
          promotionCode: 'SPRING50',
        }),
      })

      const response = await checkoutPOST(request)
      const payload = await response.json()

      expect(response.status).toBe(400)
      expect(payload.error).toBe('That code is invalid or no longer active.')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/v1/promotion_codes')
    })
  })

  describe('/api/billing/portal', () => {
    it('returns 404 when the company has no Stripe customer yet', async () => {
      const supabase = createSupabaseMock({
        tables: {
          profiles: {
            single: {
              data: { company_id: 'company_123', role: 'owner', is_superadmin: false, status: 'active' },
              error: null,
            },
          },
          companies: {
            single: {
              data: { stripe_customer_id: null },
              error: null,
            },
          },
        },
      })

      createClientMock.mockResolvedValue(supabase)

      const response = await portalPOST(
        new NextRequest('https://app.test/api/billing/portal', {
          method: 'POST',
        })
      )
      const payload = await response.json()

      expect(response.status).toBe(404)
      expect(payload.error).toBe(
        'No billing account found. Please subscribe to a plan first.'
      )
      expect(getStripe).not.toHaveBeenCalled()
    })

    it('creates a Stripe billing portal session for the current company', async () => {
      const supabase = createSupabaseMock({
        tables: {
          profiles: {
            single: {
              data: { company_id: 'company_123', role: 'owner', is_superadmin: false, status: 'active' },
              error: null,
            },
          },
          companies: {
            single: {
              data: { stripe_customer_id: 'cus_123' },
              error: null,
            },
          },
        },
      })
      const createPortalSessionMock = vi.fn().mockResolvedValue({
        url: 'https://billing.stripe.test/session/bps_123',
      })

      createClientMock.mockResolvedValue(supabase)
      getStripeMock.mockReturnValue({
        billingPortal: {
          sessions: {
            create: createPortalSessionMock,
          },
        },
      })

      const response = await portalPOST(
        new NextRequest('https://app.test/api/billing/portal', {
          method: 'POST',
        })
      )
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.url).toBe('https://billing.stripe.test/session/bps_123')
      expect(createPortalSessionMock).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://app.test/settings?section=general',
      })
    })
  })

  describe('/api/billing/status', () => {
    it('returns a paid status payload with no-store caching disabled', async () => {
      const supabase = createSupabaseMock({
        tables: {
          profiles: {
            single: {
              data: { company_id: 'company_123' },
              error: null,
            },
          },
          company_entitlements: {
            maybeSingle: {
              data: {
                subscription_status: 'active',
                tier_slug: 'starter',
                is_trial: false,
                trial_ends_at: null,
                updated_at: '2026-05-11T09:30:00.000Z',
              },
              error: null,
            },
          },
        },
      })

      createClientMock.mockResolvedValue(supabase)

      const response = await statusGET()
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(payload).toEqual({
        subscriptionStatus: 'active',
        tierSlug: 'starter',
        isTrial: false,
        trialEndsAt: null,
        updatedAt: '2026-05-11T09:30:00.000Z',
        isPaid: true,
      })
    })

    it('returns a non-paid payload when the subscription is past due', async () => {
      const supabase = createSupabaseMock({
        tables: {
          profiles: {
            single: {
              data: { company_id: 'company_123' },
              error: null,
            },
          },
          company_entitlements: {
            maybeSingle: {
              data: {
                subscription_status: 'past_due',
                tier_slug: 'starter',
                is_trial: false,
                trial_ends_at: null,
                updated_at: '2026-05-11T09:30:00.000Z',
              },
              error: null,
            },
          },
        },
      })

      createClientMock.mockResolvedValue(supabase)

      const response = await statusGET()
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.isPaid).toBe(false)
      expect(payload.subscriptionStatus).toBe('past_due')
    })
  })
})
