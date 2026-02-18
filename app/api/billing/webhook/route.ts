import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { constructWebhookEvent } from '@/lib/billing/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HANDLED_EVENT_TYPES = new Set<string>([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
])

type WebhookLogStatus = 'processing' | 'processed' | 'failed'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Invalid content-type. Expected application/json.' },
      { status: 400 }
    )
  }

  const rawBody = await request.text()
  if (!rawBody) {
    return NextResponse.json({ error: 'Missing request body' }, { status: 400 })
  }

  if (rawBody.length > 1024 * 1024) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(rawBody, signature)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[billing/webhook] Signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    const claimResult = await claimWebhookEvent(admin, event)
    if (claimResult === 'duplicate') {
      console.info(`[billing/webhook] Duplicate event ignored: ${event.id}`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    await processWebhookEvent(admin, event)
    await markWebhookEventStatus(admin, event.id, 'processed')
    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown processing error'
    await markWebhookEventStatus(admin, event.id, 'failed', message)
    console.error(`[billing/webhook] Error processing ${event.type}: ${message}`)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function processWebhookEvent(admin: SupabaseClient, event: Stripe.Event) {
  if (!HANDLED_EVENT_TYPES.has(event.type)) {
    console.info(`[billing/webhook] Event ${event.type} acknowledged without handler`)
    return
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(admin, event.data.object as Stripe.Checkout.Session)
      return
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(admin, event.data.object as Stripe.Subscription)
      return
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(admin, event.data.object as Stripe.Subscription)
      return
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice)
      return
    default:
      return
  }
}

async function claimWebhookEvent(
  admin: SupabaseClient,
  event: Stripe.Event
): Promise<'claimed' | 'duplicate'> {
  const now = new Date().toISOString()

  const { error: insertError } = await admin.from('stripe_webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
    processing_status: 'processing',
    received_at: now,
    created_at: now,
    updated_at: now,
  })

  if (!insertError) {
    return 'claimed'
  }

  if (!isUniqueViolation(insertError)) {
    throw insertError
  }

  const { data: existing, error: readError } = await admin
    .from('stripe_webhook_events')
    .select('processing_status')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (readError) {
    throw readError
  }

  if (!existing || existing.processing_status === 'processed') {
    return 'duplicate'
  }

  if (existing.processing_status === 'processing') {
    return 'duplicate'
  }

  const { error: resetError } = await admin
    .from('stripe_webhook_events')
    .update({
      processing_status: 'processing',
      last_error: null,
      processed_at: null,
      updated_at: now,
    })
    .eq('stripe_event_id', event.id)
    .eq('processing_status', 'failed')

  if (resetError) {
    throw resetError
  }

  return 'claimed'
}

async function markWebhookEventStatus(
  admin: SupabaseClient,
  stripeEventId: string,
  status: WebhookLogStatus,
  lastError?: string
) {
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    processing_status: status,
    updated_at: now,
  }

  if (status === 'processed') {
    updates.processed_at = now
    updates.last_error = null
  }

  if (status === 'failed') {
    updates.last_error = (lastError ?? 'Unknown webhook error').slice(0, 1000)
  }

  const { error } = await admin
    .from('stripe_webhook_events')
    .update(updates)
    .eq('stripe_event_id', stripeEventId)

  if (error) {
    console.error(
      `[billing/webhook] Failed to update event status for ${stripeEventId}:`,
      error
    )
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const code = (error as { code?: string }).code
  return code === '23505'
}

