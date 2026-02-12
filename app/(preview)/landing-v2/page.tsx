'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { joinWaitlist, type WaitlistState } from '../landing/actions'
import { cn } from '@/lib/utils'
import { BrowserFrame } from '@/components/marketing/browser-frame'
import { DemoCalendar } from '@/components/marketing/demo-calendar'
import { DemoEmployeeList } from '@/components/marketing/demo-employee-list'
import { FeatureCards } from '@/components/marketing/feature-cards'
import { SkipLink } from '@/components/ui/skip-link'
import { Turnstile } from '@/components/ui/turnstile'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction, isPending] = useActionState<WaitlistState, FormData>(
    joinWaitlist,
    { success: false, message: '' }
  )
  const formRef = useRef<HTMLFormElement>(null)
  const [turnstileError, setTurnstileError] = useState(false)

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset()
    }
  }, [state.success])

  if (state.success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="font-medium text-emerald-800">{state.message}</p>
      </div>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className={cn('grid gap-3', compact ? 'sm:grid-cols-[1fr_auto]' : 'sm:grid-cols-[1fr_1fr_auto]')}>
        <div>
          <label htmlFor={`email-${compact ? 'compact' : 'full'}`} className="sr-only">
            Email address
          </label>
          <input
            type="email"
            id={`email-${compact ? 'compact' : 'full'}`}
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            className="h-12 w-full rounded-xl border border-slate-300/80 bg-white px-4 text-slate-900 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
          />
        </div>

        {!compact && (
          <div>
            <label htmlFor="companyName" className="sr-only">
              Company name (optional)
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              autoComplete="organization"
              placeholder="Company name (optional)"
              className="h-12 w-full rounded-xl border border-slate-300/80 bg-white px-4 text-slate-900 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="h-12 whitespace-nowrap rounded-xl bg-slate-900 px-7 font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Joining...' : 'Join Waitlist'}
        </button>
      </div>

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

      {state.message && !state.success && <p className="mt-2 text-sm text-red-600">{state.message}</p>}
      {turnstileError && !state.message && (
        <p className="mt-2 text-xs text-amber-700">
          Security verification is unavailable. The form will still submit.
        </p>
      )}

      <p className="text-xs text-slate-500">No spam. Product updates only.</p>
    </form>
  )
}

function ProofPill({ label }: { label: string }) {
  return (
    <li className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
      {label}
    </li>
  )
}

function JourneyStep({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-slate-600">{body}</p>
    </article>
  )
}

export default function LandingPageV2() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SkipLink />

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="shrink-0">
            <Image
              src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg"
              alt="ComplyEur"
              width={172}
              height={46}
              className="h-9 w-auto"
              priority
            />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              How it works
            </Link>
            <Link href="#product-demo" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Product demo
            </Link>
            <Link href="#waitlist" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Early access
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-semibold text-slate-600 sm:inline-flex">
              Sign in
            </Link>
            <Link
              href="#waitlist"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              Join Waitlist
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                For UK teams sending staff to Europe
              </p>

              <h1 className="mt-6 text-balance text-5xl font-semibold leading-tight text-slate-900 sm:text-6xl">
                Track every employee&apos;s Schengen days in one clear dashboard.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                ComplyEur helps operations and HR avoid 90/180-day breaches with live risk alerts, instant day totals,
                and better trip planning.
              </p>

              <ul className="mt-7 flex flex-wrap gap-2" aria-label="Proof points">
                <ProofPill label="90/180 rolling rule engine" />
                <ProofPill label="Real-time green/amber/red status" />
                <ProofPill label="CSV + spreadsheet import" />
                <ProofPill label="GDPR-first data handling" />
              </ul>

              <div id="waitlist" className="mt-9 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Get early access
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Join the waitlist and we&apos;ll invite you as soon as your cohort opens.
                </p>
                <div className="mt-5">
                  <WaitlistForm />
                </div>
                <Link
                  href="#product-demo"
                  className="mt-4 inline-flex text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
                >
                  Prefer to explore first? See the product walkthrough
                </Link>
              </div>
            </div>

            <div id="product-demo" className="space-y-4 lg:pt-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
                <BrowserFrame title="app.complyeur.com" showUrlBar>
                  <DemoEmployeeList />
                </BrowserFrame>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Outcome</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">Fewer surprises</p>
                  <p className="mt-2 text-sm text-slate-600">See risk before booking decisions are final.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Payoff</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">Faster planning</p>
                  <p className="mt-2 text-sm text-slate-600">Give teams clear travel headroom in seconds.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">How it works</p>
              <h2 className="mt-3 text-balance text-4xl font-semibold text-slate-900 sm:text-5xl">
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

        <div id="features">
          <FeatureCards />
        </div>

        <section className="border-t border-slate-200 bg-slate-900 py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-balance text-4xl font-semibold text-white sm:text-5xl">
              Ready to make Schengen compliance predictable?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
              Join early access and replace manual day counting with a live compliance view.
            </p>
            <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-slate-700/70 bg-slate-950/40 p-6">
              <WaitlistForm compact />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 sm:flex-row">
          <p className="text-sm text-slate-500" suppressHydrationWarning>
            © {new Date().getFullYear()} ComplyEur. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/about" className="text-slate-500 hover:text-slate-900">About</Link>
            <Link href="/contact" className="text-slate-500 hover:text-slate-900">Contact</Link>
            <Link href="/privacy" className="text-slate-500 hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="text-slate-500 hover:text-slate-900">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
