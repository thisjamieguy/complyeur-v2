'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { BrowserFrame } from '@/components/marketing/browser-frame'
import { DemoCalendar, type DemoCalendarEmployee } from '@/components/marketing/demo-calendar'

const EMPLOYEE_OPTIONS = ['Ken Adams', 'James Davies', 'Emma Thompson', 'Michael Park', 'Lisa Martinez']
const COUNTRY_OPTIONS = [
  { code: 'DE', label: 'Germany (DE)' },
  { code: 'FR', label: 'France (FR)' },
  { code: 'ES', label: 'Spain (ES)' },
  { code: 'IT', label: 'Italy (IT)' },
  { code: 'NL', label: 'Netherlands (NL)' },
]
const REASON_OPTIONS = [
  'Client meeting',
  'Onsite workshop',
  'Internal planning',
  'Conference',
]

type DemoRiskLevel = 'green' | 'amber' | 'red'

interface SandboxTrip {
  id: number
  employeeName: string
  country: string
  entryDate: string
  exitDate: string
  tripReason: string
}

interface FormState {
  employeeName: string
  country: string
  entryDate: string
  exitDate: string
  tripReason: string
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createInitialTrips(): SandboxTrip[] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return [
    {
      id: 1,
      employeeName: 'Ken Adams',
      country: 'DE',
      entryDate: toDateInputValue(addDays(start, -10)),
      exitDate: toDateInputValue(addDays(start, -6)),
      tripReason: 'Onsite workshop',
    },
    {
      id: 2,
      employeeName: 'Emma Thompson',
      country: 'ES',
      entryDate: toDateInputValue(addDays(start, 2)),
      exitDate: toDateInputValue(addDays(start, 7)),
      tripReason: 'Internal planning',
    },
    {
      id: 3,
      employeeName: 'Lisa Martinez',
      country: 'FR',
      entryDate: toDateInputValue(addDays(start, 10)),
      exitDate: toDateInputValue(addDays(start, 19)),
      tripReason: 'Client meeting',
    },
  ]
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

  const diffMs = exitDate.getTime() - entryDate.getTime()
  const durationDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1

  if (durationDays <= 7) return 'green'
  if (durationDays <= 14) return 'amber'
  return 'red'
}

