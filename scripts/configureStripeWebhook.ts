import process from 'node:process'
import Stripe from 'stripe'

const REQUIRED_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]

interface CliOptions {
  endpoint?: string
  checkOnly: boolean
  listAll: boolean
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
    checkOnly: argv.includes('--check'),
    listAll: argv.includes('--list'),
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--endpoint') {
      options.endpoint = argv[i + 1]
      i += 1
    }
  }

  return options
}

function normalizeEndpoint(rawEndpoint?: string): string {
  if (rawEndpoint && rawEndpoint.trim().length > 0) {
    return rawEndpoint.trim()
  }

  const baseUrl = process.env.STRIPE_WEBHOOK_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    throw new Error(
      'No endpoint provided. Pass --endpoint or set STRIPE_WEBHOOK_BASE_URL (or NEXT_PUBLIC_APP_URL).'
    )
  }

  return `${baseUrl.replace(/\/+$/, '')}/api/billing/webhook`
}

function sortEvents(events: string[]): string[] {
  return [...events].sort((a, b) => a.localeCompare(b))
}

async function listAllEndpoints(stripe: Stripe) {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
  if (endpoints.data.length === 0) {
    console.log('[configureStripeWebhook] No webhook endpoints found in Stripe account.')
    return
  }

  console.log('[configureStripeWebhook] Existing Stripe webhook endpoints:')
  for (const endpoint of endpoints.data) {
    console.log(
      `- id=${endpoint.id} status=${endpoint.status} url=${endpoint.url} events=${endpoint.enabled_events.join(',')}`
    )
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2))
  const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
    typescript: true,
  })

  if (options.listAll) {
    await listAllEndpoints(stripe)
    return
  }

  const endpointUrl = normalizeEndpoint(options.endpoint)
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
  const existing = endpoints.data.find((endpoint) => endpoint.url === endpointUrl)
  const requiredEventsSorted = sortEvents(REQUIRED_EVENTS)

  if (!existing) {
    if (options.checkOnly) {
      console.error(
        `[configureStripeWebhook] Missing webhook endpoint for ${endpointUrl}.`
      )
      process.exit(1)
      return
    }

    const created = await stripe.webhookEndpoints.create({
      url: endpointUrl,
      enabled_events: REQUIRED_EVENTS,
      description: 'ComplyEur billing webhook',
      metadata: {
        app: 'complyeur',
        route: '/api/billing/webhook',
      },
    })

    console.log(`[configureStripeWebhook] Created endpoint ${created.id} (${created.url})`)
    console.log(`[configureStripeWebhook] Status: ${created.status}`)
    if (created.secret) {
      console.log(
        `[configureStripeWebhook] Save this secret as STRIPE_WEBHOOK_SECRET: ${created.secret}`
      )
    } else {
      console.log(
        '[configureStripeWebhook] Stripe did not return a secret. Retrieve it from Stripe Dashboard.'
      )
    }
    return
  }

  const existingEventsSorted = sortEvents(existing.enabled_events)
  const eventsMatch =
    requiredEventsSorted.length === existingEventsSorted.length &&
    requiredEventsSorted.every((event, idx) => event === existingEventsSorted[idx])

  if (options.checkOnly) {
    if (!eventsMatch) {
      console.error(
        `[configureStripeWebhook] Endpoint ${existing.id} exists but events do not match required set.`
      )
      process.exit(1)
      return
    }

    console.log(
      `[configureStripeWebhook] Endpoint ${existing.id} is configured correctly for ${endpointUrl}.`
    )
    return
  }

  if (!eventsMatch) {
    const updated = await stripe.webhookEndpoints.update(existing.id, {
      enabled_events: REQUIRED_EVENTS,
    })
    console.log(`[configureStripeWebhook] Updated events on endpoint ${updated.id}.`)
  } else {
    console.log(
      `[configureStripeWebhook] Endpoint ${existing.id} already has required events.`
    )
  }

  console.log(
    '[configureStripeWebhook] Keep STRIPE_WEBHOOK_SECRET in sync with this endpoint secret from Stripe Dashboard.'
  )
}

main().catch((error) => {
  console.error(
    `[configureStripeWebhook] Fatal error: ${
      error instanceof Error ? error.message : 'unknown error'
    }`
  )
  process.exit(1)
})
