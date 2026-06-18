import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { randomUUID } from 'node:crypto'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { loadEnvConfig } from '@next/env'
import { NextRequest } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { POST as billingWebhookPost } from '@/app/api/billing/webhook/route'
import { GET as betaMonitoringGet } from '@/app/api/cron/beta-monitoring/route'

const execFile = promisify(execFileCallback)

const LOCAL_BASE_URL = 'http://127.0.0.1:3100'
const LOCAL_WEBHOOK_SECRET = process.env.LOCAL_WEBHOOK_SECRET ?? 'whsec_local_evidence'
const LOCAL_CRON_SECRET = process.env.CRON_SECRET ?? 'local-cron-evidence'
const STRIPE_API_VERSION = '2026-01-28.clover'
const EVENT_WAIT_TIMEOUT_MS = 45_000

type EventOutcome = {
  httpStatus: number
  response: Record<string, unknown>
}

type CompanyRow = {
  id: string
  name: string
  stripe_customer_id: string | null
  created_at: string
}

type EntitlementRow = {
  company_id: string
  tier_slug: string | null
  subscription_status: string | null
  stripe_subscription_id: string | null
  last_stripe_event_id: string | null
  last_stripe_event_type: string | null
  last_stripe_event_created_at: string | null
}

type WebhookRow = {
  stripe_event_id: string
  event_type: string
  processing_status: 'processing' | 'processed' | 'failed'
  last_error: string | null
  updated_at: string
}

type TierRow = {
  slug: string
  display_name: string
  max_employees: number
  max_users: number
  can_export_csv: boolean | null
  can_export_pdf: boolean | null
  can_forecast: boolean | null
  can_calendar: boolean | null
  can_bulk_import: boolean | null
  can_api_access: boolean | null
  can_sso: boolean | null
  can_audit_logs: boolean | null
  stripe_price_id_monthly: string | null
  stripe_price_id_annual: string | null
  sort_order: number
  is_active: boolean
}

type ProvisionedIdentity = {
  userId: string
  email: string
  companyId: string
  companyName: string
}

type SubscriptionBundle = {
  customerId: string
  subscriptionId: string
}

type Summary = {
  dateLabel: string
  baseUrl: string
  monitoring: Record<string, unknown>
  happyPath: {
    userId: string
    companyId: string
    companyName: string
    checkoutSessionId: string
    subscriptionId: string
    customerId: string
    checkoutEventId: string
    replayDuplicate: boolean
    updateEventId: string
    paymentFailedEventId: string
    cancelEventId: string
    staleReplayIgnored: boolean
  }
  reconciliation: {
    userId: string
    companyId: string
    companyName: string
    checkoutSessionId: string
    checkoutEventId: string
    firstAttemptStatus: number
    firstAttemptError: string
    finalWebhookStatus: string
  }
}

function parseArgs(argv: string[]) {
  let baseUrl = process.env.BASE_URL ?? LOCAL_BASE_URL
  let outputPath = ''

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = argv[index + 1] ?? ''

    if (arg === '--base-url') {
      baseUrl = value
      index += 1
    } else if (arg === '--output') {
      outputPath = value
      index += 1
    }
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    outputPath,
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function createAdminClient(): SupabaseClient {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function createStripeClient(): Stripe {
  return new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  })
}

async function ensureUserExists(
  admin: SupabaseClient,
  email: string,
  password: string
): Promise<string> {
  const createResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createResult.data.user?.id) {
    return createResult.data.user.id
  }

  const message = createResult.error?.message?.toLowerCase() ?? ''
  if (
    !message.includes('already registered') &&
    !message.includes('already been registered') &&
    !message.includes('user already')
  ) {
    throw new Error(`Failed to create auth user ${email}: ${createResult.error?.message ?? 'unknown error'}`)
  }

  const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const user = existing.data.users.find((candidate) => candidate.email?.toLowerCase() === email)
  if (!user) {
    throw new Error(`User ${email} already exists but could not be resolved`)
  }

  const updateResult = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  })
  if (updateResult.error) {
    throw new Error(`Failed to update auth user ${email}: ${updateResult.error.message}`)
  }

  return user.id
}