async function handleCheckoutCompleted(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session
) {
  const userId = session.client_reference_id
  const planSlug = session.metadata?.plan_slug
  const customerId = typeof session.customer === 'string' ? session.customer : null
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : null

  if (!userId || !planSlug) {
    throw new Error(
      'checkout.session.completed missing client_reference_id or metadata.plan_slug'
    )
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (profileError || !profile?.company_id) {
    throw new Error(`No company found for user ${userId}`)
  }

  const companyId = profile.company_id

  if (customerId) {
    const { error: companyError } = await admin
      .from('companies')
      .update({ stripe_customer_id: customerId })
      .eq('id', companyId)
      .is('stripe_customer_id', null)

    if (companyError) {
      throw companyError
    }
  }

  const { data: tier, error: tierError } = await admin
    .from('tiers')
    .select('*')
    .eq('slug', planSlug)
    .single()

  if (tierError || !tier) {
    throw new Error(`Unknown tier slug: ${planSlug}`)
  }

  const { error: updateError } = await admin
    .from('company_entitlements')
    .update({
      tier_slug: planSlug,
      is_trial: false,
      trial_ends_at: null,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      max_employees: tier.max_employees,
      max_users: tier.max_users,
      can_export_csv: tier.can_export_csv,
      can_export_pdf: tier.can_export_pdf,
      can_forecast: tier.can_forecast,
      can_calendar: tier.can_calendar,
      can_bulk_import: tier.can_bulk_import,
      can_api_access: tier.can_api_access,
      can_sso: tier.can_sso,
      can_audit_logs: tier.can_audit_logs,
    })
    .eq('company_id', companyId)

  if (updateError) {
    throw updateError
  }

  console.info(
    `[billing/webhook] Provisioned ${planSlug} for company ${companyId} (subscription: ${subscriptionId})`
  )
}

async function handleSubscriptionUpdated(
  admin: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const subscriptionId = subscription.id

  const { data: entitlement, error: entitlementError } = await admin
    .from('company_entitlements')
    .select('company_id, tier_slug')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (entitlementError || !entitlement) {
    throw new Error(`No entitlement found for subscription ${subscriptionId}`)
  }

  const updates: Record<string, unknown> = {
    subscription_status: subscription.status,
  }

  const priceId = subscription.items.data[0]?.price?.id
  if (priceId) {
    const { data: matchingTier } = await admin
      .from('tiers')
      .select('*')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
      .maybeSingle()

    if (matchingTier && matchingTier.slug !== entitlement.tier_slug) {
      updates.tier_slug = matchingTier.slug
      updates.max_employees = matchingTier.max_employees
      updates.max_users = matchingTier.max_users
      updates.can_export_csv = matchingTier.can_export_csv
      updates.can_export_pdf = matchingTier.can_export_pdf
      updates.can_forecast = matchingTier.can_forecast
      updates.can_calendar = matchingTier.can_calendar
      updates.can_bulk_import = matchingTier.can_bulk_import
      updates.can_api_access = matchingTier.can_api_access
      updates.can_sso = matchingTier.can_sso
      updates.can_audit_logs = matchingTier.can_audit_logs
    }
  }

  const { error: updateError } = await admin
    .from('company_entitlements')
    .update(updates)
    .eq('stripe_subscription_id', subscriptionId)

  if (updateError) {
    throw updateError
  }
}

async function handleSubscriptionDeleted(
  admin: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const subscriptionId = subscription.id

  const { data: freeTier } = await admin
    .from('tiers')
    .select('*')
    .eq('slug', 'free')
    .maybeSingle()

  const updates: Record<string, unknown> = {
    subscription_status: 'canceled',
    stripe_subscription_id: null,
    tier_slug: 'free',
    is_trial: false,
    trial_ends_at: null,
  }

  if (freeTier) {
    updates.max_employees = freeTier.max_employees
    updates.max_users = freeTier.max_users
    updates.can_export_csv = freeTier.can_export_csv
    updates.can_export_pdf = freeTier.can_export_pdf
    updates.can_forecast = freeTier.can_forecast
    updates.can_calendar = freeTier.can_calendar
    updates.can_bulk_import = freeTier.can_bulk_import
    updates.can_api_access = freeTier.can_api_access
    updates.can_sso = freeTier.can_sso
    updates.can_audit_logs = freeTier.can_audit_logs
  }

  const { error: updateError } = await admin
    .from('company_entitlements')
    .update(updates)
    .eq('stripe_subscription_id', subscriptionId)

  if (updateError) {
    throw updateError
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.parent?.subscription_details?.subscription as
    | string
    | null
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id ?? null

  console.error(
    `[billing/webhook] Payment failed for subscription ${subscriptionId}`,
    { attemptCount: invoice.attempt_count }
  )
}
