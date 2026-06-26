import process from 'node:process'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { getPlanBySlug } from '../lib/billing/plans'

interface PriceAuditRecord {
  slug: string
  interval: 'monthly' | 'annual'
  priceId: string
  valid: boolean
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
  return {
    json: argv.includes('--json'),
    failOnInvalid: !argv.includes('--allow-invalid'),
  }
}

function formatMoney(amountMinor: number | null, currency: string | null): string {
  if (amountMinor === null || !currency) return 'n/a'
  return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`
}

function expectedPriceForTier(
  slug: string,
  interval: 'monthly' | 'annual'
): { amountMinor: number; currency: 'gbp'; stripeInterval: 'month' | 'year' } | null {
  const plan = getPlanBySlug(slug)
  if (!plan) return null

  return {
    amountMinor: (interval === 'monthly' ? plan.monthlyPriceGbp : plan.annualPriceGbp) * 100,
    currency: 'gbp',
    stripeInterval: interval === 'monthly' ? 'month' : 'year',
  }
}

async function auditStripePriceIds(): Promise<PriceAuditRecord[]> {
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

  const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
    typescript: true,
  })

  const { data: tiers, error } = await supabase
    .from('tiers')
    .select('slug, stripe_price_id_monthly, stripe_price_id_annual')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to query tiers: ${error.message}`)
  }

  const records: PriceAuditRecord[] = []

  for (const tier of tiers ?? []) {
    const checks: Array<{ interval: 'monthly' | 'annual'; priceId: string | null }> = [
      { interval: 'monthly', priceId: tier.stripe_price_id_monthly },
      { interval: 'annual', priceId: tier.stripe_price_id_annual },
    ]

    for (const check of checks) {
      if (!check.priceId) continue

      try {
        const price = await stripe.prices.retrieve(check.priceId)
        const expected = expectedPriceForTier(tier.slug, check.interval)
        if (!expected) {
          records.push({
            slug: tier.slug,
            interval: check.interval,
            priceId: check.priceId,
            valid: false,
            detail: 'No matching local plan catalog entry',
          })
          continue
        }

        const recurringInterval = price.recurring?.interval ?? 'one_time'
        const intervalCount = price.recurring?.interval_count ?? 0
        const actualAmount = formatMoney(price.unit_amount, price.currency)
        const expectedAmount = formatMoney(expected.amountMinor, expected.currency)
        const issues: string[] = []

        if (!price.active) {
          issues.push('price is inactive')
        }

        if (price.unit_amount !== expected.amountMinor) {
          issues.push(`amount expected ${expectedAmount}, got ${actualAmount}`)
        }

        if (price.currency !== expected.currency) {
          issues.push(`currency expected ${expected.currency.toUpperCase()}, got ${price.currency.toUpperCase()}`)
        }

        if (recurringInterval !== expected.stripeInterval) {
          issues.push(`interval expected ${expected.stripeInterval}, got ${recurringInterval}`)
        }

        if (intervalCount !== 1) {
          issues.push(`interval_count expected 1, got ${intervalCount}`)
        }

        records.push({
          slug: tier.slug,
          interval: check.interval,
          priceId: check.priceId,
          valid: issues.length === 0,
          detail:
            issues.length > 0
              ? issues.join('; ')
              : `ok (${actualAmount}, ${recurringInterval}, active=${price.active})`,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown Stripe error'
        records.push({
          slug: tier.slug,
          interval: check.interval,
          priceId: check.priceId,
          valid: false,
          detail: message,
        })
      }
    }
  }

  return records
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2))
  const records = await auditStripePriceIds()

  if (options.json) {
    console.log(JSON.stringify(records, null, 2))
  } else {
    for (const record of records) {
      const status = record.valid ? 'VALID' : 'INVALID'
      console.log(
        `[${status}] tier=${record.slug} interval=${record.interval} price=${record.priceId} :: ${record.detail}`
      )
    }
  }

  const invalidCount = records.filter((record) => !record.valid).length
  const validCount = records.length - invalidCount
  console.log(
    `[auditStripePriceIds] Summary: valid=${validCount}, invalid=${invalidCount}, total=${records.length}`
  )

  if (invalidCount > 0 && options.failOnInvalid) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(
    `[auditStripePriceIds] Fatal error: ${
      error instanceof Error ? error.message : 'unknown error'
    }`
  )
  process.exit(1)
})