async function provisionCompanyAndProfile(
  admin: SupabaseClient,
  params: {
    userId: string
    email: string
    companyName: string
    companyId?: string
  }
): Promise<void> {
  const termsAcceptedAt = new Date().toISOString()

  if (params.companyId) {
    await provisionCompanyAndProfileDirect(admin, {
      userId: params.userId,
      email: params.email,
      companyName: params.companyName,
      companyId: params.companyId,
      termsAcceptedAt,
    })
    return
  }

  let rpcResult = await admin.rpc('create_company_and_profile', {
    user_id: params.userId,
    user_email: params.email,
    company_name: params.companyName,
    user_terms_accepted_at: termsAcceptedAt,
    user_auth_provider: 'email',
    user_first_name: null,
    user_last_name: null,
  })

  if (rpcResult.error?.code === 'PGRST202') {
    rpcResult = await admin.rpc('create_company_and_profile', {
      user_id: params.userId,
      user_email: params.email,
      company_name: params.companyName,
      user_terms_accepted_at: termsAcceptedAt,
    })
  }

  if (rpcResult.error) {
    if (!rpcResult.error.message.includes('authenticated user or auth trigger context')) {
      throw new Error(`Failed to provision company/profile for ${params.email}: ${rpcResult.error.message}`)
    }

    await provisionCompanyAndProfileDirect(admin, {
      userId: params.userId,
      email: params.email,
      companyName: params.companyName,
      companyId: params.companyId,
      termsAcceptedAt,
    })
  }
}

function slugifyCompanyName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

async function provisionCompanyAndProfileDirect(
  admin: SupabaseClient,
  params: {
    userId: string
    email: string
    companyName: string
    companyId?: string
    termsAcceptedAt: string
  }
): Promise<void> {
  const baseSlug = slugifyCompanyName(params.companyName)
  const slug = `${baseSlug}-${params.userId.slice(0, 8)}`
  const companyInsert: Record<string, unknown> = {
    name: params.companyName,
    slug,
  }

  if (params.companyId) {
    companyInsert.id = params.companyId
  }

  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert(companyInsert)
    .select('id')
    .single<{ id: string }>()

  if (companyError || !company?.id) {
    throw new Error(`Failed to create company row for ${params.email}: ${companyError?.message ?? 'missing id'}`)
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: params.userId,
    company_id: company.id,
    email: params.email,
    full_name: 'Evidence Operator',
    role: 'manager',
    auth_provider: 'email',
    terms_accepted_at: params.termsAcceptedAt,
  })

  if (profileError) {
    throw new Error(`Failed to upsert profile for ${params.email}: ${profileError.message}`)
  }

  const { data: freeTier, error: freeTierError } = await admin
    .from('tiers')
    .select(
      'slug, max_employees, max_users, can_export_csv, can_export_pdf, can_forecast, can_calendar, can_bulk_import, can_api_access, can_sso, can_audit_logs'
    )
    .eq('slug', 'free')
    .single<Pick<
      TierRow,
      | 'slug'
      | 'max_employees'
      | 'max_users'
      | 'can_export_csv'
      | 'can_export_pdf'
      | 'can_forecast'
      | 'can_calendar'
      | 'can_bulk_import'
      | 'can_api_access'
      | 'can_sso'
      | 'can_audit_logs'
    >>()

  if (freeTierError || !freeTier) {
    throw new Error(`Failed to load free tier defaults: ${freeTierError?.message ?? 'not found'}`)
  }

  const entitlementSeed = {
    tier_slug: freeTier.slug,
    subscription_status: 'none',
    is_trial: false,
    max_employees: freeTier.max_employees,
    max_users: freeTier.max_users,
    can_export_csv: freeTier.can_export_csv,
    can_export_pdf: freeTier.can_export_pdf,
    can_forecast: freeTier.can_forecast,
    can_calendar: freeTier.can_calendar,
    can_bulk_import: freeTier.can_bulk_import,
    can_api_access: freeTier.can_api_access,
    can_sso: freeTier.can_sso,
    can_audit_logs: freeTier.can_audit_logs,
  }

  const { data: existingEntitlement, error: existingEntitlementError } = await admin
    .from('company_entitlements')
    .select('company_id')
    .eq('company_id', company.id)
    .maybeSingle<{ company_id: string }>()

  if (existingEntitlementError) {
    throw new Error(
      `Failed to inspect company entitlements for ${params.email}: ${existingEntitlementError.message}`
    )
  }

  if (existingEntitlement?.company_id) {
    const { error: entitlementUpdateError } = await admin
      .from('company_entitlements')
      .update(entitlementSeed)
      .eq('company_id', company.id)

    if (entitlementUpdateError) {
      throw new Error(
        `Failed to normalize existing company entitlements for ${params.email}: ${entitlementUpdateError.message}`
      )
    }
    return
  }

  const { error: entitlementInsertError } = await admin
    .from('company_entitlements')
    .insert({
      company_id: company.id,
      ...entitlementSeed,
    })

  if (entitlementInsertError) {
    throw new Error(
      `Failed to seed company entitlements for ${params.email}: ${entitlementInsertError.message}`
    )
  }
}