function formatDateLabel(value: string): string {
  const parsed = parseInputDate(value)
  if (!parsed) return value
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function LandingSandboxPage() {
  const nextIdRef = useRef(4)
  const [trips, setTrips] = useState<SandboxTrip[]>(() => createInitialTrips())
  const [error, setError] = useState('')
  const [formState, setFormState] = useState<FormState>(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return {
      employeeName: EMPLOYEE_OPTIONS[0],
      country: 'DE',
      entryDate: toDateInputValue(addDays(start, 7)),
      exitDate: toDateInputValue(addDays(start, 12)),
      tripReason: REASON_OPTIONS[0],
    }
  })

  const calendarEmployees = useMemo<DemoCalendarEmployee[]>(() => {
    const grouped = new Map<
      string,
      {
        name: string
        trips: Array<{ country: string; entryDate: Date; exitDate: Date }>
      }
    >()

    for (const name of EMPLOYEE_OPTIONS) {
      grouped.set(name, { name, trips: [] })
    }

    for (const trip of trips) {
      const entryDate = parseInputDate(trip.entryDate)
      const exitDate = parseInputDate(trip.exitDate)
      if (!entryDate || !exitDate || exitDate < entryDate) continue

      grouped.get(trip.employeeName)?.trips.push({
        country: trip.country,
        entryDate,
        exitDate,
      })
    }

    return Array.from(grouped.values())
      .map((employee) => ({
        ...employee,
        trips: employee.trips.sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime()),
      }))
      .filter((employee) => employee.trips.length > 0)
  }, [trips])

  const dashboardPreview = useMemo(() => {
    const summary = {
      compliant: 0,
      atRisk: 0,
      nonCompliant: 0,
      latestTrip: trips[trips.length - 1] ?? null,
      latestRisk: 'green' as DemoRiskLevel,
    }

    for (const trip of trips) {
      const risk = getTripRiskLevel(trip.entryDate, trip.exitDate)
      if (risk === 'green') summary.compliant += 1
      if (risk === 'amber') summary.atRisk += 1
      if (risk === 'red') summary.nonCompliant += 1
    }

    if (summary.latestTrip) {
      summary.latestRisk = getTripRiskLevel(summary.latestTrip.entryDate, summary.latestTrip.exitDate)
    }

    return summary
  }, [trips])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!formState.employeeName || !formState.country || !formState.entryDate || !formState.exitDate) {
      setError('All fields are required.')
      return
    }

    const normalizedCountry = formState.country.toUpperCase()
    const isValidCountry = COUNTRY_OPTIONS.some((country) => country.code === normalizedCountry)
    if (!isValidCountry) {
      setError('Please choose a country from the list.')
      return
    }

    const entryDate = parseInputDate(formState.entryDate)
    const exitDate = parseInputDate(formState.exitDate)
    if (!entryDate || !exitDate) {
      setError('Please enter valid entry and exit dates.')
      return
    }

    if (exitDate < entryDate) {
      setError('Exit date must be on or after entry date.')
      return
    }

    setTrips((currentTrips) => [
      ...currentTrips,
      {
        id: nextIdRef.current++,
        employeeName: formState.employeeName,
        country: normalizedCountry,
        entryDate: formState.entryDate,
        exitDate: formState.exitDate,
        tripReason: formState.tripReason.trim(),
      },
    ])

    setFormState((current) => ({
      ...current,
      tripReason: REASON_OPTIONS[0],
    }))
  }

  function removeTrip(id: number) {
    setTrips((currentTrips) => currentTrips.filter((trip) => trip.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Preview Sandbox</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Simple Trip Input to Calendar
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
              Add a trip with employee, country, and dates. The timeline updates immediately so you can test flow and
              visuals without touching production data.
            </p>
          </div>
          <Link
            href="/landing"
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
          >
            Back to landing
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          <section className="h-fit space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Add trip</h2>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="employeeName" className="mb-1 block text-sm font-medium text-slate-700">
                    Employee
                  </label>
                  <select
                    id="employeeName"
                    value={formState.employeeName}
                    onChange={(event) => setFormState((prev) => ({ ...prev, employeeName: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
                  >
                    {EMPLOYEE_OPTIONS.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="country" className="mb-1 block text-sm font-medium text-slate-700">
                    Country
                  </label>
                  <select
                    id="country"
                    value={formState.country}
                    onChange={(event) => setFormState((prev) => ({ ...prev, country: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
                  >
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tripReason" className="mb-1 block text-sm font-medium text-slate-700">
                    Trip reason
                  </label>
                  <select
                    id="tripReason"
                    value={formState.tripReason}
                    onChange={(event) => setFormState((prev) => ({ ...prev, tripReason: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
                  >
                    {REASON_OPTIONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="entryDate" className="mb-1 block text-sm font-medium text-slate-700">
                    Entry date
                  </label>
                  <input
                    id="entryDate"
                    type="date"
                    value={formState.entryDate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, entryDate: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
                  />
                </div>

                <div>
                  <label htmlFor="exitDate" className="mb-1 block text-sm font-medium text-slate-700">
                    Exit date
                  </label>
                  <input
                    id="exitDate"
                    type="date"
                    value={formState.exitDate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, exitDate: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                Add trip to timeline
              </button>
            </form>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Trips in sandbox</h3>
                <span className="text-xs text-slate-500">{trips.length} total</span>
              </div>

              {trips.length === 0 ? (
                <p className="text-sm text-slate-500">No trips yet. Add one to preview the timeline.</p>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {trips.map((trip) => (
                    <li
                      key={trip.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="text-sm text-slate-700">
                        <p className="font-medium text-slate-800">
                          {trip.employeeName} · {trip.country}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateLabel(trip.entryDate)} to {formatDateLabel(trip.exitDate)}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">Reason: {trip.tripReason}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTrip(trip.id)}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-100"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-4">
            <BrowserFrame title="sandbox.complyeur.local" showUrlBar>
              <DemoCalendar
                employees={calendarEmployees}
                title="Timeline Preview"
              />
            </BrowserFrame>
            <div className="mt-4 min-h-[210px] rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Dashboard preview</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Instant warning feedback</h3>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Compliant</p>
                  <p className="text-2xl font-semibold text-green-600">{dashboardPreview.compliant}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">At Risk</p>
                  <p className="text-2xl font-semibold text-amber-600">{dashboardPreview.atRisk}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Non-Compliant</p>
                  <p className="text-2xl font-semibold text-red-600">{dashboardPreview.nonCompliant}</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-700">
                  {dashboardPreview.latestRisk === 'red'
                    ? 'Warning triggered instantly: newest trip is non-compliant.'
                    : 'Waiting for trigger trip...'}
                </p>
                {dashboardPreview.latestTrip && (
                  <p className="mt-1 text-xs text-red-700/90">
                    Latest trip: {dashboardPreview.latestTrip.employeeName} · {dashboardPreview.latestTrip.country} ·{' '}
                    {formatDateLabel(dashboardPreview.latestTrip.entryDate)} to{' '}
                    {formatDateLabel(dashboardPreview.latestTrip.exitDate)}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Add a trip to see the timeline and compliance status update instantly.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
