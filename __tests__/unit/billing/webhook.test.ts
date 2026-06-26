import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/billing/webhook/route'
import { constructWebhookEvent, getStripe } from '@/lib/billing/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBillingIncidentEmail } from '@/lib/services/email-service'

vi.mock('@/lib/billing/stripe', () => ({
  constructWebhookEvent: vi.fn(),
  getStripe: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/services/email-service', () => ({
  sendBillingIncidentEmail: vi.fn(async () => ({ success: true, messageId: 'message-1' })),
  sendPaymentFailedEmail: vi.fn(async () => ({ success: true, messageId: 'message-1' })),
}))

type EventStatus = 'processed' | 'processing' | 'failed'

interface MockWebhookRow {
  id: string
  stripe_event_id: string
  processing_status: EventStatus
  processing_started_at: string | null
  processed_at: string | null
  last_error: string | null
  updated_at: string
}

interface MockWebhookEventState {
  row: MockWebhookRow | null
  updatePayloads: Array<Record<string, unknown>>
}

interface CheckoutProvisioningState {
  companyUpdatePayloads: Array<Record<string, unknown>>
  entitlementUpdatePayloads: Array<Record<string, unknown>>
}

class MockUpdateBuilder {
  private idFilter?: string
  private stripeEventIdFilter?: string
  private processingStatusFilter?: EventStatus
  private processingStartedAtLt?: string

  constructor(
    private readonly state: MockWebhookEventState,
    private readonly updates: Record<string, unknown>
  ) {}

  eq(column: string, value: string) {
    if (column === 'id') {
      this.idFilter = value
    }

    if (column === 'stripe_event_id') {
      this.stripeEventIdFilter = value
    }

    if (column === 'processing_status') {
      this.processingStatusFilter = value as EventStatus
    }

    return this
  }

  lt(column: string, value: string) {
    if (column === 'processing_started_at') {
      this.processingStartedAtLt = value
    }

    return this
  }

  async select() {
    return this.apply(true)
  }

  then<TResult1 = { error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.apply(false).then(onfulfilled, onrejected)
  }

  private async apply(returnRows: boolean) {
    const row = this.state.row

    if (!row || !this.matches(row)) {
      return {
        data: returnRows ? [] : null,
        error: null,
      }
    }

    this.state.updatePayloads.push(this.updates)
    this.state.row = {
      ...row,
      ...this.updates,
    }

    return {
      data: returnRows ? [{ id: row.id }] : null,
      error: null,
    }
  }

  private matches(row: MockWebhookRow) {
    if (this.idFilter && row.id !== this.idFilter) {
      return false
    }

    if (this.stripeEventIdFilter && row.stripe_event_id !== this.stripeEventIdFilter) {
      return false
    }

    if (this.processingStatusFilter && row.processing_status !== this.processingStatusFilter) {
      return false
    }

    if (this.processingStartedAtLt) {
      if (!row.processing_started_at) {
        return false
      }

      if (
        Date.parse(row.processing_started_at) >= Date.parse(this.processingStartedAtLt)
      ) {
        return false
      }
    }

    return true
  }
}

function createWebhookEventMock(
  existingRow?: MockWebhookRow | null,
  extraFrom?: (table: string) => unknown
) {
  const state: MockWebhookEventState = {
    row: existingRow ?? null,
    updatePayloads: [],
  }

  const insert = vi.fn(async (payload: Record<string, unknown>) => {
    if (state.row) {
      return {
        error: { code: '23505', message: 'duplicate key value' },
      }
    }

    state.row = {
      id: 'webhook-row-1',
      stripe_event_id: String(payload.stripe_event_id),
      processing_status: payload.processing_status as EventStatus,
      processing_started_at:
        typeof payload.processing_started_at === 'string'
          ? payload.processing_started_at
          : null,
      processed_at: null,
      last_error: null,
      updated_at: String(payload.updated_at),
    }

    return { error: null }
  })

  const maybeSingle = vi.fn(async () => ({
    data: state.row
      ? {
          id: state.row.id,
          processing_status: state.row.processing_status,
          processing_started_at: state.row.processing_started_at,
        }
      : null,
    error: null,
  }))

  const selectEq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq: selectEq })

  const update = vi.fn((updates: Record<string, unknown>) => new MockUpdateBuilder(state, updates))

  const from = vi.fn((table: string) => {
    if (table === 'stripe_webhook_events') {
      return {
        insert,
        select,
        update,
      }
    }

    const extraTable = extraFrom?.(table)
    if (extraTable) {
      return extraTable
    }

    throw new Error(`Unexpected table access in webhook test: ${table}`)
  })

  return {
    client: { from } as unknown as SupabaseClient,
    insert,
    update,
    state,
  }
}

