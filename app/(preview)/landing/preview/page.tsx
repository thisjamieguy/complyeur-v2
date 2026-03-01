'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BrowserFrame } from '@/components/marketing/browser-frame'
import { DemoCalendar, type DemoCalendarEmployee } from '@/components/marketing/demo-calendar'
import { cn } from '@/lib/utils'

const COUNTRY_OPTIONS = [
  { code: 'DE', label: 'Germany (DE)' },
  { code: 'FR', label: 'France (FR)' },
  { code: 'ES', label: 'Spain (ES)' },
  { code: 'IT', label: 'Italy (IT)' },
  { code: 'NL', label: 'Netherlands (NL)' },
]

const DEFAULT_GUIDED_NAME = 'Olivia Carter'
const DEFAULT_GUIDED_COUNTRY = 'DE'

type DemoRiskLevel = 'green' | 'amber' | 'red'
type ScenarioId = 'compliant' | 'high-risk' | 'non-compliant'

interface PreviewTrip {
  employeeName: string
  country: string
  entryDate: string
  exitDate: string
}

interface SeededEmployee {
  name: string
  trips: Array<Pick<PreviewTrip, 'country' | 'entryDate' | 'exitDate'>>
}

interface ScenarioConfig {
  id: ScenarioId
  label: string
  risk: DemoRiskLevel
  description: string
  actionLabel: string
  entryDate: string
  exitDate: string
}

interface FormState {
  employeeName: string
  country: string
  entryDate: string
  exitDate: string
}

const RISK_META = {
  green: {
    label: 'Compliant',
    pillClassName: 'border-green-200 bg-green-50 text-green-700',
    numberClassName: 'text-green-600',
    panelClassName: 'border-green-200 bg-green-50/80',
  },
  amber: {
    label: 'High risk',
    pillClassName: 'border-amber-200 bg-amber-50 text-amber-700',
    numberClassName: 'text-amber-600',
    panelClassName: 'border-amber-200 bg-amber-50/80',
  },
  red: {
    label: 'Non-compliant',
    pillClassName: 'border-red-200 bg-red-50 text-red-700',
    numberClassName: 'text-red-600',
    panelClassName: 'border-red-200 bg-red-50/80',
  },
} satisfies Record<
  DemoRiskLevel,
  {
    label: string
    pillClassName: string
    numberClassName: string
    panelClassName: string
  }
>

