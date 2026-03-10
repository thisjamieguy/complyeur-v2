import { describe, expect, it } from 'vitest'
import type { DailyCompliance } from '@/lib/compliance'
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
    purpose: null,
    isPrivate: false,
    isSchengen: true,
    ...overrides,
  }
}

function makeCompliance(
  date: string,
  overrides: Partial<DailyCompliance> = {}
): DailyCompliance {
  return {
    date: new Date(`${date}T00:00:00.000Z`),
    daysUsed: 80,
    daysRemaining: 10,
    riskLevel: 'amber',
    ...overrides,
  }
}

function makeComplianceMap(
  items: DailyCompliance[]
): Map<string, DailyCompliance> {
  return new Map(items.map((item) => [toDateKey(item.date), item]))
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
    const dayMap = buildDayMap(
      [trip],
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-03T00:00:00.000Z'),
      makeComplianceMap([
        makeCompliance('2026-02-01', { daysUsed: 79, daysRemaining: 11, riskLevel: 'amber' }),
        makeCompliance('2026-02-02', { daysUsed: 80, daysRemaining: 10, riskLevel: 'amber' }),
        makeCompliance('2026-02-03', { daysUsed: 90, daysRemaining: 0, riskLevel: 'red' }),
      ])
    )

    expect(dayMap.size).toBe(3)
    expect(dayMap.get('2026-02-01')?.trip.id).toBe('trip-1')
    expect(dayMap.get('2026-02-02')?.trip.id).toBe('trip-1')
    expect(dayMap.get('2026-02-03')?.trip.id).toBe('trip-1')
    expect(dayMap.get('2026-02-01')?.riskLevel).toBe('amber')
    expect(dayMap.get('2026-02-02')?.riskLevel).toBe('amber')
    expect(dayMap.get('2026-02-03')?.isBreachDay).toBe(true)
  })

  it('keeps first trip when overlap occurs on the same day', () => {
    const first = makeTrip({ id: 'first' })
    const second = makeTrip({
      id: 'second',
      entryDate: new Date('2026-02-02T00:00:00.000Z'),
      exitDate: new Date('2026-02-04T00:00:00.000Z'),
      duration: 3,
    })

    const dayMap = buildDayMap(
      [first, second],
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-04T00:00:00.000Z'),
      makeComplianceMap([
        makeCompliance('2026-02-01'),
        makeCompliance('2026-02-02'),
        makeCompliance('2026-02-03'),
        makeCompliance('2026-02-04'),
      ])
    )

    expect(dayMap.get('2026-02-02')?.trip.id).toBe('first')
    expect(dayMap.get('2026-02-04')?.trip.id).toBe('second')
  })

  it('uses day-specific compliance instead of trip-end status for the whole trip', () => {
    const trip = makeTrip({
      entryDate: new Date('2026-02-10T00:00:00.000Z'),
      exitDate: new Date('2026-02-12T00:00:00.000Z'),
      duration: 3,
    })

    const dayMap = buildDayMap(
      [trip],
      new Date('2026-02-10T00:00:00.000Z'),
      new Date('2026-02-12T00:00:00.000Z'),
      makeComplianceMap([
        makeCompliance('2026-02-10', { daysUsed: 74, daysRemaining: 16, riskLevel: 'green' }),
        makeCompliance('2026-02-11', { daysUsed: 75, daysRemaining: 15, riskLevel: 'amber' }),
        makeCompliance('2026-02-12', { daysUsed: 90, daysRemaining: 0, riskLevel: 'red' }),
      ])
    )

    expect(dayMap.get('2026-02-10')?.riskLevel).toBe('green')
    expect(dayMap.get('2026-02-11')?.riskLevel).toBe('amber')
    expect(dayMap.get('2026-02-12')?.riskLevel).toBe('red')
  })
})