function createStripeEvent(type: string) {
  return {
    id: 'evt_test_123',
    type,
    data: { object: {} },
  } as unknown as Stripe.Event
}

function createCheckoutSessionCompletedEvent() {
  return {
    id: 'evt_test_123',
    type: 'checkout.session.completed',
    created: 1_700_000_000,
    data: {
      object: {
        client_reference_id: 'user-1',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        metadata: {
          company_id: 'company-1',
          plan_slug: 'professional',
          user_id: 'user-1',
        },
      },
    },
  } as unknown as Stripe.Event
}

function createChargeRefundedEvent() {
  return {
    id: 'evt_refund_123',
    type: 'charge.refunded',
    data: {
      object: {
        id: 'ch_refunded_123',
        amount_refunded: 100,
        currency: 'gbp',
        customer: 'cus_test_123',
      },
    },
  } as unknown as Stripe.Event
}

function createDisputeCreatedEvent() {
  return {
    id: 'evt_dispute_123',
    type: 'charge.dispute.created',
    data: {
      object: {
        id: 'dp_test_123',
        amount: 100,
        currency: 'gbp',
        charge: 'ch_disputed_123',
      },
    },
  } as unknown as Stripe.Event
}

function createCheckoutProvisioningTables(state: CheckoutProvisioningState) {
  return (table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(async () => ({
              data: { company_id: 'company-1' },
              error: null,
            })),
          }),
        }),
      }
    }

    if (table === 'companies') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(async () => ({
              data: { stripe_customer_id: null },
              error: null,
            })),
          }),
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          state.companyUpdatePayloads.push(payload)
          return {
            eq: vi.fn().mockReturnValue({
              is: vi.fn(async () => ({ error: null })),
            }),
          }
        }),
      }
    }

    if (table === 'tiers') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(async () => ({
              data: {
                slug: 'professional',
                max_employees: 200,
                max_users: 15,
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
            })),
          }),
        }),
      }
    }

    if (table === 'company_entitlements') {
      return {
        // Stale-event guard reads the last applied Stripe event timestamp before
        // updating; null means no prior event, so the incoming event is applied.
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(async () => ({
              data: { last_stripe_event_created_at: null },
              error: null,
            })),
          }),
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          state.entitlementUpdatePayloads.push(payload)
          return {
            eq: vi.fn(async () => ({ error: null })),
          }
        }),
      }
    }

    return null
  }
}

function createCompanyLookupTables() {
  return (table: string) => {
    if (table === 'companies') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn(async () => ({
              data: { name: 'Acme Ltd' },
              error: null,
            })),
          }),
        }),
      }
    }

    return null
  }
}

function createRequest() {
  return new Request('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': 't_signature',
      'content-type': 'application/json',
    },
    body: '{"id":"evt_test_123"}',
  }) as unknown as NextRequest
}

