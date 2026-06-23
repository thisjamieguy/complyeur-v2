/**
 * @fileoverview Travel audit computation engine.
 *
 * Pure, deterministic functions that turn trip records into audit summaries
 * for third-party / compliance requests:
 *
 *  - Individual employee audit: how many countries, which countries, how long
 *    in each, and the working-vs-rest-day split.
 *  - Company-wide audit: the same aggregated across the whole company, plus a
 *    per-employee breakdown.
 *
 * All calculations are clipped to an inclusive date window so reports cover a
 * set time frame, and an optional country filter supports customised reports.
 *
 * Day-counting rules:
 *  - Days are inclusive of both entry and exit (matches `travel_days`).
 *  - Rest days come from `trips.non_working_days`. Working days are the
 *    remainder. Private trips count every day as rest (product decision).
 *  - When a trip only partially overlaps the window, its rest days are
 *    allocated proportionally to the overlapping portion.
 *  - Ghosted trips are excluded.
 */

import { getCountryName, isSchengenCountry } from '@/lib/constants/schengen-countries'
import { parseDateOnlyAsUTC, differenceInUtcDays } from '@/lib/compliance/date-utils'

const PRIVATE_COUNTRY_CODE = 'XX'
const PRIVATE_COUNTRY_NAME = 'Private trip'

/**
 * A single trip in the shape the audit engine needs.
 */
export interface AuditTripInput {
  /** 2-letter ISO country code */
  country: string
  /** Entry date (YYYY-MM-DD) */
  entryDate: string
  /** Exit date (YYYY-MM-DD) */
  exitDate: string
  /** Whether the trip is personal/private (all days treated as rest) */
  isPrivate: boolean
  /** Whether the trip is soft-excluded */
  ghosted: boolean
  /** Rest / non-working days within the whole trip range */
  nonWorkingDays: number
}

/**
 * An employee with trips, ready for audit.
 */
export interface AuditEmployeeInput {
  id: string
  name: string
  trips: AuditTripInput[]
}

/**
 * Inclusive date window for an audit report.
 */
export interface AuditWindow {
  /** Window start (YYYY-MM-DD), inclusive */
  start: string
  /** Window end (YYYY-MM-DD), inclusive */
  end: string
}

/**
 * Customisation options for an audit report.
 */
export interface AuditOptions {
  /** Restrict to these ISO country codes (empty/undefined = all countries) */
  countries?: string[]
}

/**
 * Presence in a single country over the window.
 */
export interface CountryPresence {
  country: string
  countryName: string
  isSchengen: boolean
  totalDays: number
  workingDays: number
  restDays: number
  tripCount: number
}

/**
 * Roll-up totals for an audit.
 */
export interface TravelAuditTotals {
  countryCount: number
  totalDays: number
  workingDays: number
  restDays: number
  /** Subset of totalDays spent in Schengen countries (counts toward 90/180) */
  schengenDays: number
  tripCount: number
}

/**
 * Audit result for a single employee.
 */
export interface EmployeeTravelAudit {
  employeeId: string
  employeeName: string
  /** Per-country breakdown, sorted by days descending */
  countries: CountryPresence[]
  totals: TravelAuditTotals
}

/**
 * Audit result for a whole company.
 */
export interface CompanyTravelAudit {
  /** Company-wide per-country breakdown */
  countries: CountryPresence[]
  totals: TravelAuditTotals
  /** Per-employee breakdown ("include all for solo individual") */
  employees: EmployeeTravelAudit[]
}

/**
 * A trip clipped to the audit window with its working/rest split resolved.
 */
interface ClippedTrip {
  country: string
  countryName: string
  isSchengen: boolean
  totalDays: number
  workingDays: number
  restDays: number
}

/**
 * Clip a trip to the inclusive window and resolve its working/rest split.
 * Returns null if the trip does not overlap the window.
 */
function clipTrip(
  trip: AuditTripInput,
  windowStart: Date,
  windowEnd: Date
): ClippedTrip | null {
  const entry = parseDateOnlyAsUTC(trip.entryDate)
  const exit = parseDateOnlyAsUTC(trip.exitDate)

  // Guard against inverted ranges
  if (exit < entry) return null

  const overlapStart = entry > windowStart ? entry : windowStart
  const overlapEnd = exit < windowEnd ? exit : windowEnd
  if (overlapEnd < overlapStart) return null

  const overlapDays = differenceInUtcDays(overlapEnd, overlapStart) + 1
  const tripTotalDays = differenceInUtcDays(exit, entry) + 1

  let restDays: number
  if (trip.isPrivate) {
    // Private trips: every day is a rest day.
    restDays = overlapDays
  } else {
    const tripRest = Math.max(0, Math.min(trip.nonWorkingDays, tripTotalDays))
    if (overlapDays >= tripTotalDays) {
      restDays = tripRest
    } else {
      // Partial overlap: allocate rest days proportionally.
      restDays = Math.round(tripRest * (overlapDays / tripTotalDays))
    }
    restDays = Math.min(restDays, overlapDays)
  }

  return {
    country: trip.isPrivate ? PRIVATE_COUNTRY_CODE : trip.country,
    countryName: trip.isPrivate ? PRIVATE_COUNTRY_NAME : getCountryName(trip.country),
    isSchengen: isSchengenCountry(trip.country),
    totalDays: overlapDays,
    workingDays: overlapDays - restDays,
    restDays,
  }
}