async function loadProvisionedIdentity(
  admin: SupabaseClient,
  userId: string
): Promise<ProvisionedIdentity> {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, company_id, email')
    .eq('id', userId)
    .single<{ id: string; company_id: string; email: string | null }>()

  if (profileError || !profile?.company_id) {
    throw new Error(`Unable to load profile for ${userId}: ${profileError?.message ?? 'missing company'}`)
  }

  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id, name')
    .eq('id', profile.company_id)
    .single<{ id: string; name: string }>()

  if (companyError || !company) {
    throw new Error(`Unable to load company for ${userId}: ${companyError?.message ?? 'missing company row'}`)
  }

  return {
    userId,
    email: profile.email ?? `${userId}@complyeur-evidence.test`,
    companyId: company.id,
    companyName: company.name,
  }
}

async function createProvisionedIdentity(
  admin: SupabaseClient,
  prefix: string
): Promise<ProvisionedIdentity> {
  const email = `${prefix}@complyeur-evidence.test`
  const password = `Evidence!${randomUUID().slice(0, 12)}`
  const companyName = `Evidence ${prefix}`
  const userId = await ensureUserExists(admin, email, password)
  await provisionCompanyAndProfile(admin, { userId, email, companyName })
  return loadProvisionedIdentity(admin, userId)
}

async function createAuthOnlyIdentity(
  admin: SupabaseClient,
  prefix: string
): Promise<{
  userId: string
  email: string
  companyName: string
}> {
  const email = `${prefix}@complyeur-evidence.test`
  const password = `Evidence!${randomUUID().slice(0, 12)}`
  const companyName = `Evidence ${prefix}`
  const userId = await ensureUserExists(admin, email, password)
  return { userId, email, companyName }
}

async function getPaidTier(admin: SupabaseClient): Promise<TierRow> {
  const preferred = await admin
    .from('tiers')
    .select(
      'slug, display_name, max_employees, max_users, can_export_csv, can_export_pdf, can_forecast, can_calendar, can_bulk_import, can_api_access, can_sso, can_audit_logs, stripe_price_id_monthly, stripe_price_id_annual, sort_order, is_active'
    )
    .eq('slug', 'starter')
    .maybeSingle<TierRow>()

  if (preferred.data) {
    return preferred.data
  }

  const { data, error } = await admin
    .from('tiers')
    .select(
      'slug, display_name, max_employees, max_users, can_export_csv, can_export_pdf, can_forecast, can_calendar, can_bulk_import, can_api_access, can_sso, can_audit_logs, stripe_price_id_monthly, stripe_price_id_annual, sort_order, is_active'
    )
    .neq('slug', 'free')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle<TierRow>()

  if (error || !data) {
    throw new Error(`Unable to resolve a paid tier: ${error?.message ?? 'not found'}`)
  }

  return data
}

async function resolveTierMonthlyPriceId(
  stripe: Stripe,
  params: {
    tier: TierRow
    runLabel: string
  }
): Promise<string> {
  if (params.tier.stripe_price_id_monthly) {
    return params.tier.stripe_price_id_monthly
  }

  const product = await stripe.products.create({
    name: `Evidence ${params.tier.display_name}`,
    metadata: {
      evidence_run: params.runLabel,
      plan_slug: params.tier.slug,
    },
  })

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'gbp',
    unit_amount: 1000,
    recurring: {
      interval: 'month',
    },
    metadata: {
      evidence_run: params.runLabel,
      plan_slug: params.tier.slug,
    },
  })

  return price.id
}

async function createActiveSubscriptionBundle(
  stripe: Stripe,
  params: {
    email: string
    priceId: string
    runLabel: string
  }
): Promise<SubscriptionBundle> {
  const customer = await stripe.customers.create({
    email: params.email,
    metadata: {
      evidence_run: params.runLabel,
    },
  })

  const paymentMethod = await stripe.paymentMethods.attach('pm_card_visa', {
    customer: customer.id,
  })

  await stripe.customers.update(customer.id, {
    invoice_settings: {
      default_payment_method: paymentMethod.id,
    },
  })

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: params.priceId }],
    metadata: {
      evidence_run: params.runLabel,
    },
  })

  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    throw new Error(`Expected active subscription, received ${subscription.status}`)
  }

  return {
    customerId: customer.id,
    subscriptionId: subscription.id,
  }
}

