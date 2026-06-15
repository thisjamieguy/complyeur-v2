// Alternative landing page copy test — review variant at /landing-claude.
// Reuses the existing marketing components and visual system; copy and section
// order are tightened. Lives in the (preview) route group, so it inherits the
// noindex layout and does not affect the live /landing route.
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BriefcaseBusiness,
  CircleAlert,
  Clock3,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react'
import { BrowserFrame } from '@/components/marketing/browser-frame'
import { DemoCalendar } from '@/components/marketing/demo-calendar'
import { DemoEmployeeListStatic } from '@/components/marketing/demo-employee-list-static'
import { SkipLink } from '@/components/ui/skip-link'
import { createPageMetadata } from '@/lib/metadata'
import { marketingPrimaryCta } from '@/lib/marketing-primary-cta'
// Shared, unmodified client component from the live landing route.
import { LandingMobileMenu } from '../landing/landing-mobile-menu'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'ComplyEur — Schengen Compliance Software for UK Travel Teams',
    description:
      'Schengen compliance software for UK employers. Check the 90/180-day rule, review travel history, and spot approval risk before EU trips are booked.',
    path: '/landing-claude',
  }),
  // Review-only variant — keep it out of search indexes.
  robots: {
    index: false,
    follow: false,
  },
}

// Four hero feature boxes — operational problems, not generic SaaS benefits.
const heroHighlights = [
  {
    title: 'Days remaining',
    body: 'See each employee’s Schengen position before the next trip is approved.',
  },
  {
    title: 'No more spreadsheet hunting',
    body: 'Keep trip history, warnings, and approval notes together instead of chasing files.',
  },
  {
    title: 'Start with your current data',
    body: 'Import existing travel history and move future checks into a cleaner workflow.',
  },
  {
    title: 'Approve with context',
    body: 'Review days used, recent trips, and current risk before making the call.',
  },
]

// Why it matters — the operating rhythm, not the rule itself.
const pressurePoints = [
  {
    icon: FileSpreadsheet,
    title: 'The file is never fully current',
    body: 'One itinerary change can make yesterday’s answer wrong today.',
  },
  {
    icon: Clock3,
    title: 'Approvals arrive under time pressure',
    body: 'You still need a confident answer when travel has to be booked quickly.',
  },
  {
    icon: CircleAlert,
    title: 'The answer is on you',
    body: 'When someone asks if a trip is safe, it is your judgement and your record being relied on.',
  },
]

// How it works — three steps, matching the live workflow.
const workflowCards = [
  {
    number: '01',
    title: 'Add travellers',
    body: 'Create an employee record for each person, with one travel history and one current allowance view.',
  },
  {
    number: '02',
    title: 'Import or log trips',
    body: 'Start with your existing data or enter trips by hand. The rolling 90/180 picture updates as the record changes.',
  },
  {
    number: '03',
    title: 'Answer before approval',
    body: 'Check days remaining, see the warning status, and make the call before travel is locked in.',
  },
]

// Why it is better than spreadsheets — the comparison rows.
const comparisonRows = [
  {
    label: 'Before you approve the trip',
    oldWay: 'Open the latest file and hope the numbers are current',
    newWay: 'Open one employee record with days remaining already visible',
  },
  {
    label: 'When plans change',
    oldWay: 'Recheck formulas and hunt for the most recent copy',
    newWay: 'Review the same record after the trip update is saved',
  },
  {
    label: 'When someone asks why',
    oldWay: 'Explain which spreadsheet version you used',
    newWay: 'Point back to the trip history and status on the record',
  },
  {
    label: 'When the team grows',
    oldWay: 'More people touching more files',
    newWay: 'One shared workflow for checking, tracking, and approving',
  },
]

// Proof / trust — what makes the manual approach harder over time.
const statCards = [
  {
    value: '90 / 180',
    label: 'Rolling rule',
    body: 'Days remaining change daily as older travel drops out of the window.',
  },
  {
    value: '29',
    label: 'Countries',
    body: 'Time across the Schengen Area counts against one shared short-stay limit.',
  },
  {
    value: 'EES',
    label: 'Digital records',
    body: 'Entry and exit are now recorded electronically at the border.',
  },
  {
    value: '1 view',
    label: 'Approval screen',
    body: 'Days remaining, recent trips, and warning status sit together for the reviewer.',
  },
]

