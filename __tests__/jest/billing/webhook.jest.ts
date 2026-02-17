import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { POST } from '@/app/api/billing/webhook/route'
import { constructWebhookEvent } from '@/lib/billing/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/billing/stripe', () => ({
  constructWebhookEvent: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

type EventStatus = 'processed' | 'processing' | 'failed'

function createWebhookEventMock(eventStatus?: EventStatus) {
  const insert = jest.fn().mockResolvedValue({
    error: eventStatus ? { code: '23505', message: 'duplicate key value' } : null,
  })

  const maybeSingle = jest.fn().mockResolvedValue({
    data: eventStatus ? { processing_status: eventStatus } : null,
    error: null,
  })
  const selectEq = jest.fn().mockReturnValue({ maybeSingle })
  const select = jest.fn().mockReturnValue({ eq: selectEq })

  const updateEq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn().mockReturnValue({ eq: updateEq })

  const from = jest.fn().mockReturnValue({
    insert,
    select,
    update,
  })

  return {
    client: { from } as unknown as SupabaseClient,
    insert,
    update,
  }
}

function createStripeEvent(type: string) {
  return {
    id: 'evt_test_123',
    type,
    data: { object: {} },
  } as unknown as Stripe.Event
}

describe('/api/billing/webhook', () => {
  const mockedConstructWebhookEvent = jest.mocked(constructWebhookEvent)
  const mockedCreateAdminClient = jest.mocked(createAdminClient)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects requests with missing stripe-signature header', async () => {
    const request = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      body: '{}',
    }) as unknown as NextRequest

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('stripe-signature')
  })

  it('validates signature and marks processed events in the DB log', async () => {
    const admin = createWebhookEventMock()
    mockedCreateAdminClient.mockReturnValue(admin.client)
    mockedConstructWebhookEvent.mockReturnValue(createStripeEvent('charge.succeeded'))

    const request = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 't_signature',
        'content-type': 'application/json',
      },
      body: '{"id":"evt_test_123"}',
    }) as unknown as NextRequest

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.received).toBe(true)
    expect(admin.insert).toHaveBeenCalled()
    expect(admin.update).toHaveBeenCalledWith(
      expect.objectContaining({ processing_status: 'processed' })
    )
  })

  it('is idempotent for duplicate processed events', async () => {
    const admin = createWebhookEventMock('processed')
    mockedCreateAdminClient.mockReturnValue(admin.client)
    mockedConstructWebhookEvent.mockReturnValue(createStripeEvent('charge.succeeded'))

    const request = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 't_signature',
        'content-type': 'application/json',
      },
      body: '{"id":"evt_test_123"}',
    }) as unknown as NextRequest

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.received).toBe(true)
    expect(payload.duplicate).toBe(true)
    expect(admin.update).not.toHaveBeenCalled()
  })
})
