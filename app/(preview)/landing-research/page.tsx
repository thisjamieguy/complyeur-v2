import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react'
import { BrowserFrame } from '@/components/marketing/browser-frame'
import { DashboardScrollFocus } from '@/components/marketing/dashboard-scroll-focus'
import { DemoCalendar } from '@/components/marketing/demo-calendar'
import { DemoEmployeeListStatic } from '@/components/marketing/demo-employee-list-static'
import { SkipLink } from '@/components/ui/skip-link'
import { createPageMetadata } from '@/lib/metadata'
import { marketingPrimaryCta } from '@/lib/marketing-primary-cta'
import { LandingMobileMenu } from '../landing/landing-mobile-menu'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'ComplyEur — Research-led Landing Page Concept',
    description:
      'A design-history informed alternate landing page concept for ComplyEur, focused on product proof, clear hierarchy, and enterprise trust.',
    path: '/landing-research',
  }),
  robots: {
    index: false,
    follow: false,
  },
}

const workflowSteps = [
  {
    number: '01',
    title: 'Create your traveller roster',
    body: 'Add the employees who travel into the Schengen Area and keep each person’s history in one place.',
  },
  {
    number: '02',
    title: 'Import or log trips',
    body: 'Start with existing CSV or spreadsheet records, then update new trips as plans change.',
  },
  {
    number: '03',
    title: 'Review before approval',
    body: 'Check days used, days remaining, warning status, and recent trips before someone confirms travel.',
  },
  {
    number: '04',
    title: 'Keep the audit trail',
    body: 'Maintain the travel record behind each decision so future reviews are not rebuilt from memory.',
  },
]

const comparisonRows = [
  {
    label: 'Before you approve',
    oldWay: 'Find the latest workbook and recalculate the rolling window.',
    newWay: 'Open the traveller record and review the current Schengen position.',
  },
  {
    label: 'When plans move',
    oldWay: 'Update formulas, recheck assumptions, and hope everyone uses the same version.',
    newWay: 'Edit the trip once and let the approval context update around it.',
  },
  {
    label: 'When asked why',
    oldWay: 'Explain the spreadsheet version and manual logic used at the time.',
    newWay: 'Point to the record, warning state, and trip history behind the decision.',
  },
]

const trustItems = [
  'Tenant-aware data model with Supabase RLS',
  'Deterministic 90/180-day calculation logic',
  'Consent-aware public analytics setup',
  'Audit and GDPR workflows already part of the product',
]