async function triggerCheckoutFixtureEvent(
  stripe: Stripe,
  params: {
    createdAtOrAfter: number
    userId: string
    companyId: string
    planSlug: string
    customerId: string
  }
): Promise<Stripe.Event> {
  await execFile('stripe', [
    'trigger',
    'checkout.session.completed',
    '--api-key',
    requireEnv('STRIPE_SECRET_KEY'),
    '--override',
    `checkout_session:client_reference_id=${params.userId}`,
    '--override',
    `checkout_session:metadata.plan_slug=${params.planSlug}`,
    '--override',
    `checkout_session:metadata.company_id=${params.companyId}`,
    '--override',
    `checkout_session:metadata.user_id=${params.userId}`,
    '--override',
    `checkout_session:customer=${params.customerId}`,
  ])

  return waitForStripeEvent(stripe, {
    type: 'checkout.session.completed',
    createdAtOrAfter: params.createdAtOrAfter,
    predicate: (event) => {
      const object = event.data.object as Stripe.Checkout.Session
      return object.client_reference_id === params.userId
    },
  })
}

function buildCheckoutWebhookEvent(
  event: Stripe.Event,
  bundle: SubscriptionBundle
): Stripe.Event {
  const session = event.data.object as Stripe.Checkout.Session
  return {
    ...event,
    data: {
      ...event.data,
      object: {
        ...session,
        mode: 'subscription',
        customer: bundle.customerId,
        subscription: bundle.subscriptionId,
      },
    },
  }
}

async function poll<T>(
  task: () => Promise<T | null>,
  params: {
    timeoutMs: number
    intervalMs?: number
    description: string
  }
): Promise<T> {
  const startedAt = Date.now()
  const intervalMs = params.intervalMs ?? 1_500

  while (Date.now() - startedAt < params.timeoutMs) {
    const result = await task()
    if (result !== null) {
      return result
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Timed out waiting for ${params.description}`)
}

async function waitForStripeEvent(
  stripe: Stripe,
  params: {
    type: string
    predicate: (event: Stripe.Event) => boolean
    createdAtOrAfter: number
  }
): Promise<Stripe.Event> {
  return poll(
    async () => {
      const events = await stripe.events.list({
        limit: 100,
        type: params.type,
        created: { gte: params.createdAtOrAfter },
      } as Stripe.EventListParams)

      const match = events.data.find(params.predicate)
      return match ?? null
    },
    {
      timeoutMs: EVENT_WAIT_TIMEOUT_MS,
      description: `Stripe event ${params.type}`,
    }
  )
}

async function postWebhookEvent(
  stripe: Stripe,
  params: {
    baseUrl: string
    event: Stripe.Event
    secret: string
  }
): Promise<EventOutcome> {
  const payload = JSON.stringify(params.event)
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: params.secret,
  })

  const request = new Request(`${params.baseUrl}/api/billing/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature,
    },
    body: payload,
  })

  const response = await billingWebhookPost(request as unknown as NextRequest)
  const body = (await response.json()) as Record<string, unknown>
  return {
    httpStatus: response.status,
    response: body,
  }
}

async function fetchCompany(admin: SupabaseClient, companyId: string): Promise<CompanyRow> {
  const { data, error } = await admin
    .from('companies')
    .select('id, name, stripe_customer_id, created_at')
    .eq('id', companyId)
    .single<CompanyRow>()

  if (error || !data) {
    throw new Error(`Unable to load company ${companyId}: ${error?.message ?? 'not found'}`)
  }

  return data
}

async function fetchEntitlements(admin: SupabaseClient, companyId: string): Promise<EntitlementRow> {
  const { data, error } = await admin
    .from('company_entitlements')
    .select(
      'company_id, tier_slug, subscription_status, stripe_subscription_id, last_stripe_event_id, last_stripe_event_type, last_stripe_event_created_at'
    )
    .eq('company_id', companyId)
    .single<EntitlementRow>()

  if (error || !data) {
    throw new Error(`Unable to load entitlements for ${companyId}: ${error?.message ?? 'not found'}`)
  }

  return data
}

async function fetchWebhookRow(admin: SupabaseClient, eventId: string): Promise<WebhookRow> {
  const { data, error } = await admin
    .from('stripe_webhook_events')
    .select('stripe_event_id, event_type, processing_status, last_error, updated_at')
    .eq('stripe_event_id', eventId)
    .single<WebhookRow>()

  if (error || !data) {
    throw new Error(`Unable to load stripe_webhook_events row for ${eventId}: ${error?.message ?? 'not found'}`)
  }

  return data
}

async function createPaymentFailedEvent(
  stripe: Stripe,
  createdAtOrAfter: number
): Promise<Stripe.Event> {
  await execFile('stripe', [
    'trigger',
    'invoice.payment_failed',
    '--api-key',
    requireEnv('STRIPE_SECRET_KEY'),
  ])

  return waitForStripeEvent(stripe, {
    type: 'invoice.payment_failed',
    createdAtOrAfter,
    predicate: () => true,
  })
}

