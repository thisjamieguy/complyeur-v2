import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/billing/webhook/route'
import { constructWebhookEvent } from '@/lib/billing/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

vi.mock('@/lib/billing/stripe', () => ({
  constructWebhookEvent: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
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

function createWebhookEventMock(existingRow?: MockWebhookRow | null) {
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
    if (table !== 'stripe_webhook_events') {
      throw new Error(`Unexpected table access in webhook test: ${table}`)
    }

    return {
      insert,
      select,
      update,
    }
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
  const mockedCreateAdminClient = vi.mocked(createAdminClient)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-05T12:00:00.000Z'))
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
})
