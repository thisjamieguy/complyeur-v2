import { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarCheck2,
  ChevronDown,
  CircleCheckBig,
  Globe2,
  LogIn,
  Search,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { SkipLink } from '@/components/ui/skip-link'
import { createPageMetadata } from '@/lib/metadata'
import { marketingPrimaryCta } from '@/lib/marketing-primary-cta'

export const dynamic = 'force-static'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'ComplyEur - Poppins hero concept',
    description:
      'A noindex preview of a Poppins landing hero concept for ComplyEur Schengen compliance software.',
    path: '/landing-alt',
  }),
  robots: {
    index: false,
    follow: false,
  },
}

const navLinks = ['Product', 'Workflow', 'Pricing', 'FAQ']

const statusRows = [
  {
    name: 'Alex',
    team: 'Sales',
    days: '54',
    remaining: '36 left',
    status: 'Clear',
  },
  {
    name: 'Priya',
    team: 'Engineering',
    days: '77',
    remaining: '13 left',
    status: 'Watch',
  },
  {
    name: 'Dan',
    team: 'Leadership',
    days: '88',
    remaining: '2 left',
    status: 'Urgent',
  },
]

const proofItems = [
  {
    label: 'Rolling rule',
    value: '90 / 180',
  },
  {
    label: 'Schengen coverage',
    value: '29 states',
  },
  {
    label: 'Approval context',
    value: '1 live view',
  },
]

const sidebarIcons = [
  {
    label: 'Security',
    icon: ShieldCheck,
  },
  {
    label: 'Employees',
    icon: UsersRound,
  },
  {
    label: 'Trips',
    icon: CalendarCheck2,
  },
  {
    label: 'Schengen',
    icon: Globe2,
  },
]