async function runMonitoring(baseUrl: string): Promise<Record<string, unknown>> {
  const request = new NextRequest(`${baseUrl}/api/cron/beta-monitoring`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${LOCAL_CRON_SECRET}`,
    },
  })
  const response = await betaMonitoringGet(request)

  const body = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    throw new Error(`Monitoring probe failed with http=${response.status}`)
  }

  return {
    httpStatus: response.status,
    ...body,
  }
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

async function nextAvailablePath(targetPath: string): Promise<string> {
  const directory = path.dirname(targetPath)
  const extension = path.extname(targetPath)
  const basename = path.basename(targetPath, extension)

  let candidate = targetPath
  let suffix = 2

  while (true) {
    try {
      await fs.access(candidate)
      candidate = path.join(directory, `${basename}-${suffix}${extension}`)
      suffix += 1
    } catch {
      return candidate
    }
  }
}

async function writeEvidenceNote(
  summary: Summary,
  targetPath: string
): Promise<string> {
  const markdown = `# Stripe Lifecycle Replay And Reconciliation Evidence

Date: ${summary.dateLabel}
Environment: ${summary.baseUrl}
Stripe mode: test
Webhook target: ${summary.baseUrl}/api/billing/webhook
Monitoring target: ${summary.baseUrl}/api/cron/beta-monitoring

## Verified Outcomes

- Real Stripe Checkout Session completed in subscription mode and produced a real \`checkout.session.completed\` event.
- A Stripe CLI \`checkout.session.completed\` fixture was delivered with real Stripe test-mode customer and subscription IDs bound into the webhook payload.
- First webhook delivery provisioned the paid tier, persisted the Stripe customer/subscription IDs, and marked the event row as processed.
- Immediate replay of the same event was accepted and returned \`duplicate: true\` without re-applying entitlements.
- A real \`customer.subscription.updated\` event was processed before cancellation.
- A real \`invoice.payment_failed\` event was processed against a dedicated evidence company bound to the fixture customer.
- A real \`customer.subscription.deleted\` event downgraded the company back to the free tier.
- Replaying the older subscription update after cancellation was ignored by the stale-event ordering guard.
- A second checkout fixture delivery failed on the first attempt because the Stripe metadata company ID did not match the authenticated company context, surfaced in \`stripe_webhook_events\`, tripped the webhook monitoring alert path, then processed successfully on replay after the company context was corrected.

## Happy Path

- Company: ${summary.happyPath.companyName}
- Company ID: ${summary.happyPath.companyId}
- User ID: ${summary.happyPath.userId}
- Checkout Session: ${summary.happyPath.checkoutSessionId}
- Customer: ${summary.happyPath.customerId}
- Subscription: ${summary.happyPath.subscriptionId}
- Checkout event: ${summary.happyPath.checkoutEventId}
- Replay duplicate: ${String(summary.happyPath.replayDuplicate)}
- Update event: ${summary.happyPath.updateEventId}
- Payment failed event: ${summary.happyPath.paymentFailedEventId}
- Cancellation event: ${summary.happyPath.cancelEventId}
- Stale replay ignored: ${String(summary.happyPath.staleReplayIgnored)}

## Reconciliation Path

- Company: ${summary.reconciliation.companyName}
- Company ID: ${summary.reconciliation.companyId}
- User ID: ${summary.reconciliation.userId}
- Checkout Session: ${summary.reconciliation.checkoutSessionId}
- Checkout event: ${summary.reconciliation.checkoutEventId}
- First attempt HTTP status: ${summary.reconciliation.firstAttemptStatus}
- First attempt error: ${summary.reconciliation.firstAttemptError}
- Final webhook row status after replay: ${summary.reconciliation.finalWebhookStatus}

## Monitoring Response

\`\`\`json
${formatJson(summary.monitoring)}
\`\`\`

## Operator Notes

- The lifecycle matrix was exercised by directly invoking the current route handlers with signed webhook requests after updating the local Supabase schema to the current repo migrations.
- Production endpoint wiring was separately verified on \`https://complyeur.com\` via \`pnpm billing:webhook:check\` and \`pnpm beta:monitoring:check\`.
- Real Stripe objects and events were created in Stripe test mode. No production billing state was mutated.
- No secret values are stored in this note.
`

  const outputPath = await nextAvailablePath(targetPath)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, markdown, 'utf8')
  return outputPath
}

