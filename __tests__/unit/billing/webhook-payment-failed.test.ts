import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/billing/webhook/route'
import { constructWebhookEvent } from '@/lib/billing/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPaymentFailedEmail } from '@/lib/services/email-service'

vi.mock('@/lib/billing/stripe', () => ({
  constructWebhookEvent: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/services/email-service', () => ({
  sendPaymentFailedEmail: vi.fn(),
}))

function createRequest() {
  return new Request('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': 't_signature',
      'content-type': 'application/json',
    },
    body: '{"id":"evt_payment_failed"}',
  }) as unknown as NextRequest
}

function createPaymentFailedEvent() {
  return {
    id: 'evt_payment_failed',
    type: 'invoice.payment_failed',
    created: Date.parse('2026-06-18T18:00:00.000Z') / 1000,
    data: {
      object: {
        customer: 'cus_123',
        currency: 'gbp',
        amount_due: 4900,
        attempt_count: 2,
        parent: {
          subscription_details: {
            subscription: 'sub_123',
          },
        },
      },
    },
  } as unknown as Stripe.Event
}

function createAdminClientMock() {
  const stripeWebhookEvents = {
    insert: vi.fn(async () => ({ error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    })),
  }

  const companies = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data: { id: 'company_123', name: 'Acme Travel' },
          error: null,
        })),
      })),
    })),
  }

  const profilesChain = {
    eq: vi.fn(() => profilesChain),
    not: vi.fn(async () => ({
      data: [
        { email: 'viewer@company.test', role: 'viewer' },
        { email: 'owner@company.test', role: 'owner' },
      ],
      error: null,
    })),
  }

  const profiles = {
    select: vi.fn(() => profilesChain),
  }

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'stripe_webhook_events':
        return stripeWebhookEvents
      case 'companies':
        return companies
      case 'profiles':
        return profiles
      default:
        throw new Error(`Unexpected table access: ${table}`)
    }
  })

  return { from } as unknown as SupabaseClient
}

describe('/api/billing/webhook invoice.payment_failed', () => {
  const mockedConstructWebhookEvent = vi.mocked(constructWebhookEvent)
  const mockedCreateAdminClient = vi.mocked(createAdminClient)
  const mockedSendPaymentFailedEmail = vi.mocked(sendPaymentFailedEmail)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedCreateAdminClient.mockReturnValue(createAdminClientMock())
    mockedConstructWebhookEvent.mockReturnValue(createPaymentFailedEvent())
    mockedSendPaymentFailedEmail.mockResolvedValue({
      success: true,
      messageId: 'email_123',
    })
  })

  it('prefers the owner profile email when sending payment failed notices', async () => {
    const response = await POST(createRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.received).toBe(true)
    expect(mockedSendPaymentFailedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'owner@company.test',
        companyName: 'Acme Travel',
        attemptCount: 2,
        amountDue: '£49.00',
      })
    )
  })
})
