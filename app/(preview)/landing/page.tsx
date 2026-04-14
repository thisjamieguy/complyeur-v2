import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { BrowserFrame } from '@/components/marketing/browser-frame'
import { DemoCalendar } from '@/components/marketing/demo-calendar'
import { DemoEmployeeList } from '@/components/marketing/demo-employee-list'
import { SkipLink } from '@/components/ui/skip-link'
import { marketingPrimaryCta } from '@/lib/marketing-primary-cta'
import { LandingMobileMenu } from './landing-mobile-menu'

// All data on this page is module-level constants — no dynamic dependencies.
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'ComplyEur — Schengen Compliance Software for UK Travel Teams',
  description:
    'Manage international travel compliance without the spreadsheet drag. ComplyEur gives your team a clear view of Schengen allowance, trip history, and upcoming risk before travel is approved.',
  robots: {
    index: true,
    follow: true,
  },
}

const proofPoints = [
  {
    value: '90/180',
    label: 'Rolling windows recalculate daily as travel records change.',
  },
  {
    value: 'Live',
    label: 'Each trip update refreshes remaining days instantly across the team.',
  },
  {
    value: 'CSV + XLSX',
    label: 'Import historical travel records in minutes for full context.',
  },
  {
    value: 'GDPR',
    label: 'Privacy-first handling designed for people and payroll data.',
  },
]

const problemReasons = [
  'A single extra trip changes the rolling window for future approvals.',
  'Entry and exit days both count, so short business travel stacks faster than expected.',
  'Spreadsheet versions drift, which means teams approve travel from stale data.',
]

const ruleFacts = [
  {
    value: '90 / 180',
    label: 'Rolling-day limit',
    body: 'Most UK business travellers are limited to 90 days across any rolling 180-day period.',
  },
  {
    value: '29',
    label: 'Countries, one allowance',
    body: 'Time in the Schengen Area accumulates across participating countries under one shared allowance.',
  },
  {
    value: 'Daily',
    label: 'Allowance shifts',
    body: 'Each day old trips drop out of the window, and each new booking redraws the safe margin.',
  },
]

const evidenceStats = [
  {
    value: '16,000',
    label: 'Travellers refused entry',
    body: 'Recorded in the first four months of EES, showing that automated border controls are already changing outcomes.',
  },
  {
    value: '4,000+',
    label: 'Caught overstaying',
    body: 'Detected against the 90/180-day Schengen limit once entry and exit records moved into a live digital system.',
  },
  {
    value: '30M',
    label: 'Border crossings tracked',
    body: 'Biometric border records captured since October 2025, creating a persistent audit trail for each trip.',
  },
]

const featureItems = [
  {
    eyebrow: 'Team-wide Schengen visibility',
    title: 'One control layer for every traveller',
    body: 'See who is compliant, who is nearing limits, and what to approve next from one record.',
  },
  {
    eyebrow: 'Formula-free day calculations',
    title: 'Rolling 90/180 logic recalculated daily',
    body: 'Add one trip and every allowance updates instantly across the full window.',
  },
  {
    eyebrow: 'Compliance decisions earlier',
    title: 'Warnings before plans become breaches',
    body: 'Green, amber, and red status highlights risk early enough to replan with confidence.',
  },
  {
    eyebrow: 'Single Schengen system of record',
    title: 'Bring existing travel history in fast',
    body: 'Import spreadsheets or log trips manually, then keep everything in one auditable timeline.',
  },
]

const howItWorksSteps = [
  {
    title: 'Add employees',
    body: 'Create profiles for people who travel to Schengen countries so their day counts are always current.',
  },
  {
    title: 'Import or log trips',
    body: 'Upload existing files or enter trips manually. ComplyEur recalculates the full rolling window instantly across past and future plans.',
  },
  {
    title: 'Act before risk',
    body: 'Use live red, amber, and green status to approve plans early and reduce compliance fire drills.',
  },
]

