import { describe, expect, it } from 'vitest'
import {
  buildEmployeeProcessingCacheKey,
  processCalendarEmployee,
  type TripOverride,
} from '../calendar-view.helpers'
import type { DbTrip, EmployeeWithTrips } from '../types'

function makeDbTrip(overrides: Partial<DbTrip> = {}): DbTrip {
  return {
    id: 'trip-1',
    country: 'FR',
    entry_date: '2026-02-01',
    exit_date: '2026-02-03',
    purpose: null,
    job_ref: null,
    is_private: false,
    ghosted: false,
    ...overrides,
  }
}

function makeEmployee(overrides: Partial<EmployeeWithTrips> = {}): EmployeeWithTrips {
  return {
    id: 'emp-1',
    name: 'Alex Doe',
    trips: [makeDbTrip()],
    ...overrides,
  }
}

const RANGE = {
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  endDate: new Date('2026-03-01T00:00:00.000Z'),
  today: new Date('2026-02-05T00:00:00.000Z'),
}

describe('processCalendarEmployee overrides', () => {
  it('applies a pending date override over the source trip dates', () => {
    const overrides = new Map<string, TripOverride>([
      ['trip-1', { entry_date: '2026-02-10', exit_date: '2026-02-12' }],
    ])

    const processed = processCalendarEmployee({
      employee: makeEmployee(),
      tripOverrides: overrides,
      ...RANGE,
    })

    expect(processed.trips).toHaveLength(1)
    expect(processed.trips[0].entryDate.toISOString().slice(0, 10)).toBe('2026-02-10')
    expect(processed.trips[0].exitDate.toISOString().slice(0, 10)).toBe('2026-02-12')
  })

  it('applies a pending privacy override, masking the country like a confirmed private trip', () => {
    const overrides = new Map<string, TripOverride>([['trip-1', { is_private: true }]])

    const processed = processCalendarEmployee({
      employee: makeEmployee({ trips: [makeDbTrip({ is_private: false })] }),
      tripOverrides: overrides,
      ...RANGE,
    })

    expect(processed.trips[0].isPrivate).toBe(true)
    expect(processed.trips[0].country).toBe('XX')
    expect(processed.trips[0].rawCountry).toBe('FR')
  })

  it('drops a trip marked deleted, even though the server copy still has it', () => {
    const overrides = new Map<string, TripOverride>([['trip-1', { deleted: true }]])

    const processed = processCalendarEmployee({
      employee: makeEmployee(),
      tripOverrides: overrides,
      ...RANGE,
    })

    expect(processed.trips).toHaveLength(0)
  })

  it('leaves trips with no override untouched', () => {
    const processed = processCalendarEmployee({
      employee: makeEmployee(),
      tripOverrides: new Map(),
      ...RANGE,
    })

    expect(processed.trips).toHaveLength(1)
    expect(processed.trips[0].isPrivate).toBe(false)
  })
})

describe('buildEmployeeProcessingCacheKey overrides', () => {
  const keyArgs = {
    employee: makeEmployee(),
    startDateKey: '2026-01-01',
    endDateKey: '2026-03-01',
    todayKey: '2026-02-05',
  }

  it('changes the cache key when a privacy override is added', () => {
    const withoutOverride = buildEmployeeProcessingCacheKey({
      ...keyArgs,
      tripOverrides: new Map(),
    })
    const withOverride = buildEmployeeProcessingCacheKey({
      ...keyArgs,
      tripOverrides: new Map([['trip-1', { is_private: true }]]),
    })

    expect(withOverride).not.toBe(withoutOverride)
  })

  it('changes the cache key when a trip is marked deleted', () => {
    const withoutOverride = buildEmployeeProcessingCacheKey({
      ...keyArgs,
      tripOverrides: new Map(),
    })
    const withDeleted = buildEmployeeProcessingCacheKey({
      ...keyArgs,
      tripOverrides: new Map([['trip-1', { deleted: true }]]),
    })

    expect(withDeleted).not.toBe(withoutOverride)
  })

  it('produces the same key for equivalent state, so unrelated employees can hit the cache', () => {
    const first = buildEmployeeProcessingCacheKey({
      ...keyArgs,
      tripOverrides: new Map([['trip-1', { is_private: true }]]),
    })
    const second = buildEmployeeProcessingCacheKey({
      ...keyArgs,
      tripOverrides: new Map([['trip-1', { is_private: true }]]),
    })

    expect(first).toBe(second)
  })
})