const RISK_ORDER = {
  green: 0,
  amber: 1,
  red: 2,
} satisfies Record<DemoRiskLevel, number>

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseInputDate(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function getTripRiskLevel(entryDateValue: string, exitDateValue: string): DemoRiskLevel {
  const entryDate = parseInputDate(entryDateValue)
  const exitDate = parseInputDate(exitDateValue)
  if (!entryDate || !exitDate || exitDate < entryDate) return 'green'

  const durationDays = Math.floor((exitDate.getTime() - entryDate.getTime()) / DAY_MS) + 1

  if (durationDays <= 7) return 'green'
  if (durationDays <= 14) return 'amber'
  return 'red'
}

function createSeededEmployees(referenceDate: Date): SeededEmployee[] {
  return [
    {
      name: 'Ken Adams',
      trips: [
        {
          country: 'DE',
          entryDate: toDateInputValue(addDays(referenceDate, 2)),
          exitDate: toDateInputValue(addDays(referenceDate, 6)),
        },
      ],
    },
    {
      name: 'James Davies',
      trips: [
        {
          country: 'FR',
          entryDate: toDateInputValue(addDays(referenceDate, 7)),
          exitDate: toDateInputValue(addDays(referenceDate, 16)),
        },
      ],
    },
    {
      name: 'Emma Thompson',
      trips: [
        {
          country: 'ES',
          entryDate: toDateInputValue(addDays(referenceDate, 10)),
          exitDate: toDateInputValue(addDays(referenceDate, 14)),
        },
      ],
    },
    {
      name: 'Lisa Martinez',
      trips: [
        {
          country: 'NL',
          entryDate: toDateInputValue(addDays(referenceDate, 18)),
          exitDate: toDateInputValue(addDays(referenceDate, 22)),
        },
      ],
    },
  ]
}

function createScenarioDefinitions(referenceDate: Date): ScenarioConfig[] {
  return [
    {
      id: 'compliant',
      label: 'Add a compliant trip',
      risk: 'green',
      description: 'A five-day trip adds cleanly, keeps the employee compliant, and shows a calm green outcome.',
      actionLabel: 'Add first trip',
      entryDate: toDateInputValue(addDays(referenceDate, 1)),
      exitDate: toDateInputValue(addDays(referenceDate, 5)),
    },
    {
      id: 'high-risk',
      label: 'Add a high-risk trip',
      risk: 'amber',
      description: 'The second trip is long enough to surface a warning and show the amber state on the same traveller.',
      actionLabel: 'Add second trip',
      entryDate: toDateInputValue(addDays(referenceDate, 6)),
      exitDate: toDateInputValue(addDays(referenceDate, 15)),
    },
    {
      id: 'non-compliant',
      label: 'Add a non-compliant trip',
      risk: 'red',
      description: 'The third trip pushes the example into a non-compliant state so the final dashboard view is unmistakable.',
      actionLabel: 'Add third trip',
      entryDate: toDateInputValue(addDays(referenceDate, 16)),
      exitDate: toDateInputValue(addDays(referenceDate, 40)),
    },
  ]
}

function createInitialFormState(referenceDate: Date): FormState {
  const [firstScenario] = createScenarioDefinitions(referenceDate)

  return {
    employeeName: DEFAULT_GUIDED_NAME,
    country: DEFAULT_GUIDED_COUNTRY,
    entryDate: firstScenario.entryDate,
    exitDate: firstScenario.exitDate,
  }
}

function getHighestRiskLevel(trips: Array<Pick<PreviewTrip, 'entryDate' | 'exitDate'>>): DemoRiskLevel {
  return trips.reduce<DemoRiskLevel>((highestRisk, trip) => {
    const currentRisk = getTripRiskLevel(trip.entryDate, trip.exitDate)
    return RISK_ORDER[currentRisk] > RISK_ORDER[highestRisk] ? currentRisk : highestRisk
  }, 'green')
}

export default function LandingPreviewPage() {
  const [referenceDate] = useState(() => startOfDay(new Date()))
  const scenarios = useMemo(() => createScenarioDefinitions(referenceDate), [referenceDate])
  const seededEmployees = useMemo(() => createSeededEmployees(referenceDate), [referenceDate])
  const [formState, setFormState] = useState<FormState>(() => createInitialFormState(referenceDate))
  const [appliedTrips, setAppliedTrips] = useState<Partial<Record<ScenarioId, PreviewTrip>>>({})
  const [error, setError] = useState('')
  const [showIntroCard, setShowIntroCard] = useState(true)

  const guidedTrips = useMemo(
    () => scenarios.map((scenario) => appliedTrips[scenario.id]).filter((trip): trip is PreviewTrip => Boolean(trip)),
    [appliedTrips, scenarios]
  )
  const appliedCount = guidedTrips.length
  const hasCompletedPreview = appliedCount >= scenarios.length
  const cardEyebrow = hasCompletedPreview ? 'Next step' : 'Add trip'
  const currentScenario = hasCompletedPreview
    ? {
        ...scenarios[scenarios.length - 1],
        label: 'Ready to sign up?',
        description: 'You have seen the full journey. If you want to try it with your own team, you can go to the sign-up page here.',
        actionLabel: 'Go to sign up',
      }
    : scenarios[Math.min(appliedCount, scenarios.length - 1)]
  const latestAppliedScenario = appliedCount > 0 ? scenarios[appliedCount - 1] : null

  const calendarEmployees = useMemo<DemoCalendarEmployee[]>(() => {
    const employees: DemoCalendarEmployee[] = seededEmployees.map((employee) => ({
      name: employee.name,
      trips: employee.trips.map((trip) => ({
        country: trip.country,
        entryDate: trip.entryDate,
        exitDate: trip.exitDate,
      })),
    }))

    if (guidedTrips.length > 0) {
      employees.push({
        name: guidedTrips[0].employeeName,
        trips: guidedTrips.map((trip) => ({
          country: trip.country,
          entryDate: trip.entryDate,
          exitDate: trip.exitDate,
        })),
      })
    }

    return employees
  }, [guidedTrips, seededEmployees])

  const employeeStatusRows = useMemo(() => {
    const rows = seededEmployees.map((employee) => {
      const risk = getHighestRiskLevel(employee.trips)
      const latestTrip = employee.trips[employee.trips.length - 1] ?? null

      return {
        name: employee.name,
        risk,
        tripCount: employee.trips.length,
        latestTrip: latestTrip
          ? {
              employeeName: employee.name,
              country: latestTrip.country,
              entryDate: latestTrip.entryDate,
              exitDate: latestTrip.exitDate,
            }
          : null,
      }
    })

    if (guidedTrips.length > 0) {
      rows.push({
        name: guidedTrips[0].employeeName,
        risk: getHighestRiskLevel(guidedTrips),
        tripCount: guidedTrips.length,
        latestTrip: guidedTrips[guidedTrips.length - 1] ?? null,
      })
    }

    return rows.sort((a, b) => {
      const riskDelta = RISK_ORDER[b.risk] - RISK_ORDER[a.risk]
      if (riskDelta !== 0) return riskDelta
      return a.name.localeCompare(b.name)
    })
  }, [guidedTrips, seededEmployees])

  const summary = useMemo(
    () =>
      employeeStatusRows.reduce(
        (totals, row) => {
          if (row.risk === 'green') totals.compliant += 1
          if (row.risk === 'amber') totals.highRisk += 1
          if (row.risk === 'red') totals.nonCompliant += 1
          return totals
        },
        { compliant: 0, highRisk: 0, nonCompliant: 0 }
      ),
    [employeeStatusRows]
  )

  function handleApplyTrip(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const employeeName = formState.employeeName.trim()
    if (!employeeName || !formState.country || !formState.entryDate || !formState.exitDate) {
      setError('Name, country, and both dates are required.')
      return
    }

    const normalizedCountry = formState.country.toUpperCase()
    const isValidCountry = COUNTRY_OPTIONS.some((country) => country.code === normalizedCountry)
    if (!isValidCountry) {
      setError('Choose one of the demo Schengen countries.')
      return
    }

    const entryDate = parseInputDate(formState.entryDate)
    const exitDate = parseInputDate(formState.exitDate)
    if (!entryDate || !exitDate || exitDate < entryDate) {
      setError('Exit date must be on or after the entry date.')
      return
    }

    setAppliedTrips((current) => {
      const nextTrips: Partial<Record<ScenarioId, PreviewTrip>> = {}

      for (const scenario of scenarios) {
        const existingTrip = current[scenario.id]
        if (existingTrip) {
          nextTrips[scenario.id] = {
            ...existingTrip,
            employeeName,
            country: normalizedCountry,
          }
        }
      }

      nextTrips[currentScenario.id] = {
        employeeName,
        country: normalizedCountry,
        entryDate: formState.entryDate,
        exitDate: formState.exitDate,
      }

      return nextTrips
    })

    if (appliedCount < scenarios.length - 1) {
      const nextScenario = scenarios[appliedCount + 1]
      setFormState({
        employeeName,
        country: normalizedCountry,
        entryDate: nextScenario.entryDate,
        exitDate: nextScenario.exitDate,
      })
    } else {
      setFormState((current) => ({
        ...current,
        employeeName,
        country: normalizedCountry,
      }))
    }
  }

  function handleResetPreview() {
    setAppliedTrips({})
    setFormState(createInitialFormState(referenceDate))
    setError('')
  }

  const totalLoadedTrips = seededEmployees.reduce((total, employee) => total + employee.trips.length, 0) + guidedTrips.length
  const explanationCard = latestAppliedScenario
    ? latestAppliedScenario.risk === 'green'
      ? {
          title: 'Trip accepted',
          body: 'This trip is good. It sits within the safe range, so the traveller stays compliant and the dashboard remains green.',
          detail: 'This is the simple approval case you want to show first.',
          className: RISK_META.green.panelClassName,
        }
      : latestAppliedScenario.risk === 'amber'
        ? {
            title: 'High-risk warning',
            body: 'This trip is still compliant, but it leaves less room for extending this trip or planning future trips soon after.',
            detail: 'It is best treated as a caution flag: the booking is fine, but any extra days or additional travel should be checked carefully.',
            className: RISK_META.amber.panelClassName,
          }
        : {
            title: 'Non-compliant warning',
            body: 'This trip pushes the traveller into a non-compliant state. The dashboard and calendar now show the breach clearly.',
            detail:
              'This can often be avoided by changing the dates, shortening the trip, moving it later, or assigning a different person with more allowance left.',
            className: RISK_META.red.panelClassName,
          }
    : {
        title: 'Start with the first trip',
        body: 'Add the first trip and the preview will explain what changed straight away.',
        detail: 'Then add the second trip for the warning case, and the third trip for the non-compliant case.',
        className: 'border-slate-200 bg-white',
      }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_40%,#f8fafc_100%)] text-slate-900">
      {showIntroCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 px-6 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Preview</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">How this works</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This preview shows how ComplyEur moves from a compliant trip, to a caution state, to a non-compliant
              warning. Use the button on the left to add each trip in order and watch the dashboard and calendar update
              live.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIntroCard(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Start preview
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Interactive Preview</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              See how ComplyEur flags travel compliance risk step by step
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
              This walkthrough follows one traveller from compliant to high-risk to non-compliant, so you can see how
              the dashboard and calendar respond at each stage.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/landing"
              className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to home
            </Link>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
          <section className="space-y-5">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{cardEyebrow}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{currentScenario.label}</h2>
                </div>
                <span
                  className={cn(
                    'inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
                    RISK_META[currentScenario.risk].pillClassName
                  )}
                >
                  {RISK_META[currentScenario.risk].label}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">{currentScenario.description}</p>

              <form className="mt-6 space-y-4" onSubmit={handleApplyTrip} noValidate>
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label htmlFor="employeeName" className="block text-sm font-medium text-slate-700">
                      Traveller name
                    </label>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Fixed</span>
                  </div>
                  <input
                    id="employeeName"
                    type="text"
                    value={formState.employeeName}
                    readOnly
                    aria-readonly="true"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-700 outline-none"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label htmlFor="country" className="block text-sm font-medium text-slate-700">
                      Destination country
                    </label>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Fixed for demo
                    </span>
                  </div>
                  <input
                    id="country"
                    type="text"
                    value={COUNTRY_OPTIONS.find((country) => country.code === formState.country)?.label ?? formState.country}
                    readOnly
                    aria-readonly="true"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-700 outline-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label htmlFor="entryDate" className="block text-sm font-medium text-slate-700">
                        Entry date
                      </label>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Fixed
                      </span>
                    </div>
                    <input
                      id="entryDate"
                      type="date"
                      value={formState.entryDate}
                      readOnly
                      aria-readonly="true"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-700 outline-none"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label htmlFor="exitDate" className="block text-sm font-medium text-slate-700">
                        Exit date
                      </label>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Fixed
                      </span>
                    </div>
                    <input
                      id="exitDate"
                      type="date"
                      value={formState.exitDate}
                      readOnly
                      aria-readonly="true"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-700 outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex flex-col gap-3">
                  {hasCompletedPreview ? (
                    <Link
                      href="/signup"
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      {currentScenario.actionLabel}
                    </Link>
                  ) : (
                    <button
                      type="submit"
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      {currentScenario.actionLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetPreview}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Restart preview
                  </button>
                </div>
              </form>

            </div>
          </section>

          <section className="space-y-4">
            <BrowserFrame title="preview.complyeur.app" showUrlBar className="overflow-hidden">
              <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.96))] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Preview dashboard</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">Team travel risk at a glance</h2>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {employeeStatusRows.length} travellers · {totalLoadedTrips} trips loaded
                  </span>
                </div>

                <div className={cn('mt-4 rounded-[1.75rem] border p-5 shadow-sm', explanationCard.className)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What this means</p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">{explanationCard.title}</h3>
                    </div>
                    <div className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600">
                      {appliedCount}/3 trips added
                    </div>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">{explanationCard.body}</p>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{explanationCard.detail}</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Compliant</p>
                    <p className={cn('mt-2 text-3xl font-semibold', RISK_META.green.numberClassName)}>{summary.compliant}</p>
                    <p className="mt-1 text-xs text-slate-500">Travellers still safe to approve.</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">High risk</p>
                    <p className={cn('mt-2 text-3xl font-semibold', RISK_META.amber.numberClassName)}>{summary.highRisk}</p>
                    <p className="mt-1 text-xs text-slate-500">Travellers that now need attention.</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Non-compliant</p>
                    <p className={cn('mt-2 text-3xl font-semibold', RISK_META.red.numberClassName)}>{summary.nonCompliant}</p>
                    <p className="mt-1 text-xs text-slate-500">Travellers already over the line.</p>
                  </div>
                </div>

              </div>

              <DemoCalendar employees={calendarEmployees} title="ComplyEur travel calendar" />
            </BrowserFrame>

            <p className="text-sm text-slate-500">
              Use the three examples to show the safe case first, then the warning state, then the final
              non-compliant escalation without explaining any extra setup.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