const resourceLinks = [
  {
    href: '/pricing',
    eyebrow: 'Pricing',
    title: 'See plans and tiers',
    body: 'Compare plans and choose the best fit for your team.',
  },
  {
    href: '/about',
    eyebrow: 'About',
    title: 'Why ComplyEur exists',
    body: 'Learn the mission behind the product and the problem it is built to solve.',
  },
  {
    href: '/faq',
    eyebrow: 'FAQ',
    title: 'Get quick answers',
    body: 'Read the practical questions teams ask before adopting a new workflow.',
  },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
      {children}
    </p>
  )
}

function ContentCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  )
}

function MetricCard({
  value,
  label,
  body,
}: {
  value: string
  label: string
  body: string
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  )
}

function FeatureCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-brand-700">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  )
}

export default function LandingPage() {
  return (
    <div className="landing-shell landing-font relative min-h-screen overflow-x-hidden bg-[color:var(--landing-surface)] text-slate-900">
      <SkipLink />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="landing-aurora-top absolute -top-32 left-[-7rem] h-[26rem] w-[26rem] rounded-full" />
        <div className="landing-aurora-bottom absolute right-[-8rem] top-[18rem] h-[24rem] w-[24rem] rounded-full" />
        <div className="landing-grid absolute inset-0" />
        <div className="absolute left-0 top-28 h-56 w-56 rounded-full bg-brand-300/15 blur-3xl" />
        <div className="absolute right-0 top-[34rem] h-64 w-64 rounded-full bg-brand-500/12 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-slate-200/80" />
      </div>

      <header className="relative z-30 px-4 pt-5 sm:px-6 sm:pt-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-slate-200/90 bg-white/90 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur-xl sm:px-6">
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
            <Link href="#product" className="transition hover:text-brand-800">
              Product
            </Link>
            <Link href="#why-switch" className="transition hover:text-brand-800">
              Why switch
            </Link>
            <Link href="#how-it-works" className="transition hover:text-brand-800">
              How it works
            </Link>
            <Link href="/landing/preview" className="transition hover:text-brand-800">
              Interactive preview
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-semibold text-slate-600 sm:inline-flex">
              Sign in
            </Link>
            <Link
              href={marketingPrimaryCta.href}
              className="hidden rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 sm:inline-flex"
            >
              {marketingPrimaryCta.label}
            </Link>
            <LandingMobileMenu />
          </div>
        </div>
      </header>

      <main id="main-content" className="relative z-10">
        <section className="px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pb-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Schengen compliance software for UK travel teams</SectionLabel>
              <h1 className="mt-4 text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Manage international travel compliance without the spreadsheet drag.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                ComplyEur gives your team a clear view of Schengen allowance, trip history, and upcoming risk before
                travel is approved.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={marketingPrimaryCta.href}
                  className="rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
                >
                  {marketingPrimaryCta.label}
                </Link>
                <Link
                  href="/landing/preview"
                  className="rounded-full border border-slate-300 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-slate-900"
                >
                  Open interactive preview
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Built for HR, operations, mobility, and finance teams handling regular EU travel.
              </p>
            </div>

            <div
              id="product"
              className="landing-panel relative mt-12 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-6"
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="relative">
                  <BrowserFrame title="app.complyeur.com" showUrlBar>
                    <DemoEmployeeList />
                  </BrowserFrame>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:hidden">
                    <div className="rounded-xl border border-slate-200 bg-brand-50/60 p-4">
                      <p className="text-sm font-semibold text-slate-900">Rolling checks</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Each update redraws the latest allowance and risk state without manual formulas.
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-brand-50/60 p-4">
                      <p className="text-sm font-semibold text-slate-900">Faster imports</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Start with existing CSV or spreadsheet records instead of rebuilding history by hand.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="hidden gap-4 lg:grid">
                  <div className="rounded-xl border border-slate-200 bg-brand-50/60 p-5">
                    <p className="text-sm font-semibold text-slate-900">Daily rolling logic</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Trip edits update the allowance view instantly, so approvals are based on current data.
                    </p>
                  </div>
                  <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
                    <p className="text-sm font-semibold text-slate-900">Travel approval signal</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Green, amber, and red status gives managers a quick operating view before someone travels.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-brand-50/60 p-5">
                    <p className="text-sm font-semibold text-slate-900">One record, not five files</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Employee profiles, trip history, and timelines sit together instead of living in separate tabs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {proofPoints.map((point) => (
                <div key={point.value} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-2xl font-semibold text-slate-900">{point.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{point.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="why-switch" className="border-y border-slate-200/80 bg-white/80 px-4 py-16 backdrop-blur-sm sm:px-6 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.05fr)_24rem] lg:items-start">
            <div>
              <SectionLabel>Manual tolerance is lower</SectionLabel>
              <h2 className="mt-4 max-w-3xl text-balance text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                A Schengen breach rarely starts at the border. It starts with stale data before a trip is approved.
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
                The rule is simple. The operating reality is not. One itinerary change can redraw remaining allowance,
                shift approval decisions, and expose the team too late if records live in spreadsheets.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">What usually breaks first</p>
              <div className="mt-5 space-y-4">
                {problemReasons.map((reason, index) => (
                  <div key={reason} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto mt-10 grid max-w-7xl gap-4 lg:grid-cols-3">
            {ruleFacts.map((fact) => (
              <MetricCard key={fact.label} value={fact.value} label={fact.label} body={fact.body} />
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-7xl rounded-xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <SectionLabel>Enforcement is real</SectionLabel>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  EES has made short-stay compliance measurable at the border. Overstays and refused entries are no
                  longer hidden inside passport stamps and manual reconciliations.
                </p>
              </div>
              <p className="text-sm text-slate-500">
                Source: European Commission and European Parliament testimony, February 2026
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {evidenceStats.map((stat) => (
                <MetricCard key={stat.label} value={stat.value} label={stat.label} body={stat.body} />
              ))}
            </div>

            <p className="mt-8 border-t border-slate-200 pt-6 text-base leading-7 text-slate-600">
              Since October 2025, the EU&apos;s Entry/Exit System has digitally recorded every entry and exit at
              Schengen borders. Overstayers are flagged automatically, with far less room for manual interpretation.
              If your employees travel to Europe for work, their compliance is no longer invisible. It is tracked.
            </p>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,rgba(240,244,248,0.65),rgba(255,255,255,0.75))] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <SectionLabel>Features</SectionLabel>
              <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                Compliance infrastructure for frequent EU travel.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                ComplyEur replaces spreadsheet tracking with a dedicated Schengen control layer for HR, operations, and
                mobility teams.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featureItems.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  eyebrow={feature.eyebrow}
                  title={feature.title}
                  body={feature.body}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white/85 px-4 py-16 backdrop-blur-sm sm:px-6 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
            <div>
              <SectionLabel>How it works</SectionLabel>
              <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                Setup in one session. Start tracking the same day.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                No complex rollout. Add employees, import travel history, and run Schengen travel compliance from one
                workspace.
              </p>

              <div className="mt-8 grid gap-4">
                {howItWorksSteps.map((step) => (
                  <ContentCard key={step.title} title={step.title} body={step.body} />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <BrowserFrame title="Timeline view">
                <DemoCalendar />
              </BrowserFrame>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(240,244,248,0.7))] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <SectionLabel>Explore more</SectionLabel>
              <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                Want to learn more before you sign up?
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Compare plans, understand the company story, and read the practical questions teams usually ask first.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {resourceLinks.map((resource) => (
                <Link
                  key={resource.href}
                  href={resource.href}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300"
                >
                  <p className="text-sm font-semibold text-brand-700">{resource.eyebrow}</p>
                  <h3 className="mt-3 text-xl font-semibold text-slate-900">{resource.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{resource.body}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="get-started" className="px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl rounded-xl border border-brand-200/80 bg-[linear-gradient(135deg,rgba(240,244,248,0.96),rgba(220,228,237,0.86))] p-8 shadow-sm lg:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <SectionLabel>Get started</SectionLabel>
              <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                Start tracking Schengen compliance for your team today.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-600">
                Create your account, choose a plan, and have your team set up in one session.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={marketingPrimaryCta.href}
                  className="rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
                >
                  {marketingPrimaryCta.label}
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-slate-300 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-slate-900"
                >
                  View pricing
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">No waitlist. Self-serve signup and billing are live.</p>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6">
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