/**
 * Aggregate clipped trips into per-country presence, sorted by days desc.
 */
function buildCountryPresence(clipped: ClippedTrip[]): CountryPresence[] {
  const map = new Map<string, CountryPresence>()

  for (const c of clipped) {
    const code = c.country.toUpperCase()
    const key = `${code}:${c.isSchengen ? 'schengen' : 'non-schengen'}`
    const existing = map.get(key)
    if (existing) {
      existing.totalDays += c.totalDays
      existing.workingDays += c.workingDays
      existing.restDays += c.restDays
      existing.tripCount += 1
    } else {
      map.set(key, {
        country: code,
        countryName: c.countryName,
        isSchengen: c.isSchengen,
        totalDays: c.totalDays,
        workingDays: c.workingDays,
        restDays: c.restDays,
        tripCount: 1,
      })
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.totalDays - a.totalDays || a.countryName.localeCompare(b.countryName)
  )
}

/**
 * Sum per-country presence into roll-up totals.
 */
function buildTotals(countries: CountryPresence[]): TravelAuditTotals {
  return countries.reduce<TravelAuditTotals>(
    (acc, c) => {
      acc.totalDays += c.totalDays
      acc.workingDays += c.workingDays
      acc.restDays += c.restDays
      acc.schengenDays += c.isSchengen ? c.totalDays : 0
      acc.tripCount += c.tripCount
      return acc
    },
    {
      countryCount: countries.length,
      totalDays: 0,
      workingDays: 0,
      restDays: 0,
      schengenDays: 0,
      tripCount: 0,
    }
  )
}

/**
 * Merge several per-country breakdowns (one per employee) into a single
 * company-wide breakdown.
 */
function mergeCountryPresences(lists: CountryPresence[][]): CountryPresence[] {
  const map = new Map<string, CountryPresence>()

  for (const list of lists) {
    for (const c of list) {
      const key = `${c.country}:${c.isSchengen ? 'schengen' : 'non-schengen'}`
      const existing = map.get(key)
      if (existing) {
        existing.totalDays += c.totalDays
        existing.workingDays += c.workingDays
        existing.restDays += c.restDays
        existing.tripCount += c.tripCount
      } else {
        map.set(key, { ...c })
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.totalDays - a.totalDays || a.countryName.localeCompare(b.countryName)
  )
}

/**
 * Build a travel audit for a single employee over the window.
 */
export function buildEmployeeTravelAudit(
  employee: AuditEmployeeInput,
  window: AuditWindow,
  options: AuditOptions = {}
): EmployeeTravelAudit {
  const windowStart = parseDateOnlyAsUTC(window.start)
  const windowEnd = parseDateOnlyAsUTC(window.end)

  const countryFilter =
    options.countries && options.countries.length > 0
      ? new Set(options.countries.map((c) => c.toUpperCase()))
      : null

  const clipped: ClippedTrip[] = []
  for (const trip of employee.trips) {
    if (trip.ghosted) continue
    if (trip.isPrivate && countryFilter) continue
    if (countryFilter && !countryFilter.has(trip.country.toUpperCase())) continue
    const c = clipTrip(trip, windowStart, windowEnd)
    if (c) clipped.push(c)
  }

  const countries = buildCountryPresence(clipped)
  return {
    employeeId: employee.id,
    employeeName: employee.name,
    countries,
    totals: buildTotals(countries),
  }
}

/**
 * Build a company-wide travel audit with a per-employee breakdown.
 *
 * Employees are sorted by total days descending so the most-travelled appear
 * first. Employees with no travel in the window are retained (with zero
 * totals) so an auditor can see they were considered.
 */
export function buildCompanyTravelAudit(
  employees: AuditEmployeeInput[],
  window: AuditWindow,
  options: AuditOptions = {}
): CompanyTravelAudit {
  const perEmployee = employees
    .map((e) => buildEmployeeTravelAudit(e, window, options))
    .sort(
      (a, b) =>
        b.totals.totalDays - a.totals.totalDays ||
        a.employeeName.localeCompare(b.employeeName)
    )

  const countries = mergeCountryPresences(perEmployee.map((e) => e.countries))

  return {
    countries,
    totals: buildTotals(countries),
    employees: perEmployee,
  }
}
