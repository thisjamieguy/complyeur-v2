import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  createClientMock,
  generateDsarExportMock,
  runRetentionPurgeMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  generateDsarExportMock: vi.fn(),
  runRetentionPurgeMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/gdpr', () => ({
  generateDsarExport: generateDsarExportMock,
  runRetentionPurge: runRetentionPurgeMock,
}))

const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY
const originalCronSecret = process.env.CRON_SECRET

function createUnauthenticatedSupabase() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
    from: vi.fn(),
  }
}

describe('API route auth review coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_api_auth_review'
    delete process.env.CRON_SECRET
  })

  afterAll(() => {
    if (originalStripeSecretKey === undefined) {
      delete process.env.STRIPE_SECRET_KEY
    } else {
      process.env.STRIPE_SECRET_KEY = originalStripeSecretKey
    }

    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = originalCronSecret
    }
  })

  it('returns 401 for direct billing checkout calls without a session', async () => {
    const supabase = createUnauthenticatedSupabase()
    createClientMock.mockResolvedValue(supabase)

    const { POST } = await import('@/app/api/billing/checkout/route')
    const request = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        planSlug: 'free',
        billingInterval: 'monthly',
      }),
      headers: {
        'content-type': 'application/json',
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Please sign in to your account before starting checkout.')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns 401 for direct billing portal calls without a session', async () => {
    const supabase = createUnauthenticatedSupabase()
    createClientMock.mockResolvedValue(supabase)

    const { POST } = await import('@/app/api/billing/portal/route')
    const request = new NextRequest('http://localhost:3000/api/billing/portal', {
      method: 'POST',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Not authenticated')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns 401 for direct billing status calls without a session', async () => {
    const supabase = createUnauthenticatedSupabase()
    createClientMock.mockResolvedValue(supabase)

    const { GET } = await import('@/app/api/billing/status/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Not authenticated')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns 401 for DSAR API requests when the export helper rejects access', async () => {
    generateDsarExportMock.mockResolvedValue({
      success: false,
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
    })

    const { GET } = await import('@/app/api/gdpr/dsar/[employeeId]/route')
    const response = await GET(
      new NextRequest('http://localhost:3000/api/gdpr/dsar/employee-1'),
      { params: Promise.resolve({ employeeId: 'employee-1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
    expect(generateDsarExportMock).toHaveBeenCalledWith('employee-1')
  })

  it('rejects retention cron requests without CRON_SECRET credentials', async () => {
    const { GET } = await import('@/app/api/gdpr/cron/retention/route')
    const request = new NextRequest('http://localhost:3000/api/gdpr/cron/retention')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('CRON_SECRET not configured. Authentication cannot proceed.')
    expect(runRetentionPurgeMock).not.toHaveBeenCalled()
  })

  it('rejects public webhook requests that do not include a Stripe signature', async () => {
    const { POST } = await import('@/app/api/billing/webhook/route')
    const request = new NextRequest('http://localhost:3000/api/billing/webhook', {
      method: 'POST',
      body: '{}',
      headers: {
        'content-type': 'application/json',
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Missing stripe-signature header')
  })
})
