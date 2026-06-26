'use client'

import { useState } from 'react'
import { CreditCard, ExternalLink } from 'lucide-react'
import { getTierDisplayName, getTierBadgeClassName } from '@/lib/billing/plans'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-brand-500" aria-hidden="true" />
          Plan &amp; billing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current plan</span>
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeClass)}>
            {tierName}
          </span>
        </div>

        {isTrial && trialDaysLeft !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Trial status</span>
            <span className={cn(
              'text-sm font-medium',
              trialDaysLeft <= 3 ? 'text-status-red' : 'text-status-amber'
            )}>
              {trialDaysLeft === 0 ? 'Trial expired' : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining`}
            </span>
          </div>
        )}

        {subscriptionStatus && subscriptionStatus !== 'none' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Subscription</span>
            <span className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
              subscriptionStatus === 'active' && 'bg-status-green-light text-status-green',
              subscriptionStatus === 'past_due' && 'bg-status-red-light text-status-red',
              subscriptionStatus === 'canceled' && 'bg-muted text-muted-foreground',
              subscriptionStatus === 'trialing' && 'bg-brand-50 text-brand-700',
            )}>
              {subscriptionStatus === 'past_due' ? 'Payment overdue' : subscriptionStatus}
            </span>
          </div>
        )}

        {error && (
          <p className="text-sm text-status-red">{error}</p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {hasStripeCustomer && (
            <Button variant="outline" onClick={handleManageBilling} disabled={loading}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {loading ? 'Opening…' : 'Manage billing'}
            </Button>
          )}

          <Button asChild>
            <a href="/pricing">{hasStripeCustomer ? 'Change plan' : 'View plans'}</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
