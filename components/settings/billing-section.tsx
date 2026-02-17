'use client'

import { useState } from 'react'
import { CreditCard, ExternalLink } from 'lucide-react'
import { getTierDisplayName, getTierBadgeClassName } from '@/lib/billing/plans'
import { cn } from '@/lib/utils'

interface BillingSectionProps {
  tierSlug: string | null
  isTrial: boolean
  trialEndsAt: string | null
  subscriptionStatus: string | null
  hasStripeCustomer: boolean
}

export function BillingSection({
  tierSlug,
  isTrial,
  trialEndsAt,
  subscriptionStatus,
  hasStripeCustomer,
}: BillingSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tierName = getTierDisplayName(tierSlug)
  const badgeClass = getTierBadgeClassName(tierSlug)

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  async function handleManageBilling() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()

      if (!res.ok || !data.url) {
        setError(data.error || 'Unable to open billing portal')
        return
      }

      window.location.assign(data.url)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
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

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          {hasStripeCustomer && (
            <button
              onClick={handleManageBilling}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {loading ? 'Opening...' : 'Manage Billing'}
            </button>
          )}

          <a
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {hasStripeCustomer ? 'Change Plan' : 'View Plans'}
          </a>
        </div>
      </div>
    </div>
  )
}
