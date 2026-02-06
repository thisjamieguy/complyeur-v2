'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { BillingInterval } from '@/lib/billing/plans'
import {
  SELF_SERVE_PLANS,
  formatGbpPrice,
} from '@/lib/billing/plans'
import { cn } from '@/lib/utils'

function formatCap(value: number | null): string {
  if (value === null) return 'Unlimited'
  return value.toLocaleString('en-GB')
}

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')

  const plans = useMemo(
    () =>
      [...SELF_SERVE_PLANS].sort(
        (a, b) => a.monthlyPriceGbp - b.monthlyPriceGbp
      ),
    []
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Simple pricing for Schengen compliance</h1>
        <p className="text-base text-slate-600">
          Choose the plan that fits your team size. All plans include a 14-day trial,
          GBP billing, and prices shown excluding VAT.
        </p>
      </div>

      <div className="mt-8 inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
        <button
          type="button"
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            billingInterval === 'monthly'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
          onClick={() => setBillingInterval('monthly')}
          aria-pressed={billingInterval === 'monthly'}
        >
          Monthly
        </button>
        <button
          type="button"
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            billingInterval === 'annual'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
          onClick={() => setBillingInterval('annual')}
          aria-pressed={billingInterval === 'annual'}
        >
          Annual
          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
            Save ~17%
          </span>
        </button>
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
                'rounded-2xl border bg-white p-6 shadow-sm',
                plan.recommended
                  ? 'border-blue-400 ring-1 ring-blue-400'
                  : 'border-slate-200'
              )}
            >
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-semibold text-slate-900">{plan.publicName}</h2>
                {plan.recommended && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                    Most Popular
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-slate-600">{plan.description}</p>

              <div className="mt-5">
                <p className="text-4xl font-bold text-slate-900">
                  {formatGbpPrice(price)}
                </p>
                <p className="text-sm text-slate-500">
                  {billingInterval === 'monthly' ? 'per month' : 'per year'}
                </p>
                {billingInterval === 'annual' && (
                  <p className="text-xs text-slate-500 mt-1">
                    Equivalent to {formatGbpPrice(monthlyEquivalent)} per month
                  </p>
                )}
              </div>

              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                <li>{formatCap(plan.employeeCap)} tracked employees</li>
                <li>{formatCap(plan.userCap)} user accounts</li>
                <li>14-day free trial</li>
                <li>Upgrade or downgrade at renewal</li>
              </ul>

              <Link
                href="/signup"
                className={cn(
                  'mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  plan.recommended
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                )}
              >
                {plan.ctaLabel}
              </Link>
            </section>
          )
        })}
      </div>

      <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Billing is in GBP and charged either monthly or annually based on your selected cycle.
        Prices are shown excluding VAT.
      </div>
    </div>
  )
}