function SectionIntro({
  title,
  body,
  dark = false,
}: {
  title: string
  body: string
  dark?: boolean
}) {
  return (
    <div className="max-w-2xl">
      <h2
        className={`landing-serif text-balance text-4xl font-semibold leading-tight sm:text-5xl ${
          dark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {title}
      </h2>
      <p className={`mt-5 text-lg leading-8 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
        {body}
      </p>
    </div>
  )
}

function HeroProductVisual() {
  return (
    <div className="relative min-w-0 lg:pt-8">
      <DashboardScrollFocus>
        <div className="min-w-0 rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Live 90/180-day tracking
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Current traveller status</p>
            </div>
            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Updated live
            </span>
          </div>
          <BrowserFrame title="app.complyeur.com" showUrlBar>
            <DemoEmployeeListStatic highlightedEmployeeName="Emma Thompson" />
          </BrowserFrame>
        </div>
      </DashboardScrollFocus>
    </div>
  )
}

export default function LandingResearchPage() {
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
              <Link href="#product" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Product
              </Link>
              <Link href="#workflow" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Workflow
              </Link>
              <Link href="#trust" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Trust
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Pricing
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
                href={marketingPrimaryCta.href}
                className="hidden rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 sm:inline-flex"
              >
                {marketingPrimaryCta.label}
              </Link>
              <LandingMobileMenu />
            </div>
          </div>
        </nav>
      </header>

      <main id="main-content" className="relative z-10">
        <section className="border-b border-slate-200/70 pb-16 pt-14 lg:pb-24 lg:pt-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
            <div className="min-w-0">
              <h1 className="landing-serif max-w-full text-balance text-4xl font-semibold leading-[1.04] text-slate-900 sm:text-6xl lg:text-7xl">
                Schengen compliance software for UK employers approving EU travel.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                ComplyEur gives HR, operations, and mobility teams a live 90/180-day record for
                every traveller, so approvals are based on current data, not manual counting.
              </p>

              <p className="mt-4 max-w-xl text-sm font-medium text-slate-700">
                Avoid overstays. Avoid fines. Avoid border refusals.
              </p>
              <p className="mt-2 max-w-xl text-sm text-slate-500">
                No spreadsheets. No manual counting. One live record per approval.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={marketingPrimaryCta.href}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
                >
                  {marketingPrimaryCta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/landing/preview"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
                >
                  See the product
                </Link>
              </div>

            </div>

            <HeroProductVisual />
          </div>
        </section>

        <section className="landing-impact-band relative overflow-hidden bg-slate-900 py-20 text-white">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(69,98,133,0.28),transparent_60%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.76fr_1.24fr] lg:items-start">
            <SectionIntro
              dark
              title="Replace manual spreadsheet checks with a live approval record."
              body="The same approval moments stay familiar, but the underlying record becomes current, shared, and easier to explain."
            />

            <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/[0.06] shadow-xl shadow-slate-950/20 backdrop-blur">
              <div className="hidden border-b border-white/10 bg-white/[0.04] text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 md:grid md:grid-cols-[0.78fr_1fr_1fr]">
                <div className="px-5 py-4">Moment</div>
                <div className="px-5 py-4">Manual methods</div>
                <div className="px-5 py-4">ComplyEur</div>
              </div>
              {comparisonRows.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-4 border-b border-white/10 p-5 last:border-b-0 md:grid-cols-[0.78fr_1fr_1fr]"
                >
                  <p className="text-sm font-semibold text-white">{row.label}</p>
                  <p className="text-sm leading-6 text-slate-300">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 md:hidden">
                      Manual methods
                    </span>
                    {row.oldWay}
                  </p>
                  <p className="text-sm font-medium leading-6 text-brand-100">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-brand-200 md:hidden">
                      ComplyEur
                    </span>
                    {row.newWay}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-18 sm:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
              <SectionIntro
                title="The consequences usually arrive after approval."
                body="The risk is not only a wrong calculation. It is the disruption that follows when nobody can see the current travel position clearly."
              />

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {[
                  {
                    label: 'At the border',
                    title: 'A traveller may not have enough allowance left',
                    body: 'A trip that looked fine in a spreadsheet can become difficult to explain when recent or planned days were missed.',
                  },
                  {
                    label: 'In the business',
                    title: 'Plans can become harder to change cleanly',
                    body: 'Late checks can lead to rebooked travel, delayed work, and more time spent rebuilding the answer by hand.',
                  },
                  {
                    label: 'After the decision',
                    title: 'The approval trail can be hard to defend',
                    body: 'If the record is split across files, messages, and old workbook versions, it is harder to show what was checked at the time.',
                  },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="grid gap-3 border-b border-slate-200 p-6 last:border-b-0 sm:grid-cols-[0.28fr_0.72fr] sm:gap-6"
                  >
                    <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                    <div>
                      <h3 className="text-lg font-semibold leading-7 text-slate-900">{item.title}</h3>
                      <p className="mt-2 text-base leading-7 text-slate-600">{item.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
              <SectionIntro
                title="Plan future EU travel before it becomes a compliance problem."
                body="Review upcoming trips against each traveller’s rolling allowance, then adjust dates, destinations, or approvals before bookings are confirmed."
              />

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-xl shadow-slate-900/5">
                <BrowserFrame title="Future travel timeline" showUrlBar={false}>
                  <DemoCalendar />
                </BrowserFrame>
              </div>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {[
                {
                  icon: CalendarCheck2,
                  title: 'Future trips in context',
                  body: 'See planned travel alongside recent history so the next approval is judged against the full window.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Risk visible before booking',
                  body: 'Spot amber and red travel plans while there is still time to move dates or change the itinerary.',
                },
                {
                  icon: BadgeCheck,
                  title: 'Approval options stay open',
                  body: 'Give reviewers enough context to approve, delay, or replan travel before it becomes a last-minute decision.',
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="bg-slate-50 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
              <div className="max-w-xl">
                <h2 className="landing-serif max-w-lg text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                  A cleaner approval flow without extra process.
                </h2>
                <p className="mt-5 text-base leading-7 text-slate-600">
                  Start with existing travel history, then move new checks into a shared review
                  flow your team can explain later.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {workflowSteps.map((step) => (
                  <article
                    key={step.number}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                        {step.number}
                      </div>
                    </div>
                    <h3 className="max-w-xs text-lg font-semibold leading-7 text-slate-900">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="trust" className="relative overflow-hidden bg-slate-900 py-20 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(92,127,163,0.35),transparent_45%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <SectionIntro
              dark
              title="A clear record for every Schengen decision."
              body="Keep calculation logic, tenant controls, and approval evidence visible so teams can review the answer they relied on."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                  <p className="text-sm font-medium leading-6 text-slate-200">{item}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:col-span-2">
                <div className="flex items-center gap-3">
                  <LockKeyhole className="h-5 w-5 text-brand-200" aria-hidden="true" />
                  <p className="text-sm font-semibold text-white">Built around a defensible record</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Employee travel history, warning state, and approval context stay together so the
                  team can review what was known when a decision was made.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-8 text-center shadow-xl shadow-slate-900/5 backdrop-blur lg:p-12">
              <h2 className="landing-serif mx-auto max-w-3xl text-balance text-4xl font-semibold text-slate-900 sm:text-5xl">
                Give every Schengen approval a clearer system behind it.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Create your account, import the travel history you already have, and move future
                checks into a workflow your team can trust.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={marketingPrimaryCta.href}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
                >
                  {marketingPrimaryCta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="text-sm text-slate-500">© 2026 ComplyEur. All rights reserved.</div>
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
