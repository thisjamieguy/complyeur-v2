'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { BillingInterval, TierSlug } from '@/lib/billing/plans'
import {
  SELF_SERVE_PLANS,
  formatGbpPrice,
} from '@/lib/billing/plans'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics/client'

function formatCap(value: number | null): string {
  if (value === null) return 'Unlimited'
  return value.toLocaleString('en-GB')
}

function PricingPageContent() {
  const searchParams = useSearchParams()
  const checkoutStatus = searchParams.get('checkout')
  const promoCodeFromUrl = (searchParams.get('promoCode') ?? '').trim()
  const intervalFromUrl = searchParams.get('billingInterval')
  const requestedBillingInterval: BillingInterval | null =
    intervalFromUrl === 'monthly' || intervalFromUrl === 'annual'
      ? intervalFromUrl
      : null
  const autoStartPlanFromUrl = searchParams.get('plan')
  const autoStartEnabled = searchParams.get('autostart') === '1'
  const autoCheckoutAttemptedRef = useRef(false)

  const [billingIntervalOverride, setBillingIntervalOverride] = useState<BillingInterval | null>(null)
  const [submittingPlan, setSubmittingPlan] = useState<TierSlug | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [promotionCodeEnabled, setPromotionCodeEnabled] = useState(
    promoCodeFromUrl.length > 0
  )
  const [promotionCodeOverride, setPromotionCodeOverride] = useState<string | null>(null)
  const billingInterval = billingIntervalOverride ?? requestedBillingInterval ?? 'monthly'
  const promotionCode = promotionCodeOverride ?? promoCodeFromUrl
  const isPromotionCodeEnabled = promotionCodeEnabled || promoCodeFromUrl.length > 0

  const plans = useMemo(
    () =>
      [...SELF_SERVE_PLANS].sort(
        (a, b) => a.monthlyPriceGbp - b.monthlyPriceGbp
      ),
    []
  )

  const startCheckout = useCallback(async (
    planSlug: TierSlug,
    requestedInterval?: BillingInterval,
    requestedPromotionCode?: string
  ) => {
    const checkoutInterval = requestedInterval ?? billingInterval
    const checkoutPromotionCode = (requestedPromotionCode ?? promotionCode).trim()
    setCheckoutError(null)
    setSubmittingPlan(planSlug)
    trackEvent('begin_checkout', {
      source: 'pricing',
      plan: planSlug,
      billingInterval: checkoutInterval,
      hasPromoCode: checkoutPromotionCode.length > 0,
    })

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planSlug,
          billingInterval: checkoutInterval,
          source: 'pricing',
          promotionCode: checkoutPromotionCode || undefined,
        }),
      })

      let payload: { url?: string; error?: string } = {}
      const contentType = response.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        payload = await response.json() as { url?: string; error?: string }
      } else if (!response.ok) {
        payload = {
          error:
            response.statusText ||
            `Checkout request failed with status ${response.status}.`,
        }
      }

      if (response.status === 401) {
        const nextParams = new URLSearchParams({
          autostart: '1',
          plan: planSlug,
          billingInterval: checkoutInterval,
        })
        if (checkoutPromotionCode) {
          nextParams.set('promoCode', checkoutPromotionCode)
        }
        setSubmittingPlan(null)
        window.location.assign(`/login?next=${encodeURIComponent(`/pricing?${nextParams.toString()}`)}`)
        return
      }

      if (!response.ok || !payload.url) {
        setCheckoutError(
          payload.error || 'Unable to start checkout right now. Please try again.'
        )
        setSubmittingPlan(null)
        return
      }

      window.location.assign(payload.url)
    } catch {
      setCheckoutError('Unable to start checkout right now. Please try again.')
      setSubmittingPlan(null)
    }
  }, [billingInterval, promotionCode])

  useEffect(() => {
    if (autoCheckoutAttemptedRef.current || !autoStartEnabled) {
      return
    }

    if (
      !autoStartPlanFromUrl ||
      !requestedBillingInterval ||
      !SELF_SERVE_PLANS.some((plan) => plan.slug === autoStartPlanFromUrl)
    ) {
      return
    }

    const autoCheckoutTimer = window.setTimeout(() => {
      autoCheckoutAttemptedRef.current = true
      void startCheckout(
        autoStartPlanFromUrl as TierSlug,
        requestedBillingInterval,
        promoCodeFromUrl || undefined
      )
    }, 0)

    return () => window.clearTimeout(autoCheckoutTimer)
  }, [autoStartEnabled, autoStartPlanFromUrl, promoCodeFromUrl, requestedBillingInterval, startCheckout])

  return (
    <div className="bg-slate-50 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
              Pricing
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Simple pricing for Schengen compliance
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              Choose the plan that fits your team size. All plans include 90/180 tracking, trip imports, forecasting, and GBP billing. Prices are shown excluding VAT.
            </p>
            <p className="mt-4 text-sm text-slate-500">
              Also looking for context? See <Link href="/about" className="font-medium text-brand-700 hover:underline">about</Link> and the <Link href="/faq" className="font-medium text-brand-700 hover:underline">FAQ</Link>.
            </p>
          </div>

          <div className="mt-8 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                billingInterval === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              onClick={() => setBillingIntervalOverride('monthly')}
              aria-pressed={billingInterval === 'monthly'}
            >
              Monthly
            </button>
            <button
              type="button"
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                billingInterval === 'annual'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              onClick={() => setBillingIntervalOverride('annual')}
              aria-pressed={billingInterval === 'annual'}
            >
              Annual
              <span className="ml-2 rounded-xl bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                Save ~17%
              </span>
            </button>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setPromotionCodeEnabled((current) => !current)}
              className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 hover:underline"
            >
              I have a code
            </button>
            {isPromotionCodeEnabled && (
              <div className="mt-2 max-w-xs">
                <label htmlFor="pricing-promo-code" className="sr-only">
                  Promotional code
                </label>
                <input
                  id="pricing-promo-code"
                  type="text"
                  value={promotionCode}
                  onChange={(event) => setPromotionCodeOverride(event.target.value)}
                  placeholder="Enter promo code"
                  autoComplete="off"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const price =
                billingInterval === 'monthly'
                  ? plan.monthlyPriceGbp
                  : plan.annualPriceGbp
              const monthlyEquivalent = plan.annualPriceGbp / 12

              return (
                <section
                  key={plan.slug}
                  className={cn(
                    'rounded-xl border bg-white p-6 shadow-sm',
                    plan.recommended
                      ? 'border-brand-300 ring-1 ring-brand-300'
                      : 'border-slate-200'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold text-slate-900">{plan.publicName}</h2>
                    {plan.recommended && (
                      <span className="rounded-xl bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                        Most Popular
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-slate-600">{plan.description}</p>

                  <div className="mt-5">
                    <p className="landing-serif text-4xl font-semibold text-slate-900">
                      {formatGbpPrice(price)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {billingInterval === 'monthly' ? 'per month' : 'per year'}
                    </p>
                    {billingInterval === 'annual' && (
                      <p className="mt-1 text-xs text-slate-500">
                        Equivalent to {formatGbpPrice(monthlyEquivalent)} per month
                      </p>
                    )}
                  </div>

                  <ul className="mt-6 space-y-2 text-sm text-slate-700">
                    <li>{formatCap(plan.employeeCap)} tracked employees</li>
                    <li>{formatCap(plan.userCap)} user accounts</li>
                    <li>CSV and Excel import support</li>
                    <li>Forecast checks before travel is booked</li>
                    <li>No long-term contracts</li>
                  </ul>

                  <button
                    type="button"
                    onClick={() => {
                      trackEvent('plan_select', {
                        source: 'pricing',
                        plan: plan.slug,
                        billingInterval,
                      })
                      startCheckout(plan.slug)
                    }}
                    disabled={submittingPlan !== null}
                    className={cn(
                      'mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                      plan.recommended
                        ? 'bg-brand-700 text-white hover:bg-brand-800'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    )}
                  >
                    {submittingPlan === plan.slug ? 'Redirecting...' : plan.ctaLabel}
                  </button>
                </section>
              )
            })}
          </div>

          {checkoutStatus === 'success' && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Checkout completed successfully.
            </div>
          )}

          {checkoutStatus === 'cancelled' && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Checkout was cancelled. You can choose a plan and try again.
            </div>
          )}

          {checkoutError && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {checkoutError}
            </div>
          )}

          <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Billing is in GBP and charged either monthly or annually based on your selected cycle. Prices exclude VAT. You can change plan from Settings &gt; Billing when your team size changes.
          </div>

          <section className="mt-8 rounded-xl border border-brand-200 bg-brand-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Need help choosing a plan?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              If your team has complex travel patterns, we can help you map expected traveller volume to the right tier.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Talk to us
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-slate-900"
              >
                Read FAQ
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingPageContent />
    </Suspense>
  )
}
