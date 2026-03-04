'use client'

import { useState } from 'react'
import { Check, CreditCard, ExternalLink, Loader2 } from 'lucide-react'
import { getTierDisplayName, getTierBadgeClassName, SELF_SERVE_PLANS, formatGbpPrice, type BillingInterval } from '@/lib/billing/plans'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BillingSectionProps {
  tierSlug: string | null
  isTrial: boolean
  trialEndsAt: string | null
  subscriptionStatus: string | null
  hasStripeCustomer: boolean
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['Up to 10 employees', '2 team members', 'Core compliance tracking', 'CSV export'],
  starter: ['Up to 50 employees', '5 team members', 'Everything in Basic', 'PDF export', 'Calendar view', 'Trip forecasting', 'Bulk import'],
  professional: ['Up to 200 employees', '15 team members', 'Everything in Pro', 'Full export suite', 'API access', 'Advanced analytics'],
}

const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, professional: 2 }

function getCtaLabel(currentSlug: string | null, targetSlug: string, targetName: string): string {
  if (!currentSlug) return `Start ${targetName}`
  const currentRank = PLAN_RANK[currentSlug] ?? 0
  const targetRank = PLAN_RANK[targetSlug] ?? 0
  if (targetRank > currentRank) return `Upgrade to ${targetName}`
  return `Switch to ${targetName}`
}

export function BillingSection({
  tierSlug,
  isTrial,
  trialEndsAt,
  subscriptionStatus,
  hasStripeCustomer,
}: BillingSectionProps) {
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const tierName = getTierDisplayName(tierSlug)
  const badgeClass = getTierBadgeClassName(tierSlug)

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  async function handleManageBilling() {
    setPortalLoading(true)
    setPortalError(null)

    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()

      if (!res.ok || !data.url) {
        setPortalError(data.error || 'Unable to open billing portal')
        return
      }

      window.location.assign(data.url)
    } catch {
      setPortalError('Something went wrong. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleSelectPlan(planSlug: string) {
    setCheckoutLoading(planSlug)
    setCheckoutError(null)

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug, billingInterval, source: 'settings' }),
      })
      const data = await res.json()

      if (!res.ok || !data.url) {
        setCheckoutError(data.error || 'Unable to start checkout')
        return
      }

      window.location.assign(data.url)
    } catch {
      setCheckoutError('Something went wrong. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const annualSavingsPct = 17 // ~2 months free

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-medium text-slate-900">Plan & Billing</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Current plan</span>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeClass)}>
              {tierName}
            </span>
          </div>

          {isTrial && trialDaysLeft !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Trial status</span>
              <span className={cn(
                'text-sm font-medium',
                trialDaysLeft <= 3 ? 'text-red-600' : 'text-amber-600'
              )}>
                {trialDaysLeft === 0 ? 'Trial expired' : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining`}
              </span>
            </div>
          )}

          {subscriptionStatus && subscriptionStatus !== 'none' && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Subscription</span>
              <span className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                subscriptionStatus === 'active' && 'bg-green-100 text-green-700',
                subscriptionStatus === 'past_due' && 'bg-red-100 text-red-700',
                subscriptionStatus === 'canceled' && 'bg-slate-100 text-slate-600',
                subscriptionStatus === 'trialing' && 'bg-blue-100 text-blue-700',
              )}>
                {subscriptionStatus === 'past_due' ? 'Payment overdue' : subscriptionStatus}
              </span>
            </div>
          )}

          {portalError && (
            <p className="text-sm text-red-600">{portalError}</p>
          )}

          <div className="flex gap-3 pt-2">
            {hasStripeCustomer && (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {portalLoading ? 'Opening...' : 'Manage Billing'}
              </button>
            )}

            <button
              onClick={() => setUpgradeOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {hasStripeCustomer ? 'Change Plan' : 'View Plans'}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-8 pt-7 pb-5 border-b border-slate-100">
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {hasStripeCustomer ? 'Change your plan' : 'Upgrade your plan'}
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              Unlock more employees, teammates, and features. Cancel anytime.
            </p>
          </DialogHeader>

          <div className="px-8 py-6">
            {/* Billing interval toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-6">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                  billingInterval === 'monthly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
                  billingInterval === 'annual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Annual
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Save {annualSavingsPct}%
                </span>
              </button>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-3 gap-4">
              {SELF_SERVE_PLANS.map((plan) => {
                const isCurrent = tierSlug === plan.slug
                const price = billingInterval === 'annual' ? plan.annualPriceGbp / 12 : plan.monthlyPriceGbp
                const features = PLAN_FEATURES[plan.slug] ?? []
                const ctaLabel = getCtaLabel(tierSlug, plan.slug, plan.publicName)

                return (
                  <div
                    key={plan.slug}
                    className={cn(
                      'relative rounded-xl border p-5 flex flex-col',
                      plan.recommended && !isCurrent
                        ? 'border-blue-300 bg-blue-50/30 ring-1 ring-blue-300'
                        : 'border-slate-200 bg-white',
                      isCurrent && 'border-slate-300 bg-slate-50/60'
                    )}
                  >
                    {plan.recommended && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap shadow-sm">
                        Most popular
                      </span>
                    )}

                    <div className="mb-4">
                      <p className="text-base font-semibold text-slate-900">{plan.publicName}</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900">{formatGbpPrice(price)}</span>
                        <span className="text-sm text-slate-500">/mo</span>
                      </div>
                      {billingInterval === 'annual' ? (
                        <p className="text-xs text-emerald-600 font-medium mt-1">
                          {formatGbpPrice(plan.annualPriceGbp)}/yr — 2 months free
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1">billed monthly</p>
                      )}
                    </div>

                    <ul className="space-y-2 mb-5 flex-1">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="text-center text-sm font-medium text-slate-400 py-2.5 border border-slate-200 rounded-lg bg-white">
                        Current plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelectPlan(plan.slug)}
                        disabled={!!checkoutLoading}
                        className={cn(
                          'w-full py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5',
                          plan.recommended
                            ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                            : 'border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50'
                        )}
                      >
                        {checkoutLoading === plan.slug ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting...</>
                        ) : (
                          ctaLabel
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {checkoutError && (
              <p className="mt-4 text-sm text-red-600 text-center">{checkoutError}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
