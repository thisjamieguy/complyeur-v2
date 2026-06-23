import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/billing/webhook/route'
import { constructWebhookEvent } from '@/lib/billing/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

vi.mock('@/lib/billing/stripe', () => ({
  constructWebhookEvent: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/services/email-service', () => ({
  sendPaymentFailedEmail: vi.fn(),
}))

type EventStatus = 'processed' | 'processing' | 'failed'

interface MockWebhookRow {
  stripe_event_id: string
  processing_status: EventStatus
}

interface MockEntitlementRow {
  company_id: string
  tier_slug: string | null
  last_stripe_event_created_at: string | null
}

function createRequest() {
  return new Request('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': 't_signature',
      'content-type': 'application/json',
    },
    body: '{"id":"evt_subscription"}',
  }) as unknown as NextRequest
}

function createSubscriptionEvent(createdAtSeconds: number) {
  return {
    id: 'evt_subscription',
    type: 'customer.subscription.updated',
    created: createdAtSeconds,
    data: {
      object: {
        id: 'sub_test_123',
        status: 'past_due',
        items: {
          data: [
            {
              current_period_end: 1783209600,
              price: null,
            },
          ],
        },
      },
    },
  } as unknown as Stripe.Event
}

function createAdminClientMock(lastStripeEventCreatedAt: string | null) {
  const webhookState: MockWebhookRow = {
    stripe_event_id: 'evt_subscription',
    processing_status: 'processing',
  }
  const entitlementState = {
    row: {
      company_id: 'company_123',
      tier_slug: 'starter',
      last_stripe_event_created_at: lastStripeEventCreatedAt,
    } satisfies MockEntitlementRow,
    updatePayloads: [] as Array<Record<string, unknown>>,
  }
  const webhookUpdates: Array<Record<string, unknown>> = []

  const stripeWebhookTable = {
    insert: vi.fn(async () => ({ error: null })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data: webhookState,
          error: null,
        })),
      })),
    })),
    update: vi.fn((updates: Record<string, unknown>) => ({
      eq: vi.fn(async () => {
        webhookUpdates.push(updates)
        webhookState.processing_status = updates.processing_status as EventStatus
        return { error: null }
      }),
    })),
  }

  const companyEntitlementsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: entitlementState.row,
          error: null,
        })),
      })),
    })),
    update: vi.fn((updates: Record<string, unknown>) => ({
      eq: vi.fn(async () => {
        entitlementState.updatePayloads.push(updates)
        return { error: null }
      }),
    })),
  }

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'stripe_webhook_events':
        return stripeWebhookTable
      case 'company_entitlements':
        return companyEntitlementsTable
      default:
        throw new Error(`Unexpected table access: ${table}`)
    }
  })

  return {
    client: { from } as unknown as SupabaseClient,
    entitlementState,
    webhookUpdates,
  }
}

describe('/api/billing/webhook ordering', () => {
  const mockedConstructWebhookEvent = vi.mocked(constructWebhookEvent)
  const mockedCreateAdminClient = vi.mocked(createAdminClient)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ignores a stale subscription update when a newer Stripe event was already applied', async () => {
    const admin = createAdminClientMock('2026-06-18T12:00:00.000Z')
    mockedCreateAdminClient.mockReturnValue(admin.client)
    mockedConstructWebhookEvent.mockReturnValue(
      createSubscriptionEvent(Date.parse('2026-06-18T11:00:00.000Z') / 1000)
    )

    const response = await POST(createRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.received).toBe(true)
    expect(admin.entitlementState.updatePayloads).toHaveLength(0)
    expect(admin.webhookUpdates).toContainEqual(
      expect.objectContaining({ processing_status: 'processed' })
    )
  })

  it('applies a fresh subscription update and records the latest Stripe event metadata', async () => {
    const admin = createAdminClientMock('2026-06-18T10:00:00.000Z')
    mockedCreateAdminClient.mockReturnValue(admin.client)
    mockedConstructWebhookEvent.mockReturnValue(
      createSubscriptionEvent(Date.parse('2026-06-18T12:00:00.000Z') / 1000)
    )

    const response = await POST(createRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.received).toBe(true)
    expect(admin.entitlementState.updatePayloads).toContainEqual(
      expect.objectContaining({
        subscription_status: 'past_due',
        current_period_end: '2026-07-05T00:00:00.000Z',
        last_stripe_event_id: 'evt_subscription',
        last_stripe_event_type: 'customer.subscription.updated',
        last_stripe_event_created_at: '2026-06-18T12:00:00.000Z',
      })
    )
  })
})