describe('/api/billing/webhook', () => {
  const mockedConstructWebhookEvent = vi.mocked(constructWebhookEvent)
  const mockedGetStripe = vi.mocked(getStripe)
  const mockedCreateAdminClient = vi.mocked(createAdminClient)
  const mockedSendBillingIncidentEmail = vi.mocked(sendBillingIncidentEmail)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-05T12:00:00.000Z'))
    mockedGetStripe.mockReturnValue({
      subscriptions: {
        retrieve: vi.fn(async () => ({
          items: {
            data: [{ current_period_end: 1784784846 }],
          },
        })),
      },
      charges: {
        retrieve: vi.fn(async () => ({
          customer: 'cus_test_123',
        })),
      },
    } as unknown as ReturnType<typeof getStripe>)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('processes a fresh event once and marks it processed', async () => {
    const admin = createWebhookEventMock()
    mockedCreateAdminClient.mockReturnValue(admin.client)
    mockedConstructWebhookEvent.mockReturnValue(createStripeEvent('charge.succeeded'))

    const response = await POST(createRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.received).toBe(true)
    expect(admin.insert).toHaveBeenCalledTimes(1)
    expect(admin.state.row?.processing_status).toBe('processed')
    expect(admin.state.row?.processing_started_at).toBe('2026-05-05T12:00:00.000Z')
    expect(admin.state.updatePayloads).toContainEqual(
      expect.objectContaining({ processing_status: 'processed' })
    )
  })

  it('ignores duplicate processed events', async () => {
    const admin = createWebhookEventMock({
      id: 'webhook-row-1',
      stripe_event_id: 'evt_test_123',
      processing_status: 'processed',
      processing_started_at: '2026-05-05T11:50:00.000Z',
      processed_at: '2026-05-05T11:51:00.000Z',
      last_error: null,
      updated_at: '2026-05-05T11:51:00.000Z',
    })

    mockedCreateAdminClient.mockReturnValue(admin.client)
    mockedConstructWebhookEvent.mockReturnValue(createStripeEvent('charge.succeeded'))

    const response = await POST(createRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.received).toBe(true)
    expect(payload.duplicate).toBe(true)
    expect(admin.state.updatePayloads).toHaveLength(0)
  })

  it('reclaims a stale processing event and retries it successfully', async () => {
    const admin = createWebhookEventMock({
      id: 'webhook-row-1',
      stripe_event_id: 'evt_test_123',
      processing_status: 'processing',
      processing_started_at: '2026-05-05T11:50:00.000Z',
      processed_at: null,
      last_error: null,
      updated_at: '2026-05-05T11:50:00.000Z',
    })

    mockedCreateAdminClient.mockReturnValue(admin.client)
    mockedConstructWebhookEvent.mockReturnValue(createStripeEvent('charge.succeeded'))

    const response = await POST(createRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.received).toBe(true)
    expect(payload.duplicate).toBeUndefined()
    expect(admin.state.updatePayloads[0]).toEqual(
      expect.objectContaining({
        processing_status: 'processing',
        processing_started_at: '2026-05-05T12:00:00.000Z',
        last_error: null,
        processed_at: null,
      })
    )
    expect(admin.state.updatePayloads[1]).toEqual(
      expect.objectContaining({ processing_status: 'processed' })
    )
    expect(admin.state.row?.processing_status).toBe('processed')
    expect(admin.state.row?.processing_started_at).toBe('2026-05-05T12:00:00.000Z')
  })

  it('stores the subscription period end when checkout completes', async () => {
    const provisioningState: CheckoutProvisioningState = {
      companyUpdatePayloads: [],
      entitlementUpdatePayloads: [],
    }
    const admin = createWebhookEventMock(
      null,
      createCheckoutProvisioningTables(provisioningState)
    )
    mockedCreateAdminClient.mockReturnValue(admin.client)
    mockedConstructWebhookEvent.mockReturnValue(createCheckoutSessionCompletedEvent())

    const response = await POST(createRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.received).toBe(true)
    expect(mockedGetStripe().subscriptions.retrieve).toHaveBeenCalledWith('sub_test_123')
    expect(provisioningState.companyUpdatePayloads).toContainEqual({
      stripe_customer_id: 'cus_test_123',
    })
    expect(provisioningState.entitlementUpdatePayloads).toContainEqual(
      expect.objectContaining({
        tier_slug: 'professional',
        is_trial: false,
        stripe_subscription_id: 'sub_test_123',
        subscription_status: 'active',
        current_period_end: '2026-07-23T05:34:06.000Z',
      })
    )
    expect(admin.state.row?.processing_status).toBe('processed')
  })

  it('sends a billing incident notification when a charge is refunded', async () => {
    const admin = createWebhookEventMock(null, createCompanyLookupTables())
    mockedCreateAdminClient.mockReturnValue(admin.client)
    mockedConstructWebhookEvent.mockReturnValue(createChargeRefundedEvent())

    const response = await POST(createRequest())

    expect(response.status).toBe(200)
    expect(mockedSendBillingIncidentEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentType: 'refund',
        stripeEventId: 'evt_refund_123',
        stripeObjectId: 'ch_refunded_123',
        amount: '£1',
        customerId: 'cus_test_123',
        companyName: 'Acme Ltd',
      })
    )
    expect(admin.state.row?.processing_status).toBe('processed')
  })

  it('looks up the disputed charge and sends a billing incident notification', async () => {
    const admin = createWebhookEventMock(null, createCompanyLookupTables())
    mockedCreateAdminClient.mockReturnValue(admin.client)
    mockedConstructWebhookEvent.mockReturnValue(createDisputeCreatedEvent())

    const response = await POST(createRequest())

    expect(response.status).toBe(200)
    expect(mockedGetStripe().charges.retrieve).toHaveBeenCalledWith('ch_disputed_123')
    expect(mockedSendBillingIncidentEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentType: 'dispute',
        stripeEventId: 'evt_dispute_123',
        stripeObjectId: 'dp_test_123',
        amount: '£1',
        customerId: 'cus_test_123',
        companyName: 'Acme Ltd',
      })
    )
    expect(admin.state.row?.processing_status).toBe('processed')
  })
})
