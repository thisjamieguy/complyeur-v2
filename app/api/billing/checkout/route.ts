import { NextRequest, NextResponse } from 'next/server'
import { SELF_SERVE_PLANS, type BillingInterval } from '@/lib/billing/plans'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { checkServerActionRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

type CheckoutRequestBody = {
  planSlug?: string
  billingInterval?: BillingInterval
  source?: CheckoutSource
  promotionCode?: string
}

type CheckoutSource = 'pricing' | 'onboarding' | 'settings'

const VALID_BILLING_INTERVALS = new Set<BillingInterval>(['monthly', 'annual'])
const VALID_PLAN_SLUGS: ReadonlySet<string> = new Set(
  SELF_SERVE_PLANS.map((plan) => plan.slug)
)
const VALID_CHECKOUT_SOURCES = new Set<CheckoutSource>(['pricing', 'onboarding', 'settings'])
const MAX_PROMOTION_CODE_LENGTH = 80

type StripePromotionCodeLookupResponse = {
  data?: Array<{ id?: string }>
  error?: { message?: string }
}

type TierRecord = {
  slug: string
  is_active: boolean | null
  stripe_price_id_monthly: string | null
  stripe_price_id_annual: string | null
  max_employees: number | null
  max_users: number | null
  can_export_csv: boolean | null
  can_export_pdf: boolean | null
  can_forecast: boolean | null
  can_calendar: boolean | null
  can_bulk_import: boolean | null
  can_api_access: boolean | null
  can_sso: boolean | null
  can_audit_logs: boolean | null
}

function isLocalhostCheckoutBypassAllowed(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  const hostname = request.nextUrl.hostname.toLowerCase()
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function resolveStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.')
  }

  return secretKey
}

function getPriceIdForInterval(
  tier: TierRecord,
  billingInterval: BillingInterval
): string | null {
  return billingInterval === 'annual'
    ? tier.stripe_price_id_annual
    : tier.stripe_price_id_monthly
}

async function provisionLocalCheckoutBypass(params: {
  companyId: string
  planSlug: string
  billingInterval: BillingInterval
  tier: TierRecord
}) {
  const admin = createAdminClient()
  const localPeriodEnd = new Date()
  localPeriodEnd.setFullYear(localPeriodEnd.getFullYear() + (params.billingInterval === 'annual' ? 1 : 0))
  localPeriodEnd.setMonth(localPeriodEnd.getMonth() + (params.billingInterval === 'monthly' ? 1 : 12))

  const { error } = await admin
    .from('company_entitlements')
    .update({
      tier_slug: params.planSlug,
      is_trial: false,
      trial_ends_at: null,
      stripe_subscription_id: null,
      subscription_status: 'active',
      current_period_end: localPeriodEnd.toISOString(),
      max_employees: params.tier.max_employees,
      max_users: params.tier.max_users,
      can_export_csv: params.tier.can_export_csv,
      can_export_pdf: params.tier.can_export_pdf,
      can_forecast: params.tier.can_forecast,
      can_calendar: params.tier.can_calendar,
      can_bulk_import: params.tier.can_bulk_import,
      can_api_access: params.tier.can_api_access,
      can_sso: params.tier.can_sso,
      can_audit_logs: params.tier.can_audit_logs,
      manual_override: true,
      override_notes: `Localhost checkout bypass (${params.billingInterval})`,
    })
    .eq('company_id', params.companyId)

  if (error) {
    throw error
  }
}

function normalizePromotionCode(value?: string): string | null {
  if (typeof value !== 'string') return null

  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  return trimmedValue
}