function ProductHeroVisual() {
  return (
    <div className="relative min-h-[430px] w-full lg:min-h-[500px]">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'linear-gradient(135deg, transparent 0%, transparent 34%, rgba(255,255,255,0.16) 34%, rgba(255,255,255,0.16) 45%, transparent 45%, transparent 100%)',
        }}
      />

      <div className="relative ml-auto max-w-[43rem] pt-6 lg:pt-10">
        <div className="overflow-hidden rounded-xl border border-white/35 bg-white shadow-2xl shadow-slate-950/25">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-300" />
              <span className="h-3 w-3 rounded-full bg-amber-300" />
              <span className="h-3 w-3 rounded-full bg-emerald-300" />
            </div>
            <div className="mx-auto hidden rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 sm:block">
              app.complyeur.com/approvals
            </div>
          </div>

          <div className="grid bg-slate-50 md:grid-cols-[3.75rem_minmax(0,1fr)]">
            <aside className="hidden bg-[#0d4d82] px-3 py-5 md:block">
              <div className="space-y-4">
                {sidebarIcons.map((item) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.label}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white"
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  )
                })}
              </div>
            </aside>

            <div className="min-w-0">
              <div className="flex items-center justify-between bg-gradient-to-r from-[#1578c9] to-[#69d2ee] px-5 py-4 text-white">
                <div>
                  <p className="text-sm font-semibold">Approval desk</p>
                  <p className="mt-1 text-xs text-white/75">Schengen allowance checks</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                  CE
                </div>
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_15rem] lg:p-5">
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Current allowance overview</p>
                      <p className="mt-1 text-xs text-slate-500">Updated before each approval decision</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Live
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {statusRows.map((row) => (
                      <div
                        key={row.name}
                        className="grid items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950">{row.name}</p>
                          <p className="text-xs text-slate-500">
                            {row.team} - {row.days} days - {row.remaining}
                          </p>
                        </div>
                        <span
                          className={
                            row.status === 'Clear'
                              ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-center text-xs font-semibold text-emerald-700'
                              : row.status === 'Watch'
                                ? 'rounded-full bg-amber-100 px-2.5 py-1 text-center text-xs font-semibold text-amber-700'
                                : 'rounded-full bg-rose-100 px-2.5 py-1 text-center text-xs font-semibold text-rose-700'
                          }
                        >
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-950">Next trip check</p>
                  <p className="mt-1 text-xs text-slate-500">Paris, 12-16 Aug</p>

                  <div className="mt-5">
                    <div className="flex items-end gap-1.5">
                      {[34, 48, 55, 72, 88, 62, 40].map((height, index) => (
                        <span
                          key={`${height}-${index}`}
                          className="w-full rounded-t-md bg-[#158bd2]"
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>180-day window</span>
                      <span>Today</span>
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg bg-[#0d2a4a] p-4 text-white">
                    <p className="text-xs font-medium text-white/70">Decision</p>
                    <p className="mt-2 text-lg font-bold">Approve with warning</p>
                    <p className="mt-2 text-xs leading-5 text-white/75">
                      Traveller remains under 90 days, with limited room for extra travel.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -right-3 top-0 hidden rounded-xl border border-white/40 bg-white/90 px-4 py-3 shadow-xl shadow-slate-950/20 backdrop-blur lg:block">
          <p className="text-xs font-semibold uppercase text-slate-500">Review status</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-950">
            <CircleCheckBig className="h-4 w-4 text-emerald-600" />
            Ready for sign-off
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingAltPage() {
  return (
    <div className={`${poppins.className} min-h-screen bg-white text-slate-950`}>
      <SkipLink />

      <header className="relative z-30 border-b border-slate-200 bg-white">
        <div className="border-b border-slate-100">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 text-sm text-slate-600 sm:px-6">
            <div className="flex items-center gap-2 font-medium">
              <Globe2 className="h-4 w-4 text-[#1578c9]" />
              English
              <ChevronDown className="h-4 w-4" />
            </div>
            <div className="hidden items-center gap-7 md:flex">
              <Link href="/login" className="inline-flex items-center gap-2 transition hover:text-slate-950">
                <LogIn className="h-4 w-4 text-[#1578c9]" />
                Login
              </Link>
              <Link href="/faq" className="transition hover:text-slate-950">
                Help and Support
              </Link>
              <Link href="/blog" className="inline-flex items-center gap-2 transition hover:text-slate-950">
                <Search className="h-4 w-4 text-[#1578c9]" />
                Resources
              </Link>
              <Link
                href={marketingPrimaryCta.href}
                className="inline-flex items-center gap-2 rounded-full bg-[#0069ad] px-5 py-2 font-semibold text-white transition hover:bg-[#005b98]"
              >
                {marketingPrimaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" aria-label="ComplyEur home" className="shrink-0">
            <Image
              src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal_800w.png"
              alt="ComplyEur"
              width={180}
              height={40}
              className="h-9 w-auto"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-9 text-sm font-semibold text-slate-700 lg:flex">
            {navLinks.map((item) => (
              <Link
                key={item}
                href={item === 'Pricing' ? '/pricing' : item === 'FAQ' ? '/faq' : `#${item.toLowerCase()}`}
                className="inline-flex items-center gap-1.5 transition hover:text-slate-950"
              >
                {item}
                {item !== 'Pricing' && item !== 'FAQ' && <ChevronDown className="h-4 w-4" />}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section
          className="relative overflow-hidden"
          style={{
            background:
              'linear-gradient(112deg, #078dd1 0%, #1982cf 26%, #5b62ac 56%, #b82067 82%, #c60f55 100%)',
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08),transparent_38%,rgba(255,255,255,0.06))]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-14 lg:min-h-[650px] lg:grid-cols-[minmax(0,41rem)_minmax(0,1fr)] lg:items-center lg:pb-0 lg:pt-6">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-6xl">
                Schengen compliance software for UK employers approving EU travel.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-medium leading-7 text-white sm:text-xl sm:leading-9">
                ComplyEur gives HR, operations, finance, and mobility teams one current view of each employee&apos;s
                90/180-day allowance, trip history, and travel risk before someone says yes to the next booking.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href={marketingPrimaryCta.href}
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#7ee8f2] px-7 text-base font-bold text-[#06263d] shadow-lg shadow-slate-950/15 transition hover:bg-[#9af0f7]"
                >
                  {marketingPrimaryCta.label}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#06263d] text-white">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
                <Link
                  href="/landing/preview"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#005f9d] px-7 text-base font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-[#00558d]"
                >
                  Sneak a peek
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 hidden max-w-xl gap-4 border-t border-white/25 pt-6 sm:grid sm:grid-cols-3">
                {proofItems.map((item) => (
                  <div key={item.label}>
                    <p className="text-2xl font-bold text-white">{item.value}</p>
                    <p className="mt-1 text-sm font-medium text-white/75">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <ProductHeroVisual />
          </div>
        </section>

        <section id="product" className="bg-white px-4 py-12 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="text-sm font-bold text-[#1578c9]">Built for the approval moment</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
                A cleaner first screen, without changing the product promise.
              </h2>
            </div>
            <div className="grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-3 lg:border-t-0 lg:pt-0">
              <div>
                <p className="font-semibold text-slate-950">Current allowance</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  See remaining Schengen days before a trip is approved.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">Shared record</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Keep trip history and warning context in one place.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">Decision context</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Review risk before someone says yes to the next booking.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
