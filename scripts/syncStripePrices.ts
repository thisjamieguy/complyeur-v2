import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import Stripe from 'stripe'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

type BillingInterval = 'monthly' | 'annual' | 'both'

type PriceMappingValue =
  | string
  | {
      monthly?: string
      annual?: string
    }

export type StripePriceMapping = Record<string, PriceMappingValue>

interface CliOptions {
  mappingFile?: string
  mappingJson?: string
  interval: BillingInterval
  dryRun: boolean
}

interface TierPriceUpdate {
  slug: string
  stripe_price_id_monthly?: string
  stripe_price_id_annual?: string
}

interface SyncSuccess {
  slug: string
  updatedColumns: Array<'stripe_price_id_monthly' | 'stripe_price_id_annual'>
}

interface SyncFailure {
  slug: string
  reason: string
}

export interface SyncStripePricesResult {
  updated: SyncSuccess[]
  skipped: string[]
  failed: SyncFailure[]
}

interface SyncStripePricesDeps {
  stripe?: Pick<Stripe, 'prices'>
  supabase?: Pick<SupabaseClient<Database>, 'from'>
  logger?: Pick<Console, 'info' | 'warn' | 'error'>
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    interval: 'monthly',
    dryRun: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--mapping') {
      options.mappingFile = argv[i + 1]
      i += 1
      continue
    }

    if (arg === '--mapping-json') {
      options.mappingJson = argv[i + 1]
      i += 1
      continue
    }

    if (arg === '--interval') {
      const value = argv[i + 1] as BillingInterval | undefined
      if (!value || !['monthly', 'annual', 'both'].includes(value)) {
        throw new Error("Invalid --interval value. Use 'monthly', 'annual', or 'both'.")
      }
      options.interval = value
      i += 1
      continue
    }

    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }
  }

  return options
}

function printUsage() {
  console.info(
    [
      'Usage:',
      '  pnpm tsx scripts/syncStripePrices.ts --mapping ./stripe-prices.json',
      '  pnpm tsx scripts/syncStripePrices.ts --mapping-json \'{"starter":"price_123"}\'',
      '',
      'Options:',
      '  --mapping <file>       Path to JSON file containing slug => price mapping',
      '  --mapping-json <json>  Inline JSON mapping (or use STRIPE_PRICE_MAPPING_JSON env var)',
      "  --interval <value>     'monthly' (default), 'annual', or 'both'",
      '  --dry-run              Validate and preview without writing to Supabase',
    ].join('\n')
  )
}

async function loadMapping(options: CliOptions): Promise<StripePriceMapping> {
  const inlineMapping = options.mappingJson ?? process.env.STRIPE_PRICE_MAPPING_JSON

  if (inlineMapping) {
    return parseMappingJson(inlineMapping)
  }

  if (!options.mappingFile) {
    throw new Error(
      'No mapping provided. Use --mapping, --mapping-json, or STRIPE_PRICE_MAPPING_JSON.'
    )
  }

  const mappingPath = path.resolve(process.cwd(), options.mappingFile)
  const mappingContents = await fs.readFile(mappingPath, 'utf8')
  return parseMappingJson(mappingContents)
}

function parseMappingJson(raw: string): StripePriceMapping {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(
      `Failed to parse mapping JSON: ${error instanceof Error ? error.message : 'unknown error'}`
    )
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Price mapping must be a JSON object of slug => price configuration.')
  }

  return parsed as StripePriceMapping
}

function normalizeMapping(
  mapping: StripePriceMapping,
  interval: BillingInterval
): TierPriceUpdate[] {
  const updates: TierPriceUpdate[] = []

  for (const [rawSlug, value] of Object.entries(mapping)) {
    const slug = rawSlug.trim()
    if (!slug) {
      throw new Error('Encountered an empty slug key in mapping.')
    }

    if (typeof value === 'string') {
      const priceId = value.trim()
      if (!priceId) {
        throw new Error(`Price ID for slug '${slug}' is empty.`)
      }

      if (interval === 'monthly') {
        updates.push({ slug, stripe_price_id_monthly: priceId })
      } else if (interval === 'annual') {
        updates.push({ slug, stripe_price_id_annual: priceId })
      } else {
        updates.push({
          slug,
          stripe_price_id_monthly: priceId,
          stripe_price_id_annual: priceId,
        })
      }

      continue
    }

    if (!value || typeof value !== 'object') {
      throw new Error(`Invalid mapping value for slug '${slug}'.`)
    }

    const monthly = value.monthly?.trim()
    const annual = value.annual?.trim()

    if (!monthly && !annual) {
      throw new Error(
        `Slug '${slug}' must include at least one price ID (monthly or annual).`
      )
    }

    updates.push({
      slug,
      stripe_price_id_monthly: monthly,
      stripe_price_id_annual: annual,
    })
  }

  return updates
}

