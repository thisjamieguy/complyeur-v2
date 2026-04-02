import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { BrowserFrame } from '@/components/marketing/browser-frame'
import { DemoCalendar } from '@/components/marketing/demo-calendar'
import { DemoEmployeeList } from '@/components/marketing/demo-employee-list'
import { FeatureTicker } from '@/components/marketing/feature-ticker'
import { FeatureCards } from '@/components/marketing/feature-cards'
import { SkipLink } from '@/components/ui/skip-link'
import { createPageMetadata, X_HANDLE } from '@/lib/metadata'
import { LandingMobileMenu } from './landing-mobile-menu'
import { WaitlistForm } from './waitlist-form'

export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'Schengen Compliance Tracker for UK Travel Teams',
    description:
      'Track the 90/180-day Schengen rule for your UK team. Automated compliance monitoring, real-time alerts, and trip planning for post-Brexit business travel.',
    path: '/landing',
  }),
  robots: {
    index: true,
    follow: true,
  },
}

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

function EnforcementStat({
  value,
  label,
  body,
  accent = false,
  className = '',
}: {
  value: string
  label: string
  body: string
  accent?: boolean
  className?: string
}) {
  return (
    <article
      className={`rounded-[1.75rem] border p-6 backdrop-blur-sm ${accent ? 'border-amber-300/40 bg-amber-50' : 'border-slate-200 bg-white/90'} ${className}`}
    >
      <p className={`landing-serif text-4xl font-semibold sm:text-5xl ${accent ? 'text-amber-700' : 'text-slate-900'}`}>
        {value}
      </p>
      <p className={`mt-3 text-sm font-semibold uppercase tracking-[0.18em] ${accent ? 'text-amber-700' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className={`mt-3 max-w-sm text-sm leading-relaxed ${accent ? 'text-amber-800' : 'text-slate-600'}`}>
        {body}
      </p>
    </article>
  )
}

function EvidenceStat({
  value,
  label,
  body,
  highlight = false,
}: {
  value: string
  label: string
  body: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-[1.5rem] border px-6 py-5 ${highlight ? 'border-amber-300/35 bg-amber-50' : 'border-slate-200 bg-white/85'}`}>
      <p className={`landing-serif text-4xl font-semibold sm:text-5xl ${highlight ? 'text-amber-700' : 'text-slate-900'}`}>
        {value}
      </p>
      <p className={`mt-3 text-xs font-semibold uppercase tracking-[0.22em] ${highlight ? 'text-amber-700' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className={`mt-3 max-w-sm text-sm leading-relaxed ${highlight ? 'text-amber-800' : 'text-slate-600'}`}>
        {body}
      </p>
    </div>
  )
}

export default function LandingPage() {
  const xProfileUrl = `https://x.com/${X_HANDLE.replace(/^@/, '')}`

  return (
    <div className="landing-shell landing-font relative min-h-screen overflow-x-hidden bg-[color:var(--landing-surface)] text-slate-900">
      <SkipLink />

      <div className="pointer-events-none absolute inset-0">
        <div className="landing-aurora-top absolute -top-32 left-[-7rem] h-[26rem] w-[26rem] rounded-full" />
        <div className="landing-aurora-bottom absolute right-[-8rem] top-[22rem] h-[24rem] w-[24rem] rounded-full" />
        <div className="landing-grid absolute inset-0" />
      </div>

      <header className="relative z-30 px-4 pt-5 sm:pt-6">
        <nav className="sticky top-5">
          <div className="mx-auto flex max-w-[88rem] items-center justify-between rounded-full border border-slate-200/90 bg-white/90 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur-xl sm:px-6">
            <Link href="/" className="shrink-0">
              <Image
                src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal_800w.png"
                alt="ComplyEur"
                width={172}
                height={46}
                className="h-8 w-auto sm:h-9"
                priority
                fetchPriority="high"
                sizes="(min-width: 640px) 172px, 150px"
              />
            </Link>

            <div className="hidden items-center gap-8 lg:flex">
              <Link href="#features" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                How it works
              </Link>
              <div className="group relative">
                <button
                  type="button"
                  className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                  aria-haspopup="menu"
                  aria-expanded="false"
                >
                  Resources
                </button>
                <div className="invisible absolute left-1/2 top-full z-40 w-44 -translate-x-1/2 pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/10">
                    <Link
                      href="/blog"
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      Blog
                    </Link>
                  </div>
                </div>
              </div>
              <Link href="/landing/preview" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Preview
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
                href="#early-access"
                className="hidden rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 sm:inline-flex"
              >
                Request Early Access
              </Link>
              <LandingMobileMenu />
            </div>
          </div>
        </nav>
      </header>

      <main id="main-content" className="relative z-10">
        <section className="border-b border-slate-200/70 pb-12 pt-8 lg:pb-20 lg:pt-10">
          <div className="mx-auto max-w-[88rem] px-6">
            <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
                  Schengen compliance for UK travel teams
                </p>
                <h1 className="landing-serif mt-4 text-balance text-[2.55rem] font-semibold leading-[1.02] text-slate-900 sm:text-[3.19rem] lg:text-[3.83rem]">
                  Approve EU travel with complete certainty.
                </h1>

                <p className="mt-4 text-xl font-semibold text-slate-700 sm:text-2xl">
                  The rules haven&rsquo;t changed. Enforcement has.
                </p>

                <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                  Live, rolling 90/180-day compliance per traveller, automatically recalculated with every trip. Every travel approval reflects current data as border enforcement becomes automated.
                </p>

                <p className="mx-auto mt-6 mb-7 max-w-md text-center text-sm font-medium uppercase tracking-[0.18em] text-slate-500 sm:text-base">
                  Prevent overstays <span aria-hidden="true" className="mx-2 text-slate-400">·</span> Reduce fines risk <span aria-hidden="true" className="mx-2 text-slate-400">·</span> Avoid border refusals
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="#early-access"
                    className="rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
                  >
                    Request Early Access
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    See How It Works <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>

              <div id="product-demo" className="space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
                  Live 90/180-day tracking, per employee
                </p>
                <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-2xl shadow-slate-900/15 backdrop-blur">
                  <BrowserFrame title="app.complyeur.com" showUrlBar>
                    <DemoEmployeeList />
                  </BrowserFrame>
                </div>
              </div>

            </div>

            <FeatureTicker />
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-[88rem] px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TrustStat value="90/180" label="Rolling windows recalculate daily as travel records change." />
              <TrustStat value="Live" label="Each trip update refreshes remaining days instantly across the team." />
              <TrustStat value="CSV + XLSX" label="Import historical travel records in minutes for full context." />
              <TrustStat value="GDPR" label="Privacy-first handling designed for people and payroll data." />
            </div>
          </div>
        </section>

        <section
          className="cv-auto bg-slate-50/80 py-20 sm:py-24"
          style={{ '--cis-h': '800px' } as React.CSSProperties}
        >
          <div className="mx-auto max-w-[88rem] px-6">
            <div className="landing-impact-band relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,248,252,0.96))] px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10 lg:px-14 lg:py-14">
              <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(100,116,139,0.14)_1.1px,transparent_1.1px)] [background-size:38px_38px]" />
              <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(29,78,216,0.06),transparent_44%,rgba(250,204,21,0.08)_100%)]" />
              <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.1),transparent_72%)] blur-2xl" />
              <div className="absolute right-[-8rem] top-[-4rem] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.1),transparent_70%)] blur-3xl" />

              <div className="relative">
                <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                  <div>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
                      Manual tolerance is lower
                    </p>
                    <h2 className="landing-serif max-w-4xl text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-[3.6rem]">
                      A Schengen breach rarely starts at the border. It starts with stale data before a trip is approved.
                    </h2>
                    <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
                      The rule is simple. The operating reality is not. One itinerary change can redraw remaining allowance,
                      shift approval decisions, and expose the team too late if records live in spreadsheets.
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-7 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      What trips teams up
                    </p>
                    <div className="mt-5 space-y-5">
                      {[
                        'One added trip redraws the remaining allowance for the full rolling window.',
                        'Entry and exit days both count in full, so short business hops stack quickly.',
                        'Approval decisions need a live record, not a spreadsheet copied around by email.',
                      ].map((item, index) => (
                        <div key={item} className="flex gap-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-300/40 bg-amber-100 text-xs font-semibold text-amber-700">
                            0{index + 1}
                          </div>
                          <p className="pt-1 text-base leading-relaxed text-slate-600">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-10 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <EnforcementStat
                      value="90 / 180"
                      label="Rolling-day limit"
                      body="Most UK business travellers are limited to 90 days across any rolling 180-day period, not per quarter or per country."
                    />
                    <EnforcementStat
                      value="29"
                      label="Countries, one allowance"
                      body="Time in the Schengen Area accumulates across participating countries under one shared allowance."
                      accent
                    />
                  </div>
                  <EnforcementStat
                    value="Daily"
                    label="Allowance shifts"
                    body="Each day old trips drop out of the window, and each new booking redraws the safe margin for the next approval."
                    className="h-full"
                  />
                </div>

                <div className="mt-10 rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 backdrop-blur-sm sm:p-8">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">Enforcement is real</p>
                      <p className="mt-4 text-lg leading-relaxed text-slate-600">
                        EES has made short-stay compliance measurable at the border. Overstays and refused entries are no
                        longer hidden inside passport stamps and manual reconciliations.
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">Source: European Commission, European Parliament testimony, February 2026</p>
                  </div>
                  <div className="mt-8 grid gap-4 lg:grid-cols-3">
                    <EvidenceStat
                      value="16,000"
                      label="Travellers refused entry"
                      body="Recorded in the first four months of EES, showing that automated border controls are already changing outcomes."
                    />
                    <EvidenceStat
                      value="4,000+"
                      label="Caught overstaying"
                      body="Detected against the 90/180-day Schengen limit once entry and exit records moved into a live digital system."
                      highlight
                    />
                    <EvidenceStat
                      value="30M"
                      label="Border crossings tracked"
                      body="Biometric border records captured since October 2025, creating a persistent audit trail for each trip."
                    />
                  </div>
                  <div className="mt-8 border-t border-slate-200 pt-6">
                    <p className="max-w-4xl text-base leading-relaxed text-slate-600 sm:text-lg">
                      Since October 2025, the EU&rsquo;s Entry/Exit System has digitally recorded every entry and exit at
                      Schengen borders. Overstayers are flagged automatically, with far less room for manual
                      interpretation. If your employees travel to Europe for work, their compliance is no longer
                      invisible. It&rsquo;s tracked.
                    </p>
                  </div>
                </div>

                <div className="mt-10 border-t border-slate-200 pt-8">
                  <p className="max-w-5xl text-2xl leading-relaxed text-slate-900 sm:text-[2.15rem]">
                    What catches teams out is not the existence of the rule. It is treating a moving 180-day window like a static spreadsheet.
                  </p>
                  <p className="mt-5 max-w-4xl text-lg leading-relaxed text-slate-600">
                    ComplyEur gives HR, operations, and mobility teams one live record of remaining allowance, trip history, and early warning signals before a booking turns into a border problem.
                  </p>
                  <p className="mt-5 text-sm leading-relaxed text-slate-500">
                    Regulatory references:{' '}
                    <a
                      href="https://travel-europe.europa.eu/ees_en"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-700 underline-offset-4 hover:underline"
                    >
                      EU Entry/Exit System (EES)
                    </a>{' '}
                    and European Commission short-stay Schengen guidance
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div
          id="features"
          className="cv-auto"
          style={{ '--cis-h': '700px' } as React.CSSProperties}
        >
          <FeatureCards />
        </div>

        <section
          id="how-it-works"
          className="cv-auto bg-slate-50 py-24"
          style={{ '--cis-h': '750px' } as React.CSSProperties}
        >
          <div className="mx-auto max-w-[88rem] px-6">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">How it works</p>
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

        <section
          className="cv-auto border-t border-slate-200/70 bg-white py-16"
          style={{ '--cis-h': '350px' } as React.CSSProperties}
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-7 max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">Explore more</p>
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

        <section
          id="early-access"
          className="cv-auto relative overflow-hidden bg-slate-900 py-24"
          style={{ '--cis-h': '500px' } as React.CSSProperties}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(92,127,163,0.35),transparent_45%)]" />
          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-brand-300">Request early access</p>
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
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900">ComplyEur</div>
            <div className="mt-1 text-sm text-slate-500">© {new Date().getFullYear()} ComplyEur. All rights reserved.</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <Link href="/pricing" className="text-slate-500 transition hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/faq" className="text-slate-500 transition hover:text-slate-900">
              FAQ
            </Link>
            <Link href="/about" className="text-slate-500 transition hover:text-slate-900">
              About
            </Link>
            <Link href="/contact" className="text-slate-500 transition hover:text-slate-900">
              Contact
            </Link>
            <Link href="/landing/preview" className="text-slate-500 transition hover:text-slate-900">
              Preview
            </Link>
            <a
              href={xProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 transition hover:text-slate-900"
            >
              X
            </a>
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