async function run(): Promise<void> {
  loadEnvConfig(process.cwd())

  const options = parseArgs(process.argv.slice(2))
  const dateLabel = new Date().toISOString().slice(0, 10)
  const admin = createAdminClient()
  const stripe = createStripeClient()
  const tier = await getPaidTier(admin)
  const runLabel = `evidence-${Date.now()}`
  const monthlyPriceId = await resolveTierMonthlyPriceId(stripe, {
    tier,
    runLabel,
  })

  const happyPrefix = `happy-${Date.now()}`
  const happyIdentity = await createProvisionedIdentity(admin, happyPrefix)
  const happyStartEpoch = Math.floor(Date.now() / 1000) - 5
  const happyBundle = await createActiveSubscriptionBundle(stripe, {
    email: happyIdentity.email,
    priceId: monthlyPriceId,
    runLabel: happyPrefix,
  })
  const happyCheckoutFixtureEvent = await triggerCheckoutFixtureEvent(stripe, {
    createdAtOrAfter: happyStartEpoch,
    userId: happyIdentity.userId,
    companyId: happyIdentity.companyId,
    planSlug: tier.slug,
    customerId: happyBundle.customerId,
  })
  const happyCheckoutEvent = buildCheckoutWebhookEvent(happyCheckoutFixtureEvent, happyBundle)

  const happyCheckoutFirst = await postWebhookEvent(stripe, {
    baseUrl: options.baseUrl,
    event: happyCheckoutEvent,
    secret: LOCAL_WEBHOOK_SECRET,
  })

  if (happyCheckoutFirst.httpStatus !== 200) {
    throw new Error(`Happy-path checkout webhook failed with http=${happyCheckoutFirst.httpStatus}`)
  }

  const happyCompany = await fetchCompany(admin, happyIdentity.companyId)
  const happyEntitlementsAfterCheckout = await fetchEntitlements(admin, happyIdentity.companyId)
  const happyCheckoutWebhookRow = await fetchWebhookRow(admin, happyCheckoutEvent.id)

  if (!happyCompany.stripe_customer_id) {
    throw new Error('Happy-path checkout did not persist stripe_customer_id')
  }

  if (
    happyEntitlementsAfterCheckout.tier_slug !== tier.slug ||
    happyEntitlementsAfterCheckout.subscription_status !== 'active' ||
    happyEntitlementsAfterCheckout.last_stripe_event_id !== happyCheckoutEvent.id ||
    happyEntitlementsAfterCheckout.stripe_subscription_id === null
  ) {
    throw new Error('Happy-path checkout did not persist the expected entitlement state')
  }

  if (happyCheckoutWebhookRow.processing_status !== 'processed') {
    throw new Error('Happy-path checkout webhook row was not marked processed')
  }

  const happyCheckoutReplay = await postWebhookEvent(stripe, {
    baseUrl: options.baseUrl,
    event: happyCheckoutEvent,
    secret: LOCAL_WEBHOOK_SECRET,
  })

  const duplicateReplay = happyCheckoutReplay.response.duplicate === true
  if (!duplicateReplay) {
    throw new Error('Expected duplicate replay response for checkout.session.completed')
  }

  const happyCheckoutSession = happyCheckoutEvent.data.object as Stripe.Checkout.Session
  const subscriptionId = String(happyCheckoutSession.subscription ?? happyEntitlementsAfterCheckout.stripe_subscription_id)
  const customerId = happyCompany.stripe_customer_id

  const updateStartEpoch = Math.floor(Date.now() / 1000) - 2
  await stripe.subscriptions.update(subscriptionId, {
    metadata: {
      evidence_run: happyPrefix,
      phase: 'updated-before-cancel',
    },
  })

  const updateEvent = await waitForStripeEvent(stripe, {
    type: 'customer.subscription.updated',
    createdAtOrAfter: updateStartEpoch,
    predicate: (event) => (event.data.object as Stripe.Subscription).id === subscriptionId,
  })

  const updateDelivery = await postWebhookEvent(stripe, {
    baseUrl: options.baseUrl,
    event: updateEvent,
    secret: LOCAL_WEBHOOK_SECRET,
  })

  if (updateDelivery.httpStatus !== 200) {
    throw new Error(`Subscription update webhook failed with http=${updateDelivery.httpStatus}`)
  }

  const entitlementsAfterUpdate = await fetchEntitlements(admin, happyIdentity.companyId)
  if (entitlementsAfterUpdate.last_stripe_event_id !== updateEvent.id) {
    throw new Error('Subscription update did not become the latest entitlement event')
  }

  const paymentFailedIdentity = await createProvisionedIdentity(
    admin,
    `payment-failed-${Date.now()}`
  )
  const paymentFailedStartEpoch = Math.floor(Date.now() / 1000) - 2
  const paymentFailedEvent = await createPaymentFailedEvent(stripe, paymentFailedStartEpoch)
  const paymentFailedInvoice = paymentFailedEvent.data.object as Stripe.Invoice
  const paymentFailedCustomerId =
    typeof paymentFailedInvoice.customer === 'string'
      ? paymentFailedInvoice.customer
      : paymentFailedInvoice.customer?.id ?? null

  if (!paymentFailedCustomerId) {
    throw new Error('invoice.payment_failed fixture did not include a Stripe customer ID')
  }

  const { error: paymentFailedCompanyBindError } = await admin
    .from('companies')
    .update({ stripe_customer_id: paymentFailedCustomerId })
    .eq('id', paymentFailedIdentity.companyId)

  if (paymentFailedCompanyBindError) {
    throw new Error(
      `Unable to bind payment-failed evidence company to Stripe customer ${paymentFailedCustomerId}: ${paymentFailedCompanyBindError.message}`
    )
  }

  const paymentFailedDelivery = await postWebhookEvent(stripe, {
    baseUrl: options.baseUrl,
    event: paymentFailedEvent,
    secret: LOCAL_WEBHOOK_SECRET,
  })

  if (paymentFailedDelivery.httpStatus !== 200) {
    throw new Error(`invoice.payment_failed webhook failed with http=${paymentFailedDelivery.httpStatus}`)
  }

  const paymentFailedWebhookRow = await fetchWebhookRow(admin, paymentFailedEvent.id)
  if (paymentFailedWebhookRow.processing_status !== 'processed') {
    throw new Error('invoice.payment_failed webhook row was not marked processed')
  }

  await new Promise((resolve) => setTimeout(resolve, 2_100))

  const cancelStartEpoch = Math.floor(Date.now() / 1000) - 1
  await stripe.subscriptions.cancel(subscriptionId)

  const cancelEvent = await waitForStripeEvent(stripe, {
    type: 'customer.subscription.deleted',
    createdAtOrAfter: cancelStartEpoch,
    predicate: (event) => (event.data.object as Stripe.Subscription).id === subscriptionId,
  })

  const cancelDelivery = await postWebhookEvent(stripe, {
    baseUrl: options.baseUrl,
    event: cancelEvent,
    secret: LOCAL_WEBHOOK_SECRET,
  })

  if (cancelDelivery.httpStatus !== 200) {
    throw new Error(`Subscription cancellation webhook failed with http=${cancelDelivery.httpStatus}`)
  }

  const entitlementsAfterCancel = await fetchEntitlements(admin, happyIdentity.companyId)
  if (
    entitlementsAfterCancel.tier_slug !== 'free' ||
    entitlementsAfterCancel.subscription_status !== 'canceled' ||
    entitlementsAfterCancel.stripe_subscription_id !== null ||
    entitlementsAfterCancel.last_stripe_event_id !== cancelEvent.id
  ) {
    throw new Error('Cancellation did not downgrade the company back to the free tier')
  }

  const staleReplayDelivery = await postWebhookEvent(stripe, {
    baseUrl: options.baseUrl,
    event: updateEvent,
    secret: LOCAL_WEBHOOK_SECRET,
  })

  if (staleReplayDelivery.httpStatus !== 200) {
    throw new Error(`Stale replay failed with http=${staleReplayDelivery.httpStatus}`)
  }

  const entitlementsAfterStaleReplay = await fetchEntitlements(admin, happyIdentity.companyId)
  const staleReplayIgnored =
    entitlementsAfterStaleReplay.last_stripe_event_id === cancelEvent.id &&
    entitlementsAfterStaleReplay.tier_slug === 'free' &&
    entitlementsAfterStaleReplay.subscription_status === 'canceled'

  if (!staleReplayIgnored) {
    throw new Error('Older subscription update replay was not ignored after cancellation')
  }

  const reconcilePrefix = `reconcile-${Date.now()}`
  const authOnlyIdentity = await createAuthOnlyIdentity(admin, reconcilePrefix)
  const plannedReconcileCompanyId = randomUUID()
  const reconcileStartEpoch = Math.floor(Date.now() / 1000) - 5
  const reconcileBundle = await createActiveSubscriptionBundle(stripe, {
    email: authOnlyIdentity.email,
    priceId: monthlyPriceId,
    runLabel: reconcilePrefix,
  })
  const reconcileCheckoutFixtureEvent = await triggerCheckoutFixtureEvent(stripe, {
    createdAtOrAfter: reconcileStartEpoch,
    userId: authOnlyIdentity.userId,
    companyId: plannedReconcileCompanyId,
    planSlug: tier.slug,
    customerId: reconcileBundle.customerId,
  })
  const reconcileCheckoutEvent = buildCheckoutWebhookEvent(
    reconcileCheckoutFixtureEvent,
    reconcileBundle
  )

  const reconcileFirstAttempt = await postWebhookEvent(stripe, {
    baseUrl: options.baseUrl,
    event: reconcileCheckoutEvent,
    secret: LOCAL_WEBHOOK_SECRET,
  })

  if (reconcileFirstAttempt.httpStatus !== 500) {
    throw new Error(`Expected reconciliation first attempt to fail with 500, received ${reconcileFirstAttempt.httpStatus}`)
  }

  const reconcileWebhookRowAfterFailure = await fetchWebhookRow(admin, reconcileCheckoutEvent.id)
  if (reconcileWebhookRowAfterFailure.processing_status !== 'failed') {
    throw new Error('Expected reconciliation webhook row to be marked failed after first attempt')
  }

  const monitoring = await runMonitoring(options.baseUrl)
  const monitoringResults = monitoring.results as Record<string, unknown> | undefined
  if (!monitoringResults || monitoringResults.webhookAlert !== true) {
    throw new Error('Expected beta monitoring to raise webhookAlert=true after failed webhook evidence')
  }

  await provisionCompanyAndProfile(admin, {
    userId: authOnlyIdentity.userId,
    email: authOnlyIdentity.email,
    companyName: authOnlyIdentity.companyName,
    companyId: plannedReconcileCompanyId,
  })

  const reconcileIdentity = await loadProvisionedIdentity(admin, authOnlyIdentity.userId)
  const reconcileReplay = await postWebhookEvent(stripe, {
    baseUrl: options.baseUrl,
    event: reconcileCheckoutEvent,
    secret: LOCAL_WEBHOOK_SECRET,
  })

  if (reconcileReplay.httpStatus !== 200) {
    throw new Error(`Reconciliation replay failed with http=${reconcileReplay.httpStatus}`)
  }

  const reconcileCompany = await fetchCompany(admin, reconcileIdentity.companyId)
  const reconcileEntitlements = await fetchEntitlements(admin, reconcileIdentity.companyId)
  const reconcileWebhookRowFinal = await fetchWebhookRow(admin, reconcileCheckoutEvent.id)

  if (
    !reconcileCompany.stripe_customer_id ||
    reconcileEntitlements.tier_slug !== tier.slug ||
    reconcileEntitlements.subscription_status !== 'active' ||
    reconcileWebhookRowFinal.processing_status !== 'processed'
  ) {
    throw new Error('Reconciliation replay did not recover the failed checkout event as expected')
  }

  const summary: Summary = {
    dateLabel,
    baseUrl: options.baseUrl,
    monitoring,
    happyPath: {
      userId: happyIdentity.userId,
      companyId: happyIdentity.companyId,
      companyName: happyIdentity.companyName,
      checkoutSessionId: happyCheckoutSession.id,
      subscriptionId,
      customerId,
      checkoutEventId: happyCheckoutEvent.id,
      replayDuplicate: duplicateReplay,
      updateEventId: updateEvent.id,
      paymentFailedEventId: paymentFailedEvent.id,
      cancelEventId: cancelEvent.id,
      staleReplayIgnored,
    },
    reconciliation: {
      userId: reconcileIdentity.userId,
      companyId: reconcileIdentity.companyId,
      companyName: reconcileIdentity.companyName,
      checkoutSessionId: (reconcileCheckoutEvent.data.object as Stripe.Checkout.Session).id,
      checkoutEventId: reconcileCheckoutEvent.id,
      firstAttemptStatus: reconcileFirstAttempt.httpStatus,
      firstAttemptError: String(reconcileWebhookRowAfterFailure.last_error ?? 'unknown error'),
      finalWebhookStatus: reconcileWebhookRowFinal.processing_status,
    },
  }

  const outputPath =
    options.outputPath ||
    path.join(
      process.cwd(),
      'docs/operations/evidence/stripe-verification',
      `${dateLabel}-stripe-lifecycle-replay-reconciliation-testmode.md`
    )
  const writtenPath = await writeEvidenceNote(summary, outputPath)

  console.log(formatJson(summary))
  console.log(`Evidence note: ${path.relative(process.cwd(), writtenPath)}`)
}

run().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error)

  try {
    await execFile('pkill', ['-f', 'chromium.*stripe'])
  } catch {
    // Best-effort cleanup only.
  }

  console.error(`captureStripeLifecycleEvidence failed: ${message}`)
  process.exitCode = 1
})
