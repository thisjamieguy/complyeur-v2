'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { joinWaitlist, type WaitlistState } from '../landing/actions'
import { cn } from '@/lib/utils'
import { BrowserFrame } from '@/components/marketing/browser-frame'
import { DemoCalendar } from '@/components/marketing/demo-calendar'
import { DemoEmployeeList } from '@/components/marketing/demo-employee-list'
import { FeatureTicker } from '@/components/marketing/feature-ticker'
import { FeatureCards } from '@/components/marketing/feature-cards'
import { SkipLink } from '@/components/ui/skip-link'
import { Turnstile } from '@/components/ui/turnstile'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

function WaitlistForm({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const [state, formAction, isPending] = useActionState<WaitlistState, FormData>(
    joinWaitlist,
    { success: false, message: '' }
  )
  const formRef = useRef<HTMLFormElement>(null)
  const [turnstileError, setTurnstileError] = useState(false)
  const emailId = `email-${variant}`
  const companyId = `companyName-${variant}`
  const errorId = `waitlist-error-${variant}`
  const statusId = `waitlist-status-${variant}`

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset()
    }
  }, [state.success])

  if (state.success) {
    return (
      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg
            className="h-6 w-6 text-emerald-600"
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
        <p className="font-medium text-emerald-800">{state.message}</p>
        <p className="mt-2 text-sm text-emerald-700">
          You can close this page now. We will email next steps.
        </p>
      </div>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate>
      <div className={cn('flex gap-3', variant === 'minimal' ? 'flex-col sm:flex-row' : 'flex-col')}>
        <div className="flex-1">
          <label htmlFor={emailId} className="sr-only">
            Email address
          </label>
          <input
            type="email"
            id={emailId}
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            aria-required="true"
            aria-invalid={state.error === 'validation' ? 'true' : undefined}
            aria-describedby={state.message && !state.success ? errorId : statusId}
            className="h-12 w-full rounded-xl border border-slate-300/80 bg-white px-4 text-slate-900 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
          />
        </div>
        {variant === 'default' && (
          <div className="flex-1">
            <label htmlFor={companyId} className="sr-only">
              Company name (optional)
            </label>
            <input
              type="text"
              id={companyId}
              name="companyName"
              autoComplete="organization"
              placeholder="Company name (optional)"
              className="h-12 w-full rounded-xl border border-slate-300/80 bg-white px-4 text-slate-900 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
            />
          </div>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="h-12 whitespace-nowrap rounded-xl bg-slate-900 px-8 font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 motion-safe:animate-spin" viewBox="0 0 24 24" aria-hidden="true">
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
              Submitting...
            </span>
          ) : (
            'Join Waitlist'
          )}
        </button>
      </div>
      <p id={statusId} className="sr-only" role="status" aria-live="polite">
        {isPending ? 'Submitting your waitlist request.' : ''}
      </p>
      {isPending && (
        <p className="text-xs text-slate-500" role="status" aria-live="polite">
          Submitting your waitlist request...
        </p>
      )}

      {TURNSTILE_SITE_KEY && (
        <Turnstile
          siteKey={TURNSTILE_SITE_KEY}
          onError={() => setTurnstileError(true)}
          theme="auto"
          size="normal"
          appearance="interaction-only"
          action="waitlist"
          responseFieldName="cf-turnstile-response"
          className="mt-4"
        />
      )}

      {state.message && !state.success && (
        <p id={errorId} className="mt-2 text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      {turnstileError && !state.message && (
        <p className="mt-2 text-xs text-amber-700">
          Security verification is unavailable. The form will still submit.
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        No spam. Product updates only.
      </p>
    </form>
  )
}

function JourneyStep({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-slate-600">{body}</p>
    </article>
  )
}

function TrustStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 backdrop-blur">
      <p className="landing-serif text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{label}</p>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="landing-shell relative min-h-screen overflow-x-hidden bg-[color:var(--landing-surface)] text-slate-900">
      <SkipLink />

      <div className="pointer-events-none absolute inset-0">
        <div className="landing-aurora-top absolute -top-32 left-[-7rem] h-[26rem] w-[26rem] rounded-full" />
        <div className="landing-aurora-bottom absolute right-[-8rem] top-[22rem] h-[24rem] w-[24rem] rounded-full" />
        <div className="landing-grid absolute inset-0" />
      </div>

      <header className="relative z-30">
        <nav className="sticky top-3 px-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-slate-200/90 bg-white/90 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur-xl sm:px-6">
            <Link href="/" className="shrink-0">
              <Image
                src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg"
                alt="ComplyEur"
                width={172}
                height={46}
                className="h-8 w-auto sm:h-9"
                priority
              />
            </Link>

            <div className="hidden items-center gap-8 lg:flex">
              <Link href="#features" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                How it works
              </Link>
              <Link href="#waitlist" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Early access
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden text-sm font-semibold text-slate-600 transition hover:text-slate-900 sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="#waitlist"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Join Waitlist
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main id="main-content" className="relative z-10">
        <section className="border-b border-slate-200/70 pb-16 pt-14 lg:pb-24 lg:pt-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start xl:grid-cols-2">
            <div>
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm backdrop-blur">
                <Image
                  src="/images/Icons/03_Icon_Only/ComplyEur_Icon.svg"
                  alt="ComplyEur icon"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
                <span className="text-sm font-semibold tracking-[0.06em] text-slate-700">
                  ComplyEur
                </span>
              </div>

              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                Early access for UK teams
              </p>

              <h1 className="landing-serif text-balance text-5xl font-semibold leading-[1.02] text-slate-900 sm:text-6xl lg:text-7xl">
                Know every Schengen day before it becomes a border issue.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                ComplyEur gives operations teams a live 90/180-day command center. Track every traveller,
                catch risk early, and plan EU trips with confidence instead of spreadsheets.
              </p>

              <div id="waitlist" className="landing-panel mt-10 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
                <p className="mb-5 text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Start with the launch cohort
                </p>
                <WaitlistForm variant="default" />
                <Link
                  href="/landing/sandbox"
                  className="mt-4 inline-flex text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
                >
                  Prefer to explore first? Open the interactive calendar sandbox
                </Link>
              </div>

              <FeatureTicker />
            </div>

            <div id="product-demo" className="space-y-5 lg:pt-8">
              <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur">
                <BrowserFrame title="app.complyeur.com" showUrlBar>
                  <DemoEmployeeList />
                </BrowserFrame>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Risk pulse</p>
                  <p className="landing-serif mt-2 text-4xl">17 days</p>
                  <p className="mt-2 text-sm text-slate-300">Average warning lead time before a breach.</p>
                </div>
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-brand-900">
                  <p className="text-xs uppercase tracking-[0.18em] text-brand-700">Coverage</p>
                  <p className="landing-serif mt-2 text-4xl">90/180</p>
                  <p className="mt-2 text-sm text-brand-700">Rule logic updates continuously with each trip.</p>
                </div>
              </div>

              <p className="text-right text-xs text-slate-500">
                Preview feature:{' '}
                <Link href="/landing/sandbox" className="font-medium text-brand-700 underline-offset-4 hover:underline">
                  Try the interactive calendar sandbox
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TrustStat value="90/180" label="Rolling window logic modeled natively, not via manual formulas." />
              <TrustStat value="Live" label="Status updates recalculate immediately whenever trips are changed." />
              <TrustStat value="CSV + XLSX" label="Import historical travel records in minutes for full context." />
              <TrustStat value="GDPR" label="Privacy-first handling designed for people and payroll data." />
            </div>
          </div>
        </section>

        <section className="landing-impact-band relative overflow-hidden bg-slate-900 py-20 text-white">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(69,98,133,0.28),transparent_60%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Why teams switch</p>
              <h2 className="landing-serif text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Fines, entry bans, and grounded projects all start with one missed count.
              </h2>
            </div>
            <div>
              <p className="text-xl leading-relaxed text-slate-200">
                Border enforcement is tighter and tolerance for manual errors is lower. ComplyEur gives travel, operations,
                and HR a single source of truth, so every itinerary decision is backed by live compliance context.
              </p>
            </div>
          </div>
        </section>

        <div id="features">
          <FeatureCards />
        </div>

        <section id="how-it-works" className="bg-slate-50 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">How it works</p>
              <h2 className="landing-serif text-balance text-4xl font-semibold text-slate-900 sm:text-5xl">
                Setup in one session. Start tracking the same day.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                No complex rollout. Add employees, import travel history, and monitor risk from one workspace.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <JourneyStep
                title="Add employees"
                body="Create profiles for people who travel to Schengen countries so their day counts are always current."
              />
              <JourneyStep
                title="Import or log trips"
                body="Upload existing files or enter trips manually. ComplyEur recalculates the full rolling window instantly."
              />
              <JourneyStep
                title="Act before risk"
                body="Use live red/amber/green status to approve plans early and reduce compliance fire drills."
              />
            </div>

            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
              <BrowserFrame title="Timeline view" showUrlBar={false}>
                <DemoCalendar />
              </BrowserFrame>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200/70 bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-7 max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Explore more</p>
              <h2 className="landing-serif text-3xl font-semibold text-slate-900 sm:text-4xl">
                Want to learn more before you sign up?
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/pricing" className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-brand-300 hover:bg-brand-50/60">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Pricing</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">See plans and tiers</p>
                <p className="mt-2 text-sm text-slate-600">Compare plans and choose the best fit for your team.</p>
              </Link>
              <Link href="/about" className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-brand-300 hover:bg-brand-50/60">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">About</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Why ComplyEur exists</p>
                <p className="mt-2 text-sm text-slate-600">Learn our mission and meet the team behind the product.</p>
              </Link>
              <Link href="/faq" className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-brand-300 hover:bg-brand-50/60">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">FAQ</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Get quick answers</p>
                <p className="mt-2 text-sm text-slate-600">Find answers to common setup and usage questions.</p>
              </Link>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-900 py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(92,127,163,0.35),transparent_45%)]" />
          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Launch access</p>
            <h2 className="landing-serif text-balance text-4xl font-semibold text-white sm:text-5xl">
              Build your next EU travel plan on data, not guesswork.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
              Join the waitlist and get early access to automated Schengen tracking for your team.
            </p>
            <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-slate-700/70 bg-slate-950/35 p-6 backdrop-blur">
              <WaitlistForm variant="minimal" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="text-sm text-slate-500" suppressHydrationWarning>
            © {new Date().getFullYear()} ComplyEur. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/about" className="text-slate-500 transition hover:text-slate-900">
              About
            </Link>
            <Link href="/contact" className="text-slate-500 transition hover:text-slate-900">
              Contact
            </Link>
            <Link href="/privacy" className="text-slate-500 transition hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/terms" className="text-slate-500 transition hover:text-slate-900">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
