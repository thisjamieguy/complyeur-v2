'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react'
import { completeOnboarding } from '@/app/(onboarding)/onboarding/actions'
import {
  SELF_SERVE_PLANS,
  formatGbpPrice,
  getTierDisplayName,
  type BillingInterval,
  type TierSlug,
} from '@/lib/billing/plans'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics/client'

type CheckoutState = 'success' | 'cancelled' | null
type FlowState =
  | 'plan_select'
  | 'payment_pending'
  | 'payment_finalizing'
  | 'welcome'

const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS = 60000

function formatCap(value: number | null): string {
  if (value === null) return 'Unlimited'
  return value.toLocaleString('en-GB')
}

function isPaidSubscription(status: string | null): boolean {
  return status === 'active' || status === 'trialing'
}

interface BillingOnboardingFlowProps {
  initialCompanyName: string
  initialSubscriptionStatus: string | null
  initialTierSlug: string | null
  checkoutState: CheckoutState
}

export function BillingOnboardingFlow({
  initialCompanyName,
  initialSubscriptionStatus,
  initialTierSlug,
  checkoutState,
}: BillingOnboardingFlowProps) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [promotionCodeEnabled, setPromotionCodeEnabled] = useState(false)
  const [promotionCode, setPromotionCode] = useState('')
  const [submittingPlan, setSubmittingPlan] = useState<TierSlug | null>(null)
  const [completionPending, setCompletionPending] = useState(false)
  const [statusPollNonce, setStatusPollNonce] = useState(0)
  const [statusError, setStatusError] = useState<string | null>(
    checkoutState === 'cancelled'
      ? 'Checkout was cancelled. Choose a plan and try again when you are ready.'
      : null
  )
  const [isPollingTimedOut, setIsPollingTimedOut] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    initialSubscriptionStatus
  )
  const [tierSlug, setTierSlug] = useState<string | null>(initialTierSlug)
  const [flowState, setFlowState] = useState<FlowState>(() => {
    if (isPaidSubscription(initialSubscriptionStatus)) return 'welcome'
    if (checkoutState === 'success') return 'payment_finalizing'
    return 'plan_select'
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const intentKey = 'complyeur_signup_method'
    const method = window.localStorage.getItem(intentKey)
    if (!method) {
      return
    }

    trackEvent('sign_up', { method })
    window.localStorage.removeItem(intentKey)
  }, [])

  const plans = useMemo(
    () =>
      [...SELF_SERVE_PLANS].sort(
        (a, b) => a.monthlyPriceGbp - b.monthlyPriceGbp
      ),
    []
  )

  const activeStep = (() => {
    if (flowState === 'welcome') return 3
    if (flowState === 'payment_pending' || flowState === 'payment_finalizing') return 2
    return 1
  })()

  const pollBillingStatus = useCallback(async () => {
    const response = await fetch('/api/billing/status', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })

    const payload = await response.json() as {
      error?: string
      isPaid?: boolean
      subscriptionStatus?: string | null
      tierSlug?: string | null
    }

    if (!response.ok) {
      throw new Error(payload.error || 'Unable to verify payment status right now.')
    }

    setSubscriptionStatus(payload.subscriptionStatus ?? null)
    setTierSlug(payload.tierSlug ?? null)

    if (payload.isPaid) {
      setStatusError(null)
      setIsPollingTimedOut(false)
      setFlowState('welcome')
      return true
    }

    return false
  }, [])

  useEffect(() => {
    if (flowState !== 'payment_finalizing') {
      return
    }

    let cancelled = false
    let inFlight = false
    let attempts = 0
    let timer: number | null = null
    const maxAttempts = Math.ceil(POLL_TIMEOUT_MS / POLL_INTERVAL_MS)

    setIsPollingTimedOut(false)

    const runPoll = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        attempts += 1
        const paid = await pollBillingStatus()

        if (cancelled || paid) {
          if (timer !== null) {
            window.clearInterval(timer)
          }
          return
        }

        if (attempts >= maxAttempts) {
          setIsPollingTimedOut(true)
          setStatusError(
            'Payment is still finalizing. This can happen for a short period while billing updates sync. Try again in a moment.'
          )
          cancelled = true
          if (timer !== null) {
            window.clearInterval(timer)
          }
        }
      } catch (error) {
        if (!cancelled) {
          setStatusError(
            error instanceof Error
              ? error.message
              : 'Unable to verify payment status right now.'
          )
          setIsPollingTimedOut(true)
          cancelled = true
          if (timer !== null) {
            window.clearInterval(timer)
          }
        }
      } finally {
        inFlight = false
      }
    }

    void runPoll()
    timer = window.setInterval(() => {
      void runPoll()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timer !== null) {
        window.clearInterval(timer)
      }
    }
  }, [flowState, pollBillingStatus, statusPollNonce])

  const startCheckout = useCallback(async (planSlug: TierSlug) => {
    const checkoutPromotionCode = promotionCode.trim()
    setStatusError(null)
    setSubmittingPlan(planSlug)
    setFlowState('payment_pending')
    trackEvent('begin_checkout', {
      source: 'onboarding',
      plan: planSlug,
      billingInterval,
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
          billingInterval,
          source: 'onboarding',
          promotionCode: checkoutPromotionCode || undefined,
        }),
      })

      const payload = await response.json() as { url?: string; error?: string }

      if (!response.ok || !payload.url) {
        setStatusError(
          payload.error || 'Unable to start checkout right now. Please try again.'
        )
        setSubmittingPlan(null)
        setFlowState('plan_select')
        return
      }

      window.location.assign(payload.url)
    } catch {
      setStatusError('Unable to start checkout right now. Please try again.')
      setSubmittingPlan(null)
      setFlowState('plan_select')
    }
  }, [billingInterval, promotionCode])

  async function handleCompleteOnboarding() {
    setCompletionPending(true)
    setStatusError(null)

    try {
      await completeOnboarding()
    } catch (error) {
      setCompletionPending(false)
      setStatusError(
        error instanceof Error
          ? error.message
          : 'Unable to complete setup right now. Please try again.'
      )
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
        <div className="mb-8 space-y-4">
          <p className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
            Complete Setup
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Finish billing before entering your workspace
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
            Account created for <span className="font-medium text-slate-800">{initialCompanyName}</span>.
            Pick your tier, complete checkout, then launch into your dashboard.
          </p>
        </div>

        <ol className="mb-8 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
          {[
            { index: 1, label: 'Select Tier' },
            { index: 2, label: 'Payment' },
            { index: 3, label: 'Welcome' },
          ].map((step) => (
            <li
              key={step.index}
              className={cn(
                'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                activeStep === step.index
                  ? 'bg-white text-slate-900 shadow-sm'
                  : activeStep > step.index
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-500'
              )}
            >
              {step.index}. {step.label}
            </li>
          ))}
        </ol>

        {flowState === 'plan_select' && (
          <div className="space-y-6">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  billingInterval === 'monthly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                aria-pressed={billingInterval === 'monthly'}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('annual')}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  billingInterval === 'annual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                aria-pressed={billingInterval === 'annual'}
              >
                Annual
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setPromotionCodeEnabled((current) => !current)}
                className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 hover:underline"
              >
                i have a code
              </button>
              {promotionCodeEnabled && (
                <div className="mt-2 max-w-xs">
                  <label htmlFor="onboarding-promo-code" className="sr-only">
                    Promotional code
                  </label>
                  <input
                    id="onboarding-promo-code"
                    type="text"
                    value={promotionCode}
                    onChange={(event) => setPromotionCode(event.target.value)}
                    placeholder="Enter promo code"
                    autoComplete="off"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {plans.map((plan) => {
                const price =
                  billingInterval === 'monthly'
                    ? plan.monthlyPriceGbp
                    : plan.annualPriceGbp

                return (
                  <article
                    key={plan.slug}
                    className={cn(
                      'rounded-2xl border bg-white p-5 shadow-sm',
                      plan.recommended
                        ? 'border-brand-300 ring-1 ring-brand-300'
                        : 'border-slate-200'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">{plan.publicName}</h2>
                      {plan.recommended ? (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                          Popular
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm text-slate-600">{plan.description}</p>

                    <p className="mt-4 text-3xl font-semibold text-slate-900">
                      {formatGbpPrice(price)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {billingInterval === 'monthly' ? 'per month' : 'per year'} (ex VAT)
                    </p>

                    <ul className="mt-4 space-y-1 text-sm text-slate-700">
                      <li>{formatCap(plan.employeeCap)} tracked employees</li>
                      <li>{formatCap(plan.userCap)} user accounts</li>
                    </ul>

                    <button
                      type="button"
                      onClick={() => {
                        trackEvent('plan_select', {
                          source: 'onboarding',
                          plan: plan.slug,
                          billingInterval,
                        })
                        startCheckout(plan.slug)
                      }}
                      disabled={submittingPlan !== null}
                      className={cn(
                        'mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                        plan.recommended
                          ? 'bg-brand-700 text-white hover:bg-brand-800'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      )}
                    >
                      {submittingPlan === plan.slug ? 'Redirecting…' : plan.ctaLabel}
                    </button>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {flowState === 'payment_pending' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting you to secure checkout…
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Keep this tab open. You will be returned automatically once payment is complete.
            </p>
          </div>
        )}

        {flowState === 'payment_finalizing' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying payment and activating your workspace
            </p>
            <p className="mt-2 text-sm text-slate-600">
              This can take a short moment while webhook updates finish.
            </p>

            {isPollingTimedOut && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="inline-flex items-center gap-2 font-medium">
                  <Timer className="h-4 w-4" />
                  Payment received, still finalizing.
                </p>
                <p className="mt-1">
                  Retry status now or wait a few seconds and retry again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusError(null)
                    setIsPollingTimedOut(false)
                    setStatusPollNonce((current) => current + 1)
                  }}
                  className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Retry status check
                </button>
              </div>
            )}
          </div>
        )}

        {flowState === 'welcome' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Payment confirmed
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Welcome to ComplyEur
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Your {getTierDisplayName(tierSlug)} workspace is active with
              {' '}
              <span className="font-medium">{subscriptionStatus ?? 'active'}</span>
              {' '}
              billing status.
            </p>
            <button
              type="button"
              onClick={handleCompleteOnboarding}
              disabled={completionPending}
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {completionPending ? 'Opening dashboard…' : 'Enter dashboard'}
            </button>
          </div>
        )}

        {statusError && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {statusError}
          </div>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Need help with plan selection?
          {' '}
          <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
            Contact our team
          </Link>
          .
        </p>
      </section>

      <aside className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 p-6 text-slate-100 shadow-lg shadow-slate-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-52 w-52 rounded-full bg-sky-500/20 blur-2xl" />

        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">
          <Sparkles className="h-3.5 w-3.5" />
          What You Unlock
        </p>
        <h2 className="mt-5 text-2xl font-semibold leading-tight text-white">
          Compliance workflows built for real travel operations
        </h2>

        <ul className="mt-6 space-y-4 text-sm leading-relaxed text-slate-200">
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-200" />
            90/180 rolling calculations that stay accurate as trips, entries, and exits change.
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-200" />
            Proactive risk alerts so your team can act before travel plans create exposure.
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-200" />
            Audit-ready exports prepared for internal reviews and external stakeholders.
          </li>
        </ul>

        <p className="mt-8 rounded-xl border border-white/15 bg-white/10 p-4 text-sm text-slate-100">
          Trusted by teams that need clear, defensible Schengen compliance records without heavy admin overhead.
        </p>
      </aside>
    </div>
  )
}
