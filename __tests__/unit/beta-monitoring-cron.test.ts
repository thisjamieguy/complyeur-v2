import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createAdminClientMock, sendOperationalAlertEmailMock } = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  sendOperationalAlertEmailMock: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/lib/services/email-service', () => ({
  sendOperationalAlertEmail: sendOperationalAlertEmailMock,
}))

function makeCountQuery(count: number, error: Error | null = null) {
  const response = { count, error }
  const chain = {
    eq: vi.fn(() => chain),
    gte: vi.fn().mockResolvedValue(response),
    lt: vi.fn().mockResolvedValue(response),
  }

  return {
    select: vi.fn(() => chain),
  }
}

function makeAdminClient(counts: {
  companies: number
  profiles: number
  failedWebhooks?: number
  staleWebhooks?: number
  error?: Error | null
}) {
  const failedWebhookQuery = makeCountQuery(counts.failedWebhooks ?? 0, counts.error ?? null)
  const staleWebhookQuery = makeCountQuery(counts.staleWebhooks ?? 0)
  const stripeQueries = [failedWebhookQuery, staleWebhookQuery]

  return {
    from: vi.fn((table: string) => {
      switch (table) {
        case 'companies':
          return makeCountQuery(counts.companies, counts.error ?? null)
        case 'profiles':
          return makeCountQuery(counts.profiles)
        case 'stripe_webhook_events':
          return stripeQueries.shift() ?? makeCountQuery(0)
        default:
          throw new Error(`Unexpected table: ${table}`)
      }
    }),
  }
}

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/cron/beta-monitoring', {
    method: 'GET',
    headers: {
      authorization: 'Bearer cron-secret',
    },
  })
}

describe('/api/cron/beta-monitoring route', () => {
  beforeEach(() => {
    vi.resetModules()
    createAdminClientMock.mockReset()
    sendOperationalAlertEmailMock.mockReset()
    process.env.CRON_SECRET = 'cron-secret'
    process.env.NEXT_PUBLIC_APP_URL = 'https://complyeur.com'
    delete process.env.ZERO_SIGNUP_ALERT_WINDOW_HOURS
    delete process.env.ZERO_SIGNUP_ALERT_RECIPIENT
  })

  it('sends an operational alert when no companies signed up in the window', async () => {
    createAdminClientMock.mockReturnValue(makeAdminClient({ companies: 0, profiles: 2 }))
    sendOperationalAlertEmailMock.mockResolvedValue({ success: true, messageId: 'email-1' })

    const { GET } = await import('@/app/api/cron/beta-monitoring/route')
    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.results.zeroSignupAlert).toBe(true)
    expect(body.results.zeroSignupAlertSent).toBe(true)
    expect(sendOperationalAlertEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'support@complyeur.com',
        subject: '[ComplyEur beta] No new signups in the last 24 hours',
        severity: 'warning',
      })
    )
  })

  it('does not send an alert when at least one company signed up', async () => {
    createAdminClientMock.mockReturnValue(makeAdminClient({ companies: 1, profiles: 1 }))

    const { GET } = await import('@/app/api/cron/beta-monitoring/route')
    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results.zeroSignupAlert).toBe(false)
    expect(body.results.zeroSignupAlertSent).toBe(false)
    expect(body.results.webhookAlert).toBe(false)
    expect(sendOperationalAlertEmailMock).not.toHaveBeenCalled()
  })

  it('sends an operational alert when Stripe webhooks have failed or stalled', async () => {
    createAdminClientMock.mockReturnValue(
      makeAdminClient({
        companies: 1,
        profiles: 1,
        failedWebhooks: 2,
        staleWebhooks: 1,
      })
    )
    sendOperationalAlertEmailMock.mockResolvedValue({ success: true, messageId: 'email-1' })

    const { GET } = await import('@/app/api/cron/beta-monitoring/route')
    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results.failedWebhooks).toBe(2)
    expect(body.results.staleProcessingWebhooks).toBe(1)
    expect(body.results.webhookAlert).toBe(true)
    expect(body.results.webhookAlertSent).toBe(true)
    expect(sendOperationalAlertEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'support@complyeur.com',
        subject: '[ComplyEur beta] Stripe webhook failures need review',
        severity: 'critical',
      })
    )
  })

  it('fails closed without the cron secret', async () => {
    delete process.env.CRON_SECRET

    const { GET } = await import('@/app/api/cron/beta-monitoring/route')
    const response = await GET(makeRequest())

    expect(response.status).toBe(401)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(sendOperationalAlertEmailMock).not.toHaveBeenCalled()
  })

  it('returns a 500 when signup activity cannot be queried', async () => {
    createAdminClientMock.mockReturnValue(
      makeAdminClient({ companies: 0, profiles: 0, error: new Error('db unavailable') })
    )

    const { GET } = await import('@/app/api/cron/beta-monitoring/route')
    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(sendOperationalAlertEmailMock).not.toHaveBeenCalled()
  })
})
