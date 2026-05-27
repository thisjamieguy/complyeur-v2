import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
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
import { LandingMobileMenu } from './landing-mobile-menu'

export const dynamic = 'force-static'

export const metadata: Metadata = createPageMetadata({
  title: 'ComplyEur — Schengen Compliance Software for UK Travel Teams',
  description:
    'Schengen compliance software for UK employers tracking the 90/180-day rule, employee travel risk, and EU trip approvals before bookings are confirmed.',
  path: '/landing',
})

const roleSignals = [
  'For HR and people teams checking employee travel',
  'For operations teams coordinating repeat EU trips',
  'For finance and mobility teams carrying approval risk',
]

const heroHighlights = [
  {
    title: 'Live allowance',
    body: 'See remaining Schengen days per employee before you approve the next trip.',
  },
  {
    title: 'Shared record',
    body: 'Keep trip history, warnings, and context in one place instead of scattered files.',
  },
  {
    title: 'Practical onboarding',
    body: 'Import the spreadsheet history you already have and move forward from there.',
  },
  {
    title: 'Decision context',
    body: 'Review days used, current risk, and recent travel in the same approval screen.',
  },
]

const pressurePoints = [
  {
    icon: FileSpreadsheet,
    title: 'The file is never fully current',
    body: 'One itinerary change can make the answer you gave yesterday less reliable today.',
  },
  {
    icon: Clock3,
    title: 'Approvals arrive with time pressure',
    body: 'You still need to give a confident answer when travel needs to be booked quickly.',
  },
  {
    icon: CircleAlert,
    title: 'The risk lands on the checker',
    body: 'When someone asks if a trip is safe, it is your judgement and your record being relied on.',
  },
]

const workflowCards = [
  {
    number: '01',
    title: 'Add travellers',
    body: 'Create the employee records you need so each person has one clear travel history and one current allowance view.',
  },
  {
    number: '02',
    title: 'Import or log trips',
    body: 'Start with your existing data or enter trips manually. The rolling 90/180 picture updates as the record changes.',
  },
  {
    number: '03',
    title: 'Answer before approval',
    body: 'Check remaining days, see the warning status, and make the call before travel gets locked in.',
  },
]

const proofCards = [
  {
    title: 'You stop rebuilding the answer',
    body: 'The next approval should not require a new round of manual checking across tabs and formulas.',
  },
  {
    title: 'You see risk earlier',
    body: 'Warnings show up before someone is already too close to the line for comfort.',
  },
  {
    title: 'You can explain the decision',
    body: 'The trip history that informed the answer is attached to the same employee record you reviewed.',
  },
  {
    title: 'You can move off spreadsheets gradually',
    body: 'Import historical travel first, then bring new trips into a cleaner process over time.',
  },
]

const statCards = [
  {
    value: '90 / 180',
    label: 'Rolling rule',
    body: 'Allowance changes daily as older travel drops out of the window.',
  },
  {
    value: '29',
    label: 'Countries',
    body: 'Time across the Schengen Area still counts against one shared short-stay limit.',
  },
  {
    value: 'EES',
    label: 'Digital records',
    body: 'Border controls are becoming easier to measure against a live travel history.',
  },
  {
    value: '1 view',
    label: 'Approval screen',
    body: 'The current answer, recent trips, and warning status sit together for the reviewer.',
  },
]

const comparisonRows = [
  {
    label: 'Before the answer',
    oldWay: 'Open the latest file and hope the numbers are current',
    newWay: 'Open one employee record with live remaining days already visible',
  },
  {
    label: 'When plans change',
    oldWay: 'Recheck formulas and look for the most recent copy',
    newWay: 'Review the same record after the trip update is saved',
  },
  {
    label: 'When someone asks why',
    oldWay: 'Explain which spreadsheet version you used',
    newWay: 'Point back to the trip history and status on the employee record',
  },
  {
    label: 'When the team grows',
    oldWay: 'More people touching more files',
    newWay: 'One shared workflow for checking, tracking, and approving',
  },
]

const employerQuestions = [
  {
    question: 'What is Schengen compliance software for employers?',
    answer:
      'It is software that helps UK employers track each employee’s 90/180-day Schengen allowance, travel history, and approval risk before an EU trip is booked.',
  },
  {
    question: 'Who needs employee travel compliance tracking?',
    answer:
      'HR, operations, mobility, finance, and travel teams need it when employees make repeated business trips into the Schengen Area and somebody inside the company is responsible for approving those journeys.',
  },
  {
    question: 'Why is the 90/180-day rule hard to manage manually?',
    answer:
      'Because the limit moves every day, entry and exit days both count, and one extra trip can redraw the allowance across the full rolling 180-day window.',
  },
]

function ContentCard({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  )
}

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
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="landing-serif text-3xl text-slate-900">{value}</p>
      <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  )
}

