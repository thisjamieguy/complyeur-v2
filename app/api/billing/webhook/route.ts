import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { constructWebhookEvent } from '@/lib/billing/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPaymentFailedEmail } from '@/lib/services/email-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HANDLED_EVENT_TYPES = new Set<string>([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
])

type WebhookLogStatus = 'processing' | 'processed' | 'failed'
const WEBHOOK_PROCESSING_STALE_AFTER_MS = 5 * 60 * 1000

interface ExistingWebhookEventRow {
  id: string
  processing_status: WebhookLogStatus
  processing_started_at: string | null
}

interface StripeEntitlementEventAuditFields {
  last_stripe_event_created_at: string | null
  last_stripe_event_id: string | null
  last_stripe_event_type: string | null
}

interface StripeEntitlementEventTimestampRow {
  last_stripe_event_created_at: string | null
}

interface SubscriptionEntitlementLookupRow {
  company_id: string
  tier_slug: string | null
  last_stripe_event_created_at: string | null
}

interface SubscriptionEntitlementLookupResult {
  entitlement: SubscriptionEntitlementLookupRow
  matchColumn: 'stripe_subscription_id' | 'company_id'
  matchValue: string
}

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
      await handleCheckoutCompleted(admin, event)
      return
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(admin, event)
      return
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(admin, event)
      return
    case 'invoice.payment_failed':
      await handlePaymentFailed(admin, event.data.object as Stripe.Invoice)
      return
    default:
      return
  }
}

function getStripeEventCreatedAtIso(event: Stripe.Event): string {
  return new Date(event.created * 1000).toISOString()
}

function buildStripeEventAuditFields(
  event: Stripe.Event
): Pick<
  StripeEntitlementEventAuditFields,
  'last_stripe_event_created_at' | 'last_stripe_event_id' | 'last_stripe_event_type'
> {
  return {
    last_stripe_event_created_at: getStripeEventCreatedAtIso(event),
    last_stripe_event_id: event.id,
    last_stripe_event_type: event.type,
  }
}

function isStaleStripeEntitlementEvent(
  event: Stripe.Event,
  latestAppliedEventCreatedAt: string | null
): boolean {
  if (!latestAppliedEventCreatedAt) {
    return false
  }

  const latestAppliedMs = Date.parse(latestAppliedEventCreatedAt)
  const incomingMs = Date.parse(getStripeEventCreatedAtIso(event))

  if (Number.isNaN(latestAppliedMs) || Number.isNaN(incomingMs)) {
    return false
  }

  return incomingMs < latestAppliedMs
}

function logIgnoredStaleStripeEvent(
  event: Stripe.Event,
  latestAppliedEventCreatedAt: string | null,
  target: string
) {
  console.info(
    `[billing/webhook] Ignored stale ${event.type} event ${event.id} for ${target}; latest applied event timestamp is ${latestAppliedEventCreatedAt}`
  )
}