function StatCard({
  value,
  label,
  body,
}: {
  value: string
  label: string
  body: string
}) {
  return (
    <article className="py-4">
      <p className="landing-serif text-3xl text-slate-950">{value}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  )
}

export default function LandingAltPage() {
  return (
    <div className="landing-font min-h-screen bg-slate-50 text-slate-900">
      <SkipLink />

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
          <Link href="/" className="shrink-0">
            <Image
              src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal_800w.png"
              alt="ComplyEur"
              width={172}
              height={46}
              className="h-8 w-auto"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
            <Link href="#product" className="transition hover:text-slate-900">
              Product
            </Link>
            <Link href="#workflow" className="transition hover:text-slate-900">
              Workflow
            </Link>
            <Link href="/pricing" className="transition hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/faq" className="transition hover:text-slate-900">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-semibold text-slate-600 sm:inline-flex">
              Sign in
            </Link>
            <Link
              href={marketingPrimaryCta.href}
              className="hidden rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:inline-flex"
            >
              {marketingPrimaryCta.label}
            </Link>
            <LandingMobileMenu />
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* 1. What it is — hero + product visual */}
        <section className="px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:items-center">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Schengen approvals</p>
                {/* Hero headline kept close to live version */}
                <h1 className="landing-serif mt-5 text-5xl text-slate-950 sm:text-6xl">
                  Schengen compliance software for UK employers approving EU travel.
                </h1>
                {/* Alternative landing page copy test — shorter, more direct hero support */}
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  Know where every employee stands before approving EU travel. ComplyEur helps UK teams check Schengen
                  days, review travel history, and spot approval risk without rebuilding the answer from spreadsheets.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={marketingPrimaryCta.href}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {marketingPrimaryCta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    View pricing
                  </Link>
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  Want to click through the interface first?{' '}
                  <Link href="/landing/preview" className="font-medium text-brand-700 hover:underline">
                    Open the interactive preview
                  </Link>
                  .
                </p>

                <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                  <span>HR travel checks</span>
                  <span className="hidden text-slate-300 sm:inline">/</span>
                  <span>repeat EU trips</span>
                  <span className="hidden text-slate-300 sm:inline">/</span>
                  <span>approval risk</span>
                </div>
              </div>

              <div id="product" className="min-w-0 space-y-4">
                <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Current allowance overview</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Travel history and days remaining, before the next approval.
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Updated live
                    </div>
                  </div>
                  <BrowserFrame title="app.complyeur.com" showUrlBar>
                    <DemoEmployeeListStatic />
                  </BrowserFrame>
                </div>

              </div>
            </div>

            {/* Alternative landing page copy test — checklist instead of AI-looking mini cards */}
            <div className="mt-12 grid gap-x-8 gap-y-6 md:grid-cols-4">
              {heroHighlights.map((item, index) => (
                <div key={item.title} className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-slate-400">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <div className="mt-3">
                    <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 grid gap-4 border-t border-slate-200 pt-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <p className="text-sm font-semibold text-slate-950">What changes when you move off spreadsheets</p>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                You stop rebuilding the answer from separate files and start reviewing the current position before
                travel gets approved.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Why it matters */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:items-start">
            <div>
              <h2 className="landing-serif text-4xl text-slate-900 sm:text-5xl">
                The rule is not the hard part. The operating rhythm is.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Short-stay compliance gets hard when plans move, several people touch the process, and someone still
                needs a dependable answer before a trip is booked.
              </p>
            </div>

            <div className="grid gap-6">
              {pressurePoints.map((item) => {
                const Icon = item.icon
                return (
                  <article
                    key={item.title}
                    className="grid gap-4 sm:grid-cols-[3rem_minmax(0,1fr)]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center text-brand-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* 3. How it works */}
        <section id="workflow" className="px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
              <div>
                <h2 className="landing-serif text-4xl text-slate-900 sm:text-5xl">
                  Add travellers, log trips, answer before approval.
                </h2>
                <p className="mt-6 text-base leading-7 text-slate-600">
                  The goal is not to create more process. It is to make the approval decision easier to trust.
                </p>
              </div>

              <div className="grid min-w-0 gap-8 sm:grid-cols-3">
                {workflowCards.map((card) => (
                  <article
                    key={card.number}
                    className="min-w-0"
                  >
                    <p className="font-mono text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {card.number}
                    </p>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">{card.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-10 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
              <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <BrowserFrame title="Timeline view">
                  <DemoCalendar />
                </BrowserFrame>
              </div>

              <div className="grid min-w-0 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Daily view of the rolling window</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    See overlapping trips across the team without jumping between separate records.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Warnings before approval</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Close calls are easier to spot on the timeline before travel is confirmed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Why it is better than spreadsheets */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <h2 className="landing-serif text-4xl text-slate-900 sm:text-5xl">
                Stop rebuilding the answer every time someone needs to travel.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                See the current position, travel history, and approval risk in one place before the trip is approved.
              </p>
            </div>

            {/* Mobile: stacked comparison rows */}
            <div className="mt-10 grid gap-8 lg:hidden">
              {comparisonRows.map((row) => (
                <article key={row.label}>
                  <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                  <div className="mt-4 grid gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Spreadsheet process</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{row.oldWay}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">ComplyEur process</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{row.newWay}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop: comparison grid */}
            <div className="mt-10 hidden lg:block">
              <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[16rem_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Moment</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Spreadsheet process</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">ComplyEur process</div>
                {comparisonRows.map((row) => (
                  <ComparisonRow key={row.label} label={row.label} oldWay={row.oldWay} newWay={row.newWay} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 5. Proof / trust */}
        <section className="px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <h2 className="landing-serif text-4xl text-slate-900 sm:text-5xl">
                Border records are going digital. Rough checks are getting riskier.
              </h2>
              <p className="mt-6 text-base leading-7 text-slate-600">
                With EES recording entries and exits at the border, it is harder to lean on inconsistent files and
                last-minute reassurance. ComplyEur is built for UK employers who want an audit-ready record behind every
                approval.
              </p>
            </div>

            <div className="mt-10">
              <div className="grid gap-8 lg:grid-cols-4">
                {statCards.map((card) => (
                  <StatCard key={card.label} value={card.value} label={card.label} body={card.body} />
                ))}
              </div>
              <article className="mt-8">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Audit-ready records</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Every approval is backed by the trip history it was based on.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* 6. Final CTA */}
        <section className="bg-slate-900 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl text-white">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="landing-serif text-4xl text-white sm:text-5xl">
                Give your travel approvals a better system behind them.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                Create your account, import your travel history, and move future Schengen checks into a workflow your
                team can trust.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={marketingPrimaryCta.href}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  {marketingPrimaryCta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-2 py-3 text-sm font-semibold text-white transition hover:text-slate-200"
                >
                  View pricing
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-4 w-4 text-slate-400" />
                  <span>Built for operational teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <span>Privacy-aware travel records</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-400" />
                  <span>Designed for repeat approvals</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-white px-4 py-10 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-slate-900">ComplyEur</p>
              <p className="mt-1">© 2026 ComplyEur. All rights reserved.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/pricing" className="transition hover:text-slate-900">
                Pricing
              </Link>
              <Link href="/faq" className="transition hover:text-slate-900">
                FAQ
              </Link>
              <Link href="/about" className="transition hover:text-slate-900">
                About
              </Link>
              <Link href="/contact" className="transition hover:text-slate-900">
                Contact
              </Link>
              <Link href="/privacy" className="transition hover:text-slate-900">
                Privacy
              </Link>
              <Link href="/terms" className="transition hover:text-slate-900">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

function ComparisonRow({
  label,
  oldWay,
  newWay,
}: {
  label: string
  oldWay: string
  newWay: string
}) {
  return (
    <>
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <div className="text-sm leading-6 text-slate-600">{oldWay}</div>
      <div className="text-sm leading-6 text-slate-700">{newWay}</div>
    </>
  )
}
