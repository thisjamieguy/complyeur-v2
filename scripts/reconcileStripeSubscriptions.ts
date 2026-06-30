import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { getStripe } from '../lib/billing/stripe'
import type { Database } from '../types/database'

type EntitlementRow =
  Database['public']['Tables']['company_entitlements']['Row'] & {
    stripe_subscription_id: string
  }

type TierRow = Database['public']['Tables']['tiers']['Row']

interface ReconcileResult {
  companyId: string
  subscriptionId: string
  status: string
  updated: boolean
  detail: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function parseCliArgs(argv: string[]) {
  const subscriptionArgIndex = argv.indexOf('--subscription')
  const subscriptionId =
    subscriptionArgIndex >= 0 ? argv[subscriptionArgIndex + 1] ?? null : null

  return {
    dryRun: argv.includes('--dry-run'),
    json: argv.includes('--json'),
    subscriptionId,
  }
}

function currentPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end
  return currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null
}

function tierFeatureUpdates(tier: TierRow): Record<string, unknown> {
  return {
    tier_slug: tier.slug,
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
  }
}

function buildTierByPriceId(tiers: TierRow[]): Map<string, TierRow> {
  const byPriceId = new Map<string, TierRow>()

  for (const tier of tiers) {
    if (tier.stripe_price_id_monthly) {
      byPriceId.set(tier.stripe_price_id_monthly, tier)
    }
    if (tier.stripe_price_id_annual) {
      byPriceId.set(tier.stripe_price_id_annual, tier)
    }
  }

  return byPriceId
}

async function reconcileStripeSubscriptions(): Promise<ReconcileResult[]> {
  const options = parseCliArgs(process.argv.slice(2))
  const supabase = createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
  const stripe = getStripe()

  let entitlementsQuery = supabase
    .from('company_entitlements')
    .select('*')
    .not('stripe_subscription_id', 'is', null)
    .order('updated_at', { ascending: false })

  if (options.subscriptionId) {
    entitlementsQuery = entitlementsQuery.eq('stripe_subscription_id', options.subscriptionId)
  }

  const { data: entitlements, error: entitlementsError } = await entitlementsQuery
    .returns<EntitlementRow[]>()

  if (entitlementsError) {
    throw new Error(`Failed to query entitlements: ${entitlementsError.message}`)
  }

  const { data: tiers, error: tiersError } = await supabase.from('tiers').select('*')
  if (tiersError) {
    throw new Error(`Failed to query tiers: ${tiersError.message}`)
  }

  const tierByPriceId = buildTierByPriceId(tiers ?? [])
  const freeTier = (tiers ?? []).find((tier) => tier.slug === 'free') ?? null
  const results: ReconcileResult[] = []

  for (const entitlement of entitlements ?? []) {
    const subscription = await stripe.subscriptions.retrieve(entitlement.stripe_subscription_id)
    const updates: Record<string, unknown> = {
      subscription_status: subscription.status,
      current_period_end: currentPeriodEndIso(subscription),
    }

    if (subscription.status === 'canceled') {
      updates.stripe_subscription_id = null
      updates.is_trial = false
      updates.trial_ends_at = null
      updates.current_period_end = null

      if (freeTier) {
        Object.assign(updates, tierFeatureUpdates(freeTier))
      }
    } else {
      const priceId = subscription.items.data[0]?.price?.id ?? null
      const tier = priceId ? tierByPriceId.get(priceId) ?? null : null

      if (tier) {
        Object.assign(updates, tierFeatureUpdates(tier), {
          is_trial: false,
          trial_ends_at: null,
        })
      }
    }

    if (!options.dryRun) {
      const { error: updateError } = await supabase
        .from('company_entitlements')
        .update(updates)
        .eq('company_id', entitlement.company_id)
        .eq('stripe_subscription_id', entitlement.stripe_subscription_id)

      if (updateError) {
        throw new Error(
          `Failed to update ${entitlement.company_id}: ${updateError.message}`
        )
      }
    }

    results.push({
      companyId: entitlement.company_id,
      subscriptionId: entitlement.stripe_subscription_id,
      status: subscription.status,
      updated: !options.dryRun,
      detail:
        subscription.status === 'canceled'
          ? 'canceled subscription downgraded to free tier'
          : `period end ${updates.current_period_end ?? 'n/a'}`,
    })
  }

  return results
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2))
  const results = await reconcileStripeSubscriptions()

  if (options.json) {
    console.log(JSON.stringify(results, null, 2))
  } else {
    for (const result of results) {
      const status = result.updated ? 'UPDATED' : 'DRY-RUN'
      console.log(
        `[${status}] company=${result.companyId} subscription=${result.subscriptionId} status=${result.status} :: ${result.detail}`
      )
    }
  }

  console.log(`[reconcileStripeSubscriptions] Summary: total=${results.length}`)
}

main().catch((error) => {
  console.error(
    `[reconcileStripeSubscriptions] Fatal error: ${
      error instanceof Error ? error.message : 'unknown error'
    }`
  )
  process.exit(1)
})