async function validateStripePrices(
  stripe: Pick<Stripe, 'prices'>,
  updates: TierPriceUpdate[],
  logger: Pick<Console, 'info' | 'warn' | 'error'>
) {
  const allPriceIds = new Set<string>()
  for (const update of updates) {
    if (update.stripe_price_id_monthly) allPriceIds.add(update.stripe_price_id_monthly)
    if (update.stripe_price_id_annual) allPriceIds.add(update.stripe_price_id_annual)
  }

  for (const priceId of allPriceIds) {
    const price = await stripe.prices.retrieve(priceId)
    if (!price || !price.id) {
      throw new Error(`Stripe price '${priceId}' does not exist.`)
    }
    if (price.active !== true) {
      logger.warn(`[syncStripePrices] Stripe price '${priceId}' is inactive.`)
    }
  }
}

export async function syncStripePrices(
  mapping: StripePriceMapping,
  options: Pick<CliOptions, 'interval' | 'dryRun'>,
  deps: SyncStripePricesDeps = {}
): Promise<SyncStripePricesResult> {
  const logger = deps.logger ?? console

  const stripe =
    deps.stripe ??
    new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
      typescript: true,
    })

  const supabase =
    deps.supabase ??
    createClient<Database>(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

  const updates = normalizeMapping(mapping, options.interval)
  await validateStripePrices(stripe, updates, logger)

  const result: SyncStripePricesResult = {
    updated: [],
    skipped: [],
    failed: [],
  }

  for (const update of updates) {
    const { data: existingTier, error: readError } = await supabase
      .from('tiers')
      .select('slug, stripe_price_id_monthly, stripe_price_id_annual')
      .eq('slug', update.slug)
      .maybeSingle()

    if (readError) {
      result.failed.push({
        slug: update.slug,
        reason: `failed to query tier: ${readError.message}`,
      })
      continue
    }

    if (!existingTier) {
      result.failed.push({
        slug: update.slug,
        reason: 'tier not found',
      })
      continue
    }

    const tierUpdate: Database['public']['Tables']['tiers']['Update'] = {}
    const changedColumns: Array<'stripe_price_id_monthly' | 'stripe_price_id_annual'> = []

    if (
      update.stripe_price_id_monthly &&
      update.stripe_price_id_monthly !== existingTier.stripe_price_id_monthly
    ) {
      tierUpdate.stripe_price_id_monthly = update.stripe_price_id_monthly
      changedColumns.push('stripe_price_id_monthly')
    }

    if (
      update.stripe_price_id_annual &&
      update.stripe_price_id_annual !== existingTier.stripe_price_id_annual
    ) {
      tierUpdate.stripe_price_id_annual = update.stripe_price_id_annual
      changedColumns.push('stripe_price_id_annual')
    }

    if (changedColumns.length === 0) {
      logger.info(`[syncStripePrices] No change for tier '${update.slug}'.`)
      result.skipped.push(update.slug)
      continue
    }

    if (options.dryRun) {
      logger.info(
        `[syncStripePrices] Dry run: would update tier '${update.slug}' columns ${changedColumns.join(', ')}.`
      )
      result.updated.push({
        slug: update.slug,
        updatedColumns: changedColumns,
      })
      continue
    }

    const { error: updateError } = await supabase
      .from('tiers')
      .update(tierUpdate)
      .eq('slug', update.slug)

    if (updateError) {
      result.failed.push({
        slug: update.slug,
        reason: `update failed: ${updateError.message}`,
      })
      continue
    }

    logger.info(
      `[syncStripePrices] Updated tier '${update.slug}' columns ${changedColumns.join(', ')}.`
    )
    result.updated.push({
      slug: update.slug,
      updatedColumns: changedColumns,
    })
  }

  logger.info(
    `[syncStripePrices] Summary: updated=${result.updated.length}, skipped=${result.skipped.length}, failed=${result.failed.length}.`
  )

  if (result.failed.length > 0) {
    for (const failure of result.failed) {
      logger.error(`[syncStripePrices] ${failure.slug}: ${failure.reason}`)
    }
  }

  return result
}

export async function main() {
  const options = parseCliArgs(process.argv.slice(2))
  const mapping = await loadMapping(options)
  const result = await syncStripePrices(mapping, options)

  if (result.failed.length > 0) {
    process.exitCode = 1
  }
}

const runningAsScript = process.argv[1]
  ? /syncStripePrices\.(ts|js)$/.test(process.argv[1])
  : false

if (runningAsScript) {
  main().catch((error) => {
    console.error(
      `[syncStripePrices] Fatal error: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    )
    process.exit(1)
  })
}
