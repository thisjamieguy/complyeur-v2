'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  Building2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Timer,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  addFirstEmployee,
  completeOnboarding,
  completeOnboardingForImport,
  inviteTeamMembers,
  updateCompanyName,
} from '@/app/(onboarding)/onboarding/actions'
import {
  SELF_SERVE_PLANS,
  formatGbpPrice,
  getTierDisplayName,
  type BillingInterval,
  type TierSlug,
} from '@/lib/billing/plans'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics/client'
import { NATIONALITY_TYPE_LABELS, type NationalityType } from '@/lib/constants/nationality-types'

type CheckoutState = 'success' | 'cancelled' | null
type FlowState =
  | 'company_details'
  | 'plan_select'
  | 'payment_pending'
  | 'payment_finalizing'
  | 'employee_setup'
  | 'team_invites'
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
  const [companyName, setCompanyName] = useState(initialCompanyName)
  const [companyNameError, setCompanyNameError] = useState<string | null>(null)
  const [companyNameSaving, setCompanyNameSaving] = useState(false)
  const [employeeName, setEmployeeName] = useState('')
  const [nationalityType, setNationalityType] = useState<NationalityType>('uk_citizen')
  const [employeeError, setEmployeeError] = useState<string | null>(null)
  const [employeeSaving, setEmployeeSaving] = useState(false)
  const [inviteEmails, setInviteEmails] = useState(['', '', ''])
  const [inviteSaving, setInviteSaving] = useState(false)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [promotionCodeEnabled, setPromotionCodeEnabled] = useState(false)
  const [promotionCode, setPromotionCode] = useState('')
  const [submittingPlan, setSubmittingPlan] = useState<TierSlug | null>(null)
  const [completionPending, setCompletionPending] = useState(false)
  const [importPending, setImportPending] = useState(false)
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
    if (isPaidSubscription(initialSubscriptionStatus)) return 'employee_setup'
    if (checkoutState === 'success') return 'payment_finalizing'
    return 'company_details'
  })
  const employeeSetupStartedTracked = useRef(false)

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

  useEffect(() => {
    if (flowState !== 'employee_setup' || employeeSetupStartedTracked.current) {
      return
    }

    employeeSetupStartedTracked.current = true
    trackEvent('onboarding_employee_setup_started', {
      source: 'onboarding',
      tier: tierSlug,
    })
  }, [flowState, tierSlug])

  const plans = useMemo(
    () =>
      [...SELF_SERVE_PLANS].sort(
        (a, b) => a.monthlyPriceGbp - b.monthlyPriceGbp
      ),
    []
  )

  const activeStep = (() => {
    if (flowState === 'welcome') return 5
    if (flowState === 'employee_setup' || flowState === 'team_invites') return 4
    if (flowState === 'payment_pending' || flowState === 'payment_finalizing') return 3
    if (flowState === 'plan_select') return 2
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
      setFlowState('employee_setup')
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

  async function handleCompanyNameSubmit() {
    const trimmed = companyName.trim()
    if (!trimmed || trimmed.length < 2) {
      setCompanyNameError('Company name must be at least 2 characters')
      return
    }

    setCompanyNameError(null)
    setCompanyNameSaving(true)

    try {
      const formData = new FormData()
      formData.set('companyName', trimmed)
      await updateCompanyName(formData)
      setFlowState('plan_select')
    } catch (error) {
      setCompanyNameError(
        error instanceof Error ? error.message : 'Failed to save company name'
      )
    } finally {
      setCompanyNameSaving(false)
    }
  }

  async function handleCompleteOnboarding() {
    setCompletionPending(true)
    setStatusError(null)

    try {
      trackEvent('onboarding_completed', {
        source: 'onboarding',
        tier: tierSlug,
      })
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

  async function handleAddEmployee() {
    const trimmed = employeeName.trim()
    if (trimmed.length < 2) {
      setEmployeeError('Employee name must be at least 2 characters')
      return
    }

    setEmployeeSaving(true)
    setEmployeeError(null)

    try {
      const formData = new FormData()
      formData.set('name', trimmed)
      formData.set('nationalityType', nationalityType)
      await addFirstEmployee(formData)
      setFlowState('team_invites')
    } catch (error) {
      setEmployeeError(
        error instanceof Error ? error.message : 'Failed to add employee'
      )
    } finally {
      setEmployeeSaving(false)
    }
  }

  function handleSkipEmployeeSetup() {
    trackEvent('onboarding_employee_setup_skipped', {
      source: 'onboarding',
      tier: tierSlug,
    })
    setEmployeeError(null)
    setFlowState('team_invites')
  }

  async function handleImportInstead(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    setImportPending(true)
    setStatusError(null)

    try {
      trackEvent('onboarding_employee_setup_skipped', {
        source: 'onboarding',
        destination: 'import',
        tier: tierSlug,
      })
      await completeOnboardingForImport()
    } catch (error) {
      setImportPending(false)
      setStatusError(
        error instanceof Error
          ? error.message
          : 'Unable to open import right now. Please try again.'
      )
    }
  }

  async function handleInviteSubmit() {
    setInviteSaving(true)
    setStatusError(null)

    try {
      const formData = new FormData()
      inviteEmails.forEach((email, index) => {
        formData.set(`email${index}`, email)
      })
      await inviteTeamMembers(formData)
      setFlowState('welcome')
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : 'Unable to invite team members right now.'
      )
    } finally {
      setInviteSaving(false)
    }
  }

  function handleSkipTeamInvites() {
    trackEvent('onboarding_team_invites_skipped', {
      source: 'onboarding',
      tier: tierSlug,
    })
    setStatusError(null)
    setFlowState('welcome')
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
            Confirm your details, pick your tier, complete checkout, then launch into your dashboard.
          </p>
        </div>

        <ol className="mb-8 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-5">
          {[
            { index: 1, label: 'Company' },
            { index: 2, label: 'Select Tier' },
            { index: 3, label: 'Payment' },
            { index: 4, label: 'People' },
            { index: 5, label: 'Welcome' },
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

        {flowState === 'company_details' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
                  <Building2 className="h-5 w-5 text-brand-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Company name</h2>
                  <p className="text-sm text-slate-600">Confirm or update your company name</p>
                </div>
              </div>

              <div className="mt-5 max-w-md">
                <label htmlFor="onboarding-company-name" className="block text-sm font-medium text-slate-700">
                  Company name
                </label>
                <input
                  id="onboarding-company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value)
                    setCompanyNameError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCompanyNameSubmit()
                    }
                  }}
                  autoFocus
                  autoComplete="organization"
                  maxLength={100}
                  className={cn(
                    'mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2',
                    companyNameError
                      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-brand-400 focus:ring-brand-200'
                  )}
                />
                {companyNameError && (
                  <p className="mt-1.5 text-sm text-rose-600">{companyNameError}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleCompanyNameSubmit}
                disabled={companyNameSaving}
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {companyNameSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        )}

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

        {flowState === 'employee_setup' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
                  <Users className="h-5 w-5 text-brand-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Add your first employee</h2>
                  <p className="text-sm text-slate-600">
                    Start with one traveller, or import a spreadsheet if your team is already in a file.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px]">
                <div>
                  <label htmlFor="onboarding-employee-name" className="block text-sm font-medium text-slate-700">
                    Employee name
                  </label>
                  <input
                    id="onboarding-employee-name"
                    type="text"
                    value={employeeName}
                    onChange={(event) => {
                      setEmployeeName(event.target.value)
                      setEmployeeError(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddEmployee()
                      }
                    }}
                    autoFocus
                    autoComplete="name"
                    maxLength={100}
                    placeholder="e.g. Jane Smith"
                    className={cn(
                      'mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2',
                      employeeError
                        ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-brand-400 focus:ring-brand-200'
                    )}
                  />
                </div>

                <div>
                  <label htmlFor="onboarding-nationality-type" className="block text-sm font-medium text-slate-700">
                    Nationality type
                  </label>
                  <select
                    id="onboarding-nationality-type"
                    value={nationalityType}
                    onChange={(event) => setNationalityType(event.target.value as NationalityType)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  >
                    {Object.entries(NATIONALITY_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                You can add trips now from the dashboard or import them in bulk after setup.
              </p>

              {employeeError && (
                <p className="mt-3 text-sm text-rose-600">{employeeError}</p>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleAddEmployee}
                  disabled={employeeSaving || importPending}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {employeeSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add employee'
                  )}
                </button>
                <Link
                  href="/import"
                  onClick={handleImportInstead}
                  className={cn(
                    'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100',
                    importPending && 'pointer-events-none opacity-60'
                  )}
                >
                  {importPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening import...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import spreadsheet instead
                    </>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={handleSkipEmployeeSetup}
                  disabled={employeeSaving || importPending}
                  className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Do this later
                </button>
              </div>
            </div>
          </div>
        )}

        {flowState === 'team_invites' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
                <UserPlus className="h-5 w-5 text-brand-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Invite your team</h2>
                <p className="text-sm text-slate-600">
                  Add up to three colleagues now, or manage users later from Settings.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {inviteEmails.map((email, index) => (
                <div key={index}>
                  <label htmlFor={`onboarding-invite-email-${index}`} className="sr-only">
                    Team member email {index + 1}
                  </label>
                  <input
                    id={`onboarding-invite-email-${index}`}
                    type="email"
                    value={email}
                    onChange={(event) => {
                      const nextEmails = [...inviteEmails]
                      nextEmails[index] = event.target.value
                      setInviteEmails(nextEmails)
                    }}
                    placeholder={`colleague${index + 1}@company.com`}
                    disabled={inviteSaving}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setFlowState('employee_setup')}
                disabled={inviteSaving}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleInviteSubmit}
                disabled={inviteSaving}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {inviteSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send invites'
                )}
              </button>
              <button
                type="button"
                onClick={handleSkipTeamInvites}
                disabled={inviteSaving}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {flowState === 'welcome' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Payment confirmed
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Workspace ready
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
