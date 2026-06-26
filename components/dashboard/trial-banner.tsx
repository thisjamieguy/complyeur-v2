import Link from 'next/link'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { ArrowRight, Clock3 } from 'lucide-react'
import { getTierDisplayName } from '@/lib/billing/plans'
import { cn } from '@/lib/utils'

interface TrialBannerProps {
  tierSlug: string | null
  isTrial: boolean
  trialEndsAt: string | null
  subscriptionStatus: string | null
}

function getTrialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  return Math.max(0, differenceInCalendarDays(parseISO(trialEndsAt), new Date()))
}

export function TrialBanner({
  tierSlug,
  isTrial,
  trialEndsAt,
  subscriptionStatus,
}: TrialBannerProps) {
  const isPaid = subscriptionStatus === 'active' && !isTrial
  if (isPaid) return null

  const daysLeft = getTrialDaysLeft(trialEndsAt)
  const isExpired = isTrial && daysLeft === 0
  const tierName = getTierDisplayName(tierSlug)

  return (
    <section
      aria-label="Trial status"
      className={cn(
        'rounded-xl border bg-white px-4 py-4 shadow-sm sm:px-5',
        isExpired ? 'border-amber-300' : 'border-slate-200'
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Clock3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {isExpired
                ? `${tierName} trial expired`
                : `${tierName} trial${daysLeft === null ? '' : `: ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}`}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {isExpired
                ? 'Choose a plan to keep using paid compliance workflows. Your workspace data stays in place.'
                : 'Use the product with your own team data first. Choose a plan when you are ready to keep going.'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            href="/pricing?autostart=1&plan=starter&billingInterval=monthly"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Choose plan
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/settings/billing"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Billing settings
          </Link>
        </div>
      </div>
    </section>
  )
}
