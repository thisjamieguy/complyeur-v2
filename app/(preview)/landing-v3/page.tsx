import Image from 'next/image'
import Link from 'next/link'
import { BrowserFrame } from '@/components/marketing/browser-frame'
import { DemoCalendar } from '@/components/marketing/demo-calendar'
import { DemoEmployeeList } from '@/components/marketing/demo-employee-list'
import { FeatureTicker } from '@/components/marketing/feature-ticker'
import { FeatureCards } from '@/components/marketing/feature-cards'
import { SkipLink } from '@/components/ui/skip-link'
import { WaitlistForm } from './waitlist-form'

export const dynamic = 'force-static'

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
                Apply for Early Access
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
                Private early access for UK teams
              </p>

              <h1 className="landing-serif text-balance text-5xl font-semibold leading-[1.02] text-slate-900 sm:text-6xl lg:text-7xl">
                Know every Schengen day before each EU trip is approved.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                Built for UK businesses sending staff to the EU, ComplyEur gives HR, operations, and mobility teams a
                live 90/180-day compliance view for every traveller.
              </p>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                As the EU Entry/Exit System (EES) introduces automated border checks, manual day counting leaves less
                room for error. ComplyEur acts as your compliance control layer and system of record for Schengen
                travel.
              </p>

              <div id="waitlist" className="landing-panel mt-10 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
                <p className="mb-5 text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Apply for the limited early-access cohort
                </p>
                <p className="mb-5 text-sm text-slate-600">
                  We are onboarding a private launch group of UK teams with active EU travel.
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
              <TrustStat value="90/180" label="Rolling windows recalculate daily as travel records change." />
              <TrustStat value="Live" label="Each trip update refreshes remaining days instantly across the team." />
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
                Automated EU border controls raise the compliance bar for every trip.
              </h2>
            </div>
            <div>
              <p className="text-xl leading-relaxed text-slate-200">
                With EES-driven automated enforcement, rolling 90/180 limits allow less tolerance for manual errors.
                Because the window recalculates daily, one new trip can change the entire allowance, which is where spreadsheet
                formulas often fail at scale. Built alongside UK engineering and project-based businesses managing
                frequent EU travel, ComplyEur gives HR, operations, and mobility teams one reliable source of truth.
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
                No complex rollout. Add employees, import travel history, and run Schengen travel compliance from one
                workspace.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <JourneyStep
                title="Add employees"
                body="Create profiles for people who travel to Schengen countries so their day counts are always current."
              />
              <JourneyStep
                title="Import or log trips"
                body="Upload existing files or enter trips manually. ComplyEur recalculates the full rolling window instantly across past and future plans."
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
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Private launch cohort</p>
            <h2 className="landing-serif text-balance text-4xl font-semibold text-white sm:text-5xl">
              Secure private early access for your UK travel team.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
              We are onboarding a limited cohort of HR, operations, and mobility teams managing frequent EU travel.
            </p>
            <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-slate-700/70 bg-slate-950/35 p-6 backdrop-blur">
              <WaitlistForm variant="minimal" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="text-sm text-slate-500">
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
