import Stripe from 'stripe'

let _stripe: Stripe | null = null

/**
 * Get a singleton Stripe client instance.
 * Uses the STRIPE_SECRET_KEY environment variable.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable')
    }
    _stripe = new Stripe(secretKey, {
      typescript: true,
    })
  }
  return _stripe
}

/**
 * Verify and construct a Stripe webhook event from the raw body + signature.
 */
export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable')
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret)
}