async function resolvePromotionCodeId(
  stripeSecretKey: string,
  promotionCode: string
): Promise<{ promotionCodeId: string | null; error: string | null }> {
  const query = new URLSearchParams()
  query.set('code', promotionCode)
  query.set('active', 'true')
  query.set('limit', '1')

  const response = await fetch(`https://api.stripe.com/v1/promotion_codes?${query.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
    },
    cache: 'no-store',
  })

  const payload = await response.json() as StripePromotionCodeLookupResponse

  if (!response.ok) {
    console.error('[billing/checkout] Promotion code lookup failed:', payload.error?.message ?? 'Unknown error')
    return {
      promotionCodeId: null,
      error:
        payload.error?.message ||
        'Unable to validate that code right now. Please try again.',
    }
  }

  const promotionCodeId = payload.data?.[0]?.id ?? null
  if (!promotionCodeId) {
    return {
      promotionCodeId: null,
      error: 'That code is invalid or no longer active.',
    }
  }

  return { promotionCodeId, error: null }
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
  const source = body.source ?? 'pricing'
  const promotionCode = normalizePromotionCode(body.promotionCode)

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

  if (!VALID_CHECKOUT_SOURCES.has(source)) {
    return NextResponse.json(
      { error: 'Invalid checkout source.' },
      { status: 400 }
    )
  }

  if (promotionCode && promotionCode.length > MAX_PROMOTION_CODE_LENGTH) {
    return NextResponse.json(
      { error: 'Promo code is too long.' },
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

    const rateLimit = await checkServerActionRateLimit(user.id, 'billingCheckout')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error ?? 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'We could not find a company for your account.' },
        { status: 404 }
      )
    }

    const tierResult = await supabase
      .from('tiers')
      .select(`
        slug,
        is_active,
        stripe_price_id_monthly,
        stripe_price_id_annual,
        max_employees,
        max_users,
        can_export_csv,
        can_export_pdf,
        can_forecast,
        can_calendar,
        can_bulk_import,
        can_api_access,
        can_sso,
        can_audit_logs
      `)
      .eq('slug', planSlug)
      .maybeSingle()

    if (tierResult.error) {
      console.error('[billing/checkout] Failed to read tier:', {
        planSlug,
        error: tierResult.error,
      })
      return NextResponse.json(
        { error: 'Unable to load billing plan configuration right now. Please try again.' },
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

    const redirectPath = source === 'onboarding' ? '/onboarding' : source === 'settings' ? '/settings?section=billing' : '/pricing'
    const successUrl = new URL(redirectPath, request.url)
    successUrl.searchParams.set('checkout', 'success')

    if (isLocalhostCheckoutBypassAllowed(request)) {
      await provisionLocalCheckoutBypass({
        companyId: profile.company_id,
        planSlug,
        billingInterval,
        tier,
      })

      return NextResponse.json({ url: successUrl.toString() })
    }

    const stripeSecretKey = resolveStripeSecretKey()

    const stripePriceId = getPriceIdForInterval(tier, billingInterval)
    if (!stripePriceId) {
      return NextResponse.json(
        { error: 'Stripe price is not configured for this plan yet.' },
        { status: 400 }
      )
    }

    let promotionCodeId: string | null = null
    if (promotionCode) {
      const lookup = await resolvePromotionCodeId(stripeSecretKey, promotionCode)
      if (lookup.error || !lookup.promotionCodeId) {
        return NextResponse.json(
          { error: lookup.error ?? 'Unable to validate promo code.' },
          { status: 400 }
        )
      }
      promotionCodeId = lookup.promotionCodeId
    }

    successUrl.searchParams.set('checkout', 'success')
    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}')

    const cancelUrl = new URL(redirectPath, request.url)
    cancelUrl.searchParams.set('checkout', 'cancelled')

    const stripeBody = new URLSearchParams()
    stripeBody.set('mode', 'subscription')
    stripeBody.set('success_url', successUrl.toString())
    stripeBody.set('cancel_url', cancelUrl.toString())
    stripeBody.set('line_items[0][price]', stripePriceId)
    stripeBody.set('line_items[0][quantity]', '1')
    if (promotionCodeId) {
      stripeBody.set('discounts[0][promotion_code]', promotionCodeId)
    } else {
      stripeBody.set('allow_promotion_codes', 'true')
    }
    stripeBody.set('metadata[plan_slug]', planSlug)
    stripeBody.set('metadata[billing_interval]', billingInterval)
    stripeBody.set('metadata[source]', source)
    if (promotionCode) {
      stripeBody.set('metadata[promotion_code]', promotionCode)
    }

    stripeBody.set('client_reference_id', user.id)

    if (user.email) {
      stripeBody.set('customer_email', user.email)
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
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
      console.error('[billing/checkout] Stripe session creation failed:', stripeData.error?.message ?? 'Unknown error')
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
