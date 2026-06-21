import { describe, it, expect } from 'vitest'
import {
  buildEmployeeTravelAudit,
  buildCompanyTravelAudit,
  type AuditTripInput,
  type AuditEmployeeInput,
} from '@/lib/exports/travel-audit'

const WINDOW = { start: '2025-01-01', end: '2025-12-31' }

function trip(overrides: Partial<AuditTripInput> = {}): AuditTripInput {
  return {
    country: 'FR',
    entryDate: '2025-03-01',
    exitDate: '2025-03-10', // 10 inclusive days
    isPrivate: false,
    ghosted: false,
    nonWorkingDays: 0,
    ...overrides,
  }
}

function employee(
  trips: AuditTripInput[],
  overrides: Partial<AuditEmployeeInput> = {}
): AuditEmployeeInput {
  return { id: 'e1', name: 'Alice', trips, ...overrides }
}

describe('buildEmployeeTravelAudit', () => {
  it('counts inclusive days for a single trip fully inside the window', () => {
    const result = buildEmployeeTravelAudit(employee([trip()]), WINDOW)
    expect(result.totals.totalDays).toBe(10)
    expect(result.totals.countryCount).toBe(1)
    expect(result.totals.tripCount).toBe(1)
    expect(result.countries[0].country).toBe('FR')
    expect(result.countries[0].countryName).toBe('France')
  })

  it('splits working vs rest days from non_working_days', () => {
    const result = buildEmployeeTravelAudit(
      employee([trip({ nonWorkingDays: 4 })]),
      WINDOW
    )
    expect(result.totals.restDays).toBe(4)
    expect(result.totals.workingDays).toBe(6)
  })

  it('treats private trips as all rest days regardless of stored value', () => {
    const result = buildEmployeeTravelAudit(
      employee([trip({ isPrivate: true, nonWorkingDays: 0 })]),
      WINDOW
    )
    expect(result.totals.restDays).toBe(10)
    expect(result.totals.workingDays).toBe(0)
  })

  it('clamps non_working_days to the trip length', () => {
    const result = buildEmployeeTravelAudit(
      employee([trip({ nonWorkingDays: 999 })]),
      WINDOW
    )
    expect(result.totals.restDays).toBe(10)
    expect(result.totals.workingDays).toBe(0)
  })

  it('clips a trip that straddles the window start and allocates rest proportionally', () => {
    // Trip 2024-12-26..2025-01-04 = 10 days total, 6 rest.
    // Overlap with window (from 2025-01-01) = Jan 1-4 = 4 days.
    // Proportional rest = round(6 * 4/10) = round(2.4) = 2.
    const result = buildEmployeeTravelAudit(
      employee([
        trip({
          entryDate: '2024-12-26',
          exitDate: '2025-01-04',
          nonWorkingDays: 6,
        }),
      ]),
      WINDOW
    )
    expect(result.totals.totalDays).toBe(4)
    expect(result.totals.restDays).toBe(2)
    expect(result.totals.workingDays).toBe(2)
  })

  it('excludes trips entirely outside the window', () => {
    const result = buildEmployeeTravelAudit(
      employee([trip({ entryDate: '2024-01-01', exitDate: '2024-01-10' })]),
      WINDOW
    )
    expect(result.countries).toHaveLength(0)
    expect(result.totals.totalDays).toBe(0)
  })

  it('excludes ghosted trips', () => {
    const result = buildEmployeeTravelAudit(
      employee([trip({ ghosted: true })]),
      WINDOW
    )
    expect(result.totals.totalDays).toBe(0)
  })

  it('aggregates multiple trips to the same country', () => {
    const result = buildEmployeeTravelAudit(
      employee([
        trip({ entryDate: '2025-03-01', exitDate: '2025-03-05' }), // 5
        trip({ entryDate: '2025-06-01', exitDate: '2025-06-03' }), // 3
      ]),
      WINDOW
    )
    expect(result.countries).toHaveLength(1)
    expect(result.countries[0].totalDays).toBe(8)
    expect(result.countries[0].tripCount).toBe(2)
  })

  it('reports multiple countries sorted by days descending', () => {
    const result = buildEmployeeTravelAudit(
      employee([
        trip({ country: 'DE', entryDate: '2025-03-01', exitDate: '2025-03-03' }), // 3
        trip({ country: 'FR', entryDate: '2025-04-01', exitDate: '2025-04-10' }), // 10
      ]),
      WINDOW
    )
    expect(result.totals.countryCount).toBe(2)
    expect(result.countries.map((c) => c.country)).toEqual(['FR', 'DE'])
  })

  it('separates Schengen days from total days', () => {
    const result = buildEmployeeTravelAudit(
      employee([
        trip({ country: 'FR', entryDate: '2025-03-01', exitDate: '2025-03-05' }), // 5 schengen
        trip({ country: 'US', entryDate: '2025-04-01', exitDate: '2025-04-04' }), // 4 non-schengen
      ]),
      WINDOW
    )
    expect(result.totals.totalDays).toBe(9)
    expect(result.totals.schengenDays).toBe(5)
  })

  it('does not count Ireland as Schengen', () => {
    const result = buildEmployeeTravelAudit(
      employee([trip({ country: 'IE' })]),
      WINDOW
    )
    expect(result.countries[0].isSchengen).toBe(false)
    expect(result.totals.schengenDays).toBe(0)
  })

  it('applies the country filter', () => {
    const result = buildEmployeeTravelAudit(
      employee([
        trip({ country: 'FR' }),
        trip({ country: 'DE', entryDate: '2025-05-01', exitDate: '2025-05-05' }),
      ]),
      WINDOW,
      { countries: ['DE'] }
    )
    expect(result.countries).toHaveLength(1)
    expect(result.countries[0].country).toBe('DE')
  })
})

describe('buildCompanyTravelAudit', () => {
  const alice = employee(
    [trip({ country: 'FR', entryDate: '2025-03-01', exitDate: '2025-03-10' })],
    { id: 'e1', name: 'Alice' }
  )
  const bob = employee(
    [
      trip({ country: 'FR', entryDate: '2025-04-01', exitDate: '2025-04-05' }),
      trip({ country: 'DE', entryDate: '2025-05-01', exitDate: '2025-05-02' }),
    ],
    { id: 'e2', name: 'Bob' }
  )

  it('aggregates countries across the whole company', () => {
    const result = buildCompanyTravelAudit([alice, bob], WINDOW)
    const fr = result.countries.find((c) => c.country === 'FR')
    expect(fr?.totalDays).toBe(15) // 10 + 5
    expect(result.totals.countryCount).toBe(2)
    expect(result.totals.totalDays).toBe(17)
  })

  it('includes a per-employee breakdown sorted by days descending', () => {
    const result = buildCompanyTravelAudit([bob, alice], WINDOW)
    expect(result.employees.map((e) => e.employeeName)).toEqual(['Alice', 'Bob'])
    expect(result.employees[0].totals.totalDays).toBe(10)
  })

  it('retains employees with no travel in the window', () => {
    const carol = employee([], { id: 'e3', name: 'Carol' })
    const result = buildCompanyTravelAudit([alice, carol], WINDOW)
    const carolAudit = result.employees.find((e) => e.employeeName === 'Carol')
    expect(carolAudit).toBeDefined()
    expect(carolAudit?.totals.totalDays).toBe(0)
  })
})
