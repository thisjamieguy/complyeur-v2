import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addUtcDays, toUTCMidnight } from '@/lib/compliance/date-utils'
import {
  checkTripDurationWarning,
  getTodayISOString,
  getTripDurationDays,
  isDateTooFarInFuture,
  isDateTooFarInPast,
  isValidISODate,
  parseDate,
} from '@/lib/validations/dates'

describe('date validation helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('applies past-date threshold consistently at the 180-day boundary', () => {
    vi.setSystemTime(new Date('2026-02-12T15:30:00.000Z'))
    const today = toUTCMidnight(new Date())

    expect(isDateTooFarInPast(addUtcDays(today, -180), 180)).toBe(false)
    expect(isDateTooFarInPast(addUtcDays(today, -181), 180)).toBe(true)
  })

  it('applies future-date threshold consistently at the 30-day boundary', () => {
    vi.setSystemTime(new Date('2026-02-12T15:30:00.000Z'))
    const today = toUTCMidnight(new Date())

    expect(isDateTooFarInFuture(addUtcDays(today, 30), 30)).toBe(false)
    expect(isDateTooFarInFuture(addUtcDays(today, 31), 30)).toBe(true)
  })

  it('calculates inclusive trip duration across month/year boundaries', () => {
    expect(
      getTripDurationDays(
        new Date('2025-12-30T00:00:00.000Z'),
        new Date('2026-01-02T00:00:00.000Z')
      )
    ).toBe(4)

    expect(
      getTripDurationDays(
        new Date('2026-03-08T00:00:00.000Z'),
        new Date('2026-03-09T00:00:00.000Z')
      )
    ).toBe(2)
  })

  it('validates date-only ISO strings using UTC calendar fields', () => {
    expect(isValidISODate('2024-02-29')).toBe(true)
    expect(isValidISODate('2025-02-29')).toBe(false)
    expect(isValidISODate('2026-13-01')).toBe(false)
  })

  it('parses date-only strings as UTC midnight', () => {
    expect(parseDate('2026-02-12')?.toISOString()).toBe('2026-02-12T00:00:00.000Z')
    expect(parseDate('invalid-date')).toBeNull()
  })

  it('returns UTC date for today ISO helper and warning thresholds for long trips', () => {
    vi.setSystemTime(new Date('2026-02-12T23:59:59.000Z'))
    expect(getTodayISOString()).toBe('2026-02-12')

    expect(
      checkTripDurationWarning(
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-04-05T00:00:00.000Z')
      )
    ).toContain('exceeds the 90-day Schengen limit')

    expect(
      checkTripDurationWarning(
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-07-10T00:00:00.000Z')
      )
    ).toContain('cannot exceed 180 days')
  })
})
