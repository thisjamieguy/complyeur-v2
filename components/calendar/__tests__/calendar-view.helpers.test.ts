import { describe, expect, it } from 'vitest'
import {
  buildDateRange,
  buildDayMap,
  overlapsVisibleRange,
  toDateKey,
} from '../calendar-view.utils'
import type { ProcessedTrip } from '../types'

function makeTrip(overrides: Partial<ProcessedTrip> = {}): ProcessedTrip {
  return {
    id: 'trip-1',
    country: 'FR',
    entryDate: new Date('2026-02-01T00:00:00.000Z'),
    exitDate: new Date('2026-02-03T00:00:00.000Z'),
    duration: 3,
    daysRemaining: 40,
    riskLevel: 'amber',
    purpose: null,
    isPrivate: false,
    isSchengen: true,
    ...overrides,
  }
}

describe('calendar-view helpers', () => {
  it('creates stable ISO date keys', () => {
    expect(toDateKey(new Date('2026-02-03T00:00:00.000Z'))).toBe('2026-02-03')
  })

  it('checks range overlap including boundary days', () => {
    const start = new Date('2026-02-01T00:00:00.000Z')
    const end = new Date('2026-02-10T00:00:00.000Z')

    expect(
      overlapsVisibleRange(
        new Date('2026-01-20T00:00:00.000Z'),
        new Date('2026-02-01T00:00:00.000Z'),
        start,
        end
      )
    ).toBe(true)

    expect(
      overlapsVisibleRange(
        new Date('2026-02-11T00:00:00.000Z'),
        new Date('2026-02-12T00:00:00.000Z'),
        start,
        end
      )
    ).toBe(false)
  })

  it('builds inclusive UTC date ranges', () => {
    const dates = buildDateRange(
      new Date('2026-03-28T00:00:00.000Z'),
      new Date('2026-03-30T00:00:00.000Z')
    )

    expect(dates).toHaveLength(3)
    expect(dates.map(toDateKey)).toEqual([
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
    ])
  })

  it('builds day map with one entry per day', () => {
    const trip = makeTrip()
    const dayMap = buildDayMap([trip])

    expect(dayMap.size).toBe(3)
    expect(dayMap.get('2026-02-01')?.id).toBe('trip-1')
    expect(dayMap.get('2026-02-02')?.id).toBe('trip-1')
    expect(dayMap.get('2026-02-03')?.id).toBe('trip-1')
  })

  it('keeps first trip when overlap occurs on the same day', () => {
    const first = makeTrip({ id: 'first' })
    const second = makeTrip({
      id: 'second',
      entryDate: new Date('2026-02-02T00:00:00.000Z'),
      exitDate: new Date('2026-02-04T00:00:00.000Z'),
      duration: 3,
    })

    const dayMap = buildDayMap([first, second])

    expect(dayMap.get('2026-02-02')?.id).toBe('first')
    expect(dayMap.get('2026-02-04')?.id).toBe('second')
  })
})
