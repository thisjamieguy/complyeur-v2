import { NextRequest, NextResponse } from 'next/server'
import { SELF_SERVE_PLANS, type BillingInterval } from '@/lib/billing/plans'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type CheckoutRequestBody = {
  planSlug?: string
  billingInterval?: BillingInterval
}

const VALID_BILLING_INTERVALS = new Set<BillingInterval>(['monthly', 'annual'])
const VALID_PLAN_SLUGS: ReadonlySet<string> = new Set(
  SELF_SERVE_PLANS.map((plan) => plan.slug)
)

function resolveStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.')
  }

  return secretKey
}

function getPriceIdForInterval(
  tier: {
    stripe_price_id_monthly: string | null
    stripe_price_id_annual: string | null
  },
  billingInterval: BillingInterval
): string | null {
  return billingInterval === 'annual'
    ? tier.stripe_price_id_annual
    : tier.stripe_price_id_monthly
}

export async function POST(request: NextRequest) {
  let body: CheckoutRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request payload.' },
      { status: 400 }
    )
  }

  const planSlug = body.planSlug
  const billingInterval = body.billingInterval

  if (!planSlug || !VALID_PLAN_SLUGS.has(planSlug)) {
    return NextResponse.json(
      { error: 'Invalid plan selected.' },
      { status: 400 }
    )
  }

  if (!billingInterval || !VALID_BILLING_INTERVALS.has(billingInterval)) {
    return NextResponse.json(
      { error: 'Invalid billing interval selected.' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to your account before starting checkout.' },
        { status: 401 }
      )
    }

    const admin = createAdminClient()
    const tierResult = await admin
      .from('tiers')
      .select('slug, display_name, is_active, stripe_price_id_monthly, stripe_price_id_annual')
      .eq('slug', planSlug)
      .maybeSingle()

    if (tierResult.error) {
      console.error('[billing/checkout] Failed to read tier:', tierResult.error)
      return NextResponse.json(
        { error: 'Unable to start checkout right now. Please try again.' },
        { status: 500 }
      )
    }

    const tier = tierResult.data
    if (!tier || tier.is_active === false) {
      return NextResponse.json(
        { error: 'This plan is not currently available.' },
        { status: 404 }
      )
    }

    const stripePriceId = getPriceIdForInterval(tier, billingInterval)
    if (!stripePriceId) {
      return NextResponse.json(
        { error: 'Stripe price is not configured for this plan yet.' },
        { status: 400 }
      )
    }

    const successUrl = new URL('/pricing', request.url)
    successUrl.searchParams.set('checkout', 'success')
    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}')

    const cancelUrl = new URL('/pricing', request.url)
    cancelUrl.searchParams.set('checkout', 'cancelled')

    const stripeBody = new URLSearchParams()
    stripeBody.set('mode', 'subscription')
    stripeBody.set('success_url', successUrl.toString())
    stripeBody.set('cancel_url', cancelUrl.toString())
    stripeBody.set('line_items[0][price]', stripePriceId)
    stripeBody.set('line_items[0][quantity]', '1')
    stripeBody.set('allow_promotion_codes', 'true')
    stripeBody.set('metadata[plan_slug]', planSlug)
    stripeBody.set('metadata[billing_interval]', billingInterval)

    stripeBody.set('client_reference_id', user.id)

    if (user.email) {
      stripeBody.set('customer_email', user.email)
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolveStripeSecretKey()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeBody.toString(),
      cache: 'no-store',
    })

    const stripeData = await stripeResponse.json() as {
      url?: string
      error?: { message?: string }
    }

    if (!stripeResponse.ok || !stripeData.url) {
      console.error('[billing/checkout] Stripe session creation failed:', stripeData)
      return NextResponse.json(
        {
          error:
            stripeData.error?.message ||
            'Unable to start Stripe checkout right now.',
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ url: stripeData.url })
  } catch (error) {
    console.error('[billing/checkout] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Checkout is temporarily unavailable. Please try again.' },
      { status: 500 }
    )
  }
}