export default function LandingPage() {
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
        <section className="px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14">
          <div className="mx-auto max-w-7xl">
            <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,33rem)_minmax(0,1fr)] lg:items-start">
              <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10">
                <h1 className="landing-serif text-5xl text-slate-900 sm:text-6xl">
                  Schengen compliance software for UK employers approving EU travel.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  ComplyEur gives HR, operations, finance, and mobility teams one current view of each employee&apos;s
                  90/180-day allowance, trip history, and travel risk before someone says yes to the next booking.
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
                  Need to click through the interface first?{' '}
                  <Link href="/landing/preview" className="font-medium text-brand-700 hover:underline">
                    Open the interactive preview
                  </Link>
                  .
                </p>

                <div className="mt-8 grid gap-3 md:grid-cols-2">
                  {roleSignals.map((signal) => (
                    <div key={signal} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                      <p className="text-sm leading-6 text-slate-600">{signal}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div id="product" className="min-w-0 space-y-4">
                <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Current allowance overview</p>
                      <p className="mt-1 text-sm text-slate-500">See trip history and remaining days before the next approval.</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Updated live
                    </div>
                  </div>
                  <BrowserFrame title="app.complyeur.com" showUrlBar>
                    <DemoEmployeeListStatic />
                  </BrowserFrame>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {heroHighlights.map((item) => (
                    <ContentCard key={item.title} title={item.title} body={item.body} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="rounded-xl border border-slate-200 bg-brand-50 p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">What changes when you move off spreadsheets</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  You stop piecing together the answer from separate files and start reviewing one live record before
                  travel gets approved.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:items-start">
            <div>
              <h2 className="landing-serif text-4xl text-slate-900 sm:text-5xl">
                The rule is not the hard part. The operating rhythm is.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Short-stay compliance becomes difficult when travel plans move, several people touch the process, and
                somebody still needs a dependable answer before a trip is booked.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {pressurePoints.map((item) => {
                const Icon = item.icon
                return (
                  <article key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <h2 className="landing-serif text-4xl text-slate-900 sm:text-5xl">
                Clear answers for teams managing the Schengen 90/180-day rule.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Most companies are not searching for a generic travel app. They need a dependable way to check whether
                employee travel into the Schengen Area is still compliant before approval.
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {employerQuestions.map((item) => (
                <article key={item.question} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">{item.question}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
              <div>
                <h2 className="landing-serif text-4xl text-slate-900 sm:text-5xl">
                  From scattered checks to one review flow.
                </h2>
                <p className="mt-6 text-base leading-7 text-slate-600">
                  The goal is not to create more process. It is to make the approval decision easier to trust.
                </p>
              </div>

              <div className="grid gap-4 lg:hidden">
                {comparisonRows.map((row) => (
                  <article key={row.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Spreadsheet process</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{row.oldWay}</p>
                      </div>
                      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">ComplyEur process</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{row.newWay}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden rounded-xl border border-slate-200 bg-slate-900 p-1 shadow-sm lg:block">
                <div className="grid gap-px overflow-hidden rounded-xl bg-slate-700 lg:grid-cols-[14rem_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="bg-slate-900 px-5 py-4 text-sm font-semibold text-white">Moment</div>
                  <div className="bg-slate-900 px-5 py-4 text-sm font-semibold text-white">Spreadsheet process</div>
                  <div className="bg-slate-900 px-5 py-4 text-sm font-semibold text-white">ComplyEur process</div>
                  {comparisonRows.map((row) => (
                    <ComparisonRow key={row.label} label={row.label} oldWay={row.oldWay} newWay={row.newWay} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
              <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <BrowserFrame title="Timeline view">
                  <DemoCalendar />
                </BrowserFrame>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Daily view of the rolling window</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      See overlapping trips across the team without jumping between separate records.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Warnings visible before approval</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      The timeline makes close calls easier to spot before travel is confirmed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {workflowCards.map((card) => (
                  <article key={card.number} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-brand-700">{card.number}</p>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">{card.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="proof" className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <h2 className="landing-serif text-4xl text-slate-900 sm:text-5xl">
                A more professional system for a messy operational job.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                This is not just another place to log trips. It is a clearer operating layer for the people responsible
                for checking, tracking, and approving repeat EU travel.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {proofCards.map((card) => (
                <ContentCard key={card.title} title={card.title} body={card.body} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
            <div className="max-w-3xl">
              <div>
                <h2 className="landing-serif text-4xl text-slate-900 sm:text-5xl">
                  Border compliance is becoming harder to manage informally.
                </h2>
                <p className="mt-6 text-base leading-7 text-slate-600">
                  As border records become more measurable, it becomes harder to rely on rough checks, inconsistent
                  files, and last-minute reassurance.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-5">
              {statCards.map((card) => (
                <StatCard key={card.label} value={card.value} label={card.label} body={card.body} />
              ))}

              <article className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Built for a more accountable workflow</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Give your team a clearer audit trail around the travel decisions they make.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-slate-900 p-8 text-white shadow-sm lg:p-12">
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
                  className="inline-flex items-center justify-center rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-800"
                >
                  View pricing
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-slate-800 pt-6 text-sm text-slate-300">
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
      <div className="bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900">{label}</div>
      <div className="bg-white px-5 py-4 text-sm leading-6 text-slate-600">{oldWay}</div>
      <div className="bg-brand-50 px-5 py-4 text-sm leading-6 text-slate-700">{newWay}</div>
    </>
  )
}