async function findEntitlementForSubscriptionEvent(
  admin: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<SubscriptionEntitlementLookupResult | null> {
  const subscriptionId = subscription.id

  const { data: bySubscriptionId, error: bySubscriptionIdError } = await admin
    .from('company_entitlements')
    .select('company_id, tier_slug, last_stripe_event_created_at')
    .eq('stripe_subscription_id', subscriptionId)
    .single<SubscriptionEntitlementLookupRow>()

  if (bySubscriptionIdError && bySubscriptionIdError.code !== 'PGRST116') {
    throw bySubscriptionIdError
  }

  if (bySubscriptionId) {
    return {
      entitlement: bySubscriptionId,
      matchColumn: 'stripe_subscription_id',
      matchValue: subscriptionId,
    }
  }

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null

  if (!customerId) {
    return null
  }

  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle<{ id: string }>()

  if (companyError) {
    throw companyError
  }

  if (!company?.id) {
    return null
  }

  const { data: byCompanyId, error: byCompanyIdError } = await admin
    .from('company_entitlements')
    .select('company_id, tier_slug, last_stripe_event_created_at')
    .eq('company_id', company.id)
    .single<SubscriptionEntitlementLookupRow>()

  if (byCompanyIdError) {
    throw byCompanyIdError
  }

  return byCompanyId
    ? {
        entitlement: byCompanyId,
        matchColumn: 'company_id',
        matchValue: company.id,
      }
    : null
}

async function claimWebhookEvent(
  admin: SupabaseClient,
  event: Stripe.Event
): Promise<'claimed' | 'duplicate'> {
  const now = new Date().toISOString()
  const staleBefore = new Date(Date.now() - WEBHOOK_PROCESSING_STALE_AFTER_MS).toISOString()

  const { error: insertError } = await admin.from('stripe_webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
    processing_status: 'processing',
    processing_started_at: now,
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
    .select('id, processing_status, processing_started_at')
    .eq('stripe_event_id', event.id)
    .maybeSingle<ExistingWebhookEventRow>()

  if (readError) {
    throw readError
  }

  if (!existing || existing.processing_status === 'processed') {
    return 'duplicate'
  }

  if (
    existing.processing_status === 'processing' &&
    !isWebhookProcessingStale(existing.processing_started_at, staleBefore)
  ) {
    return 'duplicate'
  }

  return reclaimWebhookEvent(admin, existing, now, staleBefore)
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

async function reclaimWebhookEvent(
  admin: SupabaseClient,
  existing: ExistingWebhookEventRow,
  now: string,
  staleBefore: string
): Promise<'claimed' | 'duplicate'> {
  const reclaimUpdates = {
    processing_status: 'processing' as const,
    processing_started_at: now,
    last_error: null,
    processed_at: null,
    updated_at: now,
  }

  if (existing.processing_status === 'failed') {
    const { data, error } = await admin
      .from('stripe_webhook_events')
      .update(reclaimUpdates)
      .eq('id', existing.id)
      .eq('processing_status', 'failed')
      .select('id')

    if (error) {
      throw error
    }

    return data.length > 0 ? 'claimed' : 'duplicate'
  }

  if (existing.processing_status === 'processing') {
    const { data, error } = await admin
      .from('stripe_webhook_events')
      .update(reclaimUpdates)
      .eq('id', existing.id)
      .eq('processing_status', 'processing')
      .lt('processing_started_at', staleBefore)
      .select('id')

    if (error) {
      throw error
    }

    return data.length > 0 ? 'claimed' : 'duplicate'
  }

  return 'duplicate'
}

function isWebhookProcessingStale(
  processingStartedAt: string | null,
  staleBefore: string
): boolean {
  if (!processingStartedAt) {
    return true
  }

  const processingStartedAtMs = Date.parse(processingStartedAt)
  const staleBeforeMs = Date.parse(staleBefore)

  if (Number.isNaN(processingStartedAtMs) || Number.isNaN(staleBeforeMs)) {
    return true
  }

  return processingStartedAtMs < staleBeforeMs
}

async function handleCheckoutCompleted(admin: SupabaseClient, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session
  const userId = session.client_reference_id
  const planSlug = session.metadata?.plan_slug
  const metadataCompanyId = session.metadata?.company_id
  const metadataUserId = session.metadata?.user_id
  const customerId = typeof session.customer === 'string' ? session.customer : null
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : null

  if (!userId || !planSlug || !customerId || !subscriptionId) {
    throw new Error(
      'checkout.session.completed missing required user, customer, subscription, or plan metadata'
    )
  }

  if (metadataUserId && metadataUserId !== userId) {
    throw new Error('checkout.session.completed metadata.user_id does not match client_reference_id')
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

  if (metadataCompanyId && metadataCompanyId !== companyId) {
    throw new Error('checkout.session.completed metadata.company_id does not match authenticated profile company')
  }

  const { data: company, error: companyFetchError } = await admin
    .from('companies')
    .select('stripe_customer_id')
    .eq('id', companyId)
    .single()

  if (companyFetchError) {
    throw companyFetchError
  }

  if (company?.stripe_customer_id && company.stripe_customer_id !== customerId) {
    throw new Error('checkout.session.completed customer does not match existing company Stripe customer')
  }

  if (!company?.stripe_customer_id) {
    const { error: companyError } = await admin
      .from('companies')
      .update({ stripe_customer_id: customerId })
      .eq('id', companyId)
      .is('stripe_customer_id', null)

    if (companyError) {
      throw companyError
    }
  }

  const { data: currentEntitlements, error: entitlementFetchError } = await admin
    .from('company_entitlements')
    .select('last_stripe_event_created_at')
    .eq('company_id', companyId)
    .single<StripeEntitlementEventTimestampRow>()

  if (entitlementFetchError || !currentEntitlements) {
    throw new Error(`No entitlements found for company ${companyId}`)
  }

  if (
    isStaleStripeEntitlementEvent(
      event,
      currentEntitlements.last_stripe_event_created_at
    )
  ) {
    logIgnoredStaleStripeEvent(
      event,
      currentEntitlements.last_stripe_event_created_at,
      `company ${companyId}`
    )
    return
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
      ...buildStripeEventAuditFields(event),
    })
    .eq('company_id', companyId)

  if (updateError) {
    throw updateError
  }

  console.info(
    `[billing/webhook] Provisioned ${planSlug} for company ${companyId} (subscription: ${subscriptionId})`
  )
}

async function handleSubscriptionUpdated(admin: SupabaseClient, event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const subscriptionId = subscription.id

  const lookup = await findEntitlementForSubscriptionEvent(admin, subscription)

  if (!lookup) {
    throw new Error(`No entitlement found for subscription ${subscriptionId}`)
  }

  const { entitlement } = lookup

  if (
    isStaleStripeEntitlementEvent(
      event,
      entitlement.last_stripe_event_created_at
    )
  ) {
    logIgnoredStaleStripeEvent(
      event,
      entitlement.last_stripe_event_created_at,
      `subscription ${subscriptionId}`
    )
    return
  }

  const updates: Record<string, unknown> = {
    subscription_status: subscription.status,
    current_period_end: subscription.items.data[0]?.current_period_end
      ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
      : null,
    ...buildStripeEventAuditFields(event),
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
    .eq(lookup.matchColumn, lookup.matchValue)

  if (updateError) {
    throw updateError
  }
}

async function handleSubscriptionDeleted(admin: SupabaseClient, event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const subscriptionId = subscription.id

  const lookup = await findEntitlementForSubscriptionEvent(admin, subscription)

  if (!lookup) {
    throw new Error(`No entitlement found for subscription ${subscriptionId}`)
  }

  const { entitlement: currentEntitlements } = lookup

  if (
    isStaleStripeEntitlementEvent(
      event,
      currentEntitlements.last_stripe_event_created_at
    )
  ) {
    logIgnoredStaleStripeEvent(
      event,
      currentEntitlements.last_stripe_event_created_at,
      `subscription ${subscriptionId}`
    )
    return
  }

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
    ...buildStripeEventAuditFields(event),
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
    .eq(lookup.matchColumn, lookup.matchValue)

  if (updateError) {
    throw updateError
  }
}

async function handlePaymentFailed(admin: SupabaseClient, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.parent?.subscription_details?.subscription as
    | string
    | null
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id ?? null

  const attemptCount = invoice.attempt_count ?? 1
  const amountDue = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: (invoice.currency ?? 'gbp').toUpperCase(),
  }).format((invoice.amount_due ?? 0) / 100)

  console.error(
    `[billing/webhook] Payment failed for subscription ${subscriptionId}`,
    { attemptCount, customerId }
  )

  if (!customerId) {
    console.warn('[billing/webhook] No customer ID on invoice — skipping email')
    return
  }

  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .maybeSingle<{ id: string; name: string | null }>()

  if (companyError || !company?.id) {
    console.error('[billing/webhook] Could not find company for customer', {
      customerId,
      error: companyError,
    })
    return
  }

  const { data: recipients, error: recipientsError } = await admin
    .from('profiles')
    .select('email, role')
    .eq('company_id', company.id)
    .not('email', 'is', null)

  if (recipientsError || !recipients || recipients.length === 0) {
    console.error('[billing/webhook] Could not find payment-failed email recipient', {
      companyId: company.id,
      customerId,
      error: recipientsError,
    })
    return
  }

  const rolePriority = ['owner', 'admin', 'manager', 'viewer']
  const sortedRecipients = [...recipients].sort((left, right) => {
    const leftIndex = rolePriority.indexOf(left.role ?? '')
    const rightIndex = rolePriority.indexOf(right.role ?? '')
    return (leftIndex === -1 ? rolePriority.length : leftIndex) -
      (rightIndex === -1 ? rolePriority.length : rightIndex)
  })

  const recipientEmail = sortedRecipients[0]?.email?.trim().toLowerCase()
  if (!recipientEmail) {
    console.error('[billing/webhook] Resolved payment-failed recipient had no usable email', {
      companyId: company.id,
      customerId,
    })
    return
  }

  await sendPaymentFailedEmail({
    recipientEmail,
    companyName: company.name ?? undefined,
    amountDue,
    attemptCount,
  })
}
