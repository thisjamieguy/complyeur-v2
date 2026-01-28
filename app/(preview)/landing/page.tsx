'use client'

import { useActionState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { joinWaitlist, type WaitlistState } from './actions'
import { cn } from '@/lib/utils'
import { BrowserFrame } from '@/components/marketing/browser-frame'
import { DemoCalendar } from '@/components/marketing/demo-calendar'
import { DemoEmployeeList } from '@/components/marketing/demo-employee-list'
import { FeatureTicker } from '@/components/marketing/feature-ticker'
import { FeatureCards } from '@/components/marketing/feature-cards'
import { SkipLink } from '@/components/ui/skip-link'

// Waitlist form component
function WaitlistForm({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const [state, formAction, isPending] = useActionState<WaitlistState, FormData>(
    joinWaitlist,
    { success: false, message: '' }
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset()
    }
  }, [state.success])

  if (state.success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-emerald-800 font-medium">{state.message}</p>
      </div>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className={cn('flex gap-3', variant === 'minimal' ? 'flex-col sm:flex-row' : 'flex-col')}>
        <div className="flex-1">
          <label htmlFor={`email-${variant}`} className="sr-only">
            Email address
          </label>
          <input
            type="email"
            id={`email-${variant}`}
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
          />
        </div>
        {variant === 'default' && (
          <div className="flex-1">
            <label htmlFor="companyName" className="sr-only">
              Company name (optional)
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              autoComplete="organization"
              placeholder="Company name (optional)"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
            />
          </div>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="motion-safe:animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Joining...
            </span>
          ) : (
            'Join Waitlist'
          )}
        </button>
      </div>

      {state.message && !state.success && (
        <p className="text-sm text-red-600 mt-2">{state.message}</p>
      )}

      <p className="text-xs text-slate-500 mt-3">
        No spam, ever. We&apos;ll only email you about ComplyEUR updates.
      </p>
    </form>
  )
}

// Step component for "How it works"
function Step({
  number,
  title,
  description,
}: {
  number: number
  title: string
  description: string
}) {
  return (
    <div className="relative flex gap-6">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
          {number}
        </div>
        {number < 3 && (
          <div className="w-0.5 h-full bg-slate-200 mt-4" />
        )}
      </div>
      <div className="pb-12">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600">{description}</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SkipLink />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="ComplyEUR"
              width={172}
              height={80}
              className="h-12 w-auto"
              priority
            />
          </Link>
          <Link
            href="#waitlist"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Join Waitlist
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="main-content" className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />

        {/* Center Content */}
        <div className="relative max-w-3xl mx-auto px-6 py-24 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            Now accepting early access signups
          </div>

          <p className="text-lg text-slate-500 font-medium mb-4">
            The rules haven&apos;t changed. The enforcement got tighter.
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6 text-balance">
            How are you tracking your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600">
              team&apos;s Schengen days?
            </span>
          </h1>

          <p className="text-xl text-slate-600 leading-relaxed mb-10 max-w-xl mx-auto">
            Track the EU 90/180-day rule for your UK team. No more spreadsheets,
            no more guesswork — just automated compliance monitoring.
          </p>

          <div id="waitlist" className="max-w-md mx-auto">
            <WaitlistForm variant="minimal" />
          </div>

          <FeatureTicker />
        </div>

        {/* Hero Screenshot */}
        <div className="relative max-w-5xl mx-auto px-6 pb-24">
          {/* Decorative gradients */}
          <div className="absolute -z-10 top-0 left-1/4 w-72 h-72 bg-brand-400/20 rounded-full blur-3xl" />
          <div className="absolute -z-10 bottom-0 right-1/4 w-72 h-72 bg-slate-900/10 rounded-full blur-3xl" />

          <BrowserFrame title="app.complyeur.com" showUrlBar>
            <DemoEmployeeList />
          </BrowserFrame>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-balance">
            The 90/180 rule is harder than it looks
          </h2>
          <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Your employees can only spend 90 days in the Schengen area within any rolling 180-day window.
            <span className="text-brand-300 font-medium"> Miss the count, and you&apos;re facing fines, entry bans, and employees turned away at the border.</span>
          </p>
        </div>
      </section>

      {/* Features */}
      <FeatureCards />

      {/* How It Works */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 text-balance">
                Get started in minutes
              </h2>
              <p className="text-xl text-slate-600 mb-12">
                ComplyEUR is designed to be simple. No complex setup, no training required.
              </p>

              <div>
                <Step
                  number={1}
                  title="Add your employees"
                  description="Create profiles for team members who travel to the EU. Include passport details for accurate tracking."
                />
                <Step
                  number={2}
                  title="Log trips"
                  description="Enter travel dates manually or bulk import from spreadsheets. We handle the rest."
                />
                <Step
                  number={3}
                  title="Stay compliant"
                  description="Monitor status in real-time. Get alerts before limits are reached. Plan future trips with confidence."
                />
              </div>
            </div>

            {/* Interactive calendar demo */}
            <div className="lg:sticky lg:top-32">
              <BrowserFrame title="Trip Calendar" showUrlBar={false}>
                <DemoCalendar />
              </BrowserFrame>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 text-balance">
            Ready to simplify compliance?
          </h2>
          <p className="text-xl text-slate-300 mb-10">
            Join the waitlist for early access. Be the first to know when we launch.
          </p>
          <div className="max-w-md mx-auto">
            <WaitlistForm variant="minimal" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-slate-500 text-sm" suppressHydrationWarning>
              © {new Date().getFullYear()} ComplyEUR. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/about" className="text-slate-500 hover:text-slate-900 transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-slate-500 hover:text-slate-900 transition-colors">
                Contact
              </Link>
              <Link href="/privacy" className="text-slate-500 hover:text-slate-900 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-slate-500 hover:text-slate-900 transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
