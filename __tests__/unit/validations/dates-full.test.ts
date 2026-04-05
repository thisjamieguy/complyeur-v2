import { describe, test, expect } from 'vitest'
import {
  isValidDateRange,
  isDateTooFarInPast,
  isDateTooFarInFuture,
  getTripDurationDays,
  parseDate,
  formatDateForDisplay,
  getTodayISOString,
  checkTripDurationWarning,
  isValidISODate,
} from '@/lib/validations/dates'

describe('isValidDateRange', () => {
  test('returns true when end is after start', () => {
    expect(isValidDateRange(new Date('2025-01-01'), new Date('2025-01-10'))).toBe(true)
  })

  test('returns true when end equals start (same day trip)', () => {
    const d = new Date('2025-06-15')
    expect(isValidDateRange(d, d)).toBe(true)
  })

  test('returns false when end is before start', () => {
    expect(isValidDateRange(new Date('2025-01-10'), new Date('2025-01-01'))).toBe(false)
  })
})

describe('isDateTooFarInPast', () => {
  test('returns false for recent date within 180 days', () => {
    const recent = new Date()
    recent.setDate(recent.getDate() - 30)
    expect(isDateTooFarInPast(recent)).toBe(false)
  })

  test('returns true for date older than 180 days', () => {
    const old = new Date()
    old.setDate(old.getDate() - 200)
    expect(isDateTooFarInPast(old)).toBe(true)
  })

  test('uses custom maxDaysBack threshold', () => {
    const date = new Date()
    date.setDate(date.getDate() - 10)
    expect(isDateTooFarInPast(date, 5)).toBe(true)
    expect(isDateTooFarInPast(date, 15)).toBe(false)
  })
})

describe('isDateTooFarInFuture', () => {
  test('returns false for date within 30 days', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 15)
    expect(isDateTooFarInFuture(soon)).toBe(false)
  })

  test('returns true for date beyond 30 days', () => {
    const far = new Date()
    far.setDate(far.getDate() + 45)
    expect(isDateTooFarInFuture(far)).toBe(true)
  })

  test('uses custom maxDaysForward threshold', () => {
    const date = new Date()
    date.setDate(date.getDate() + 10)
    expect(isDateTooFarInFuture(date, 5)).toBe(true)
    expect(isDateTooFarInFuture(date, 15)).toBe(false)
  })
})

describe('getTripDurationDays', () => {
  test('returns 1 for same-day trip', () => {
    const d = new Date('2025-01-01')
    expect(getTripDurationDays(d, d)).toBe(1)
  })

  test('returns 10 for 10-day trip (inclusive)', () => {
    expect(getTripDurationDays(new Date('2025-01-01'), new Date('2025-01-10'))).toBe(10)
  })

  test('returns 2 for overnight trip', () => {
    expect(getTripDurationDays(new Date('2025-06-01'), new Date('2025-06-02'))).toBe(2)
  })
})

describe('parseDate', () => {
  test('parses valid ISO date string', () => {
    const result = parseDate('2025-01-15')
    expect(result).not.toBeNull()
    expect(result!.getUTCFullYear()).toBe(2025)
  })

  test('returns null for empty string', () => {
    expect(parseDate('')).toBeNull()
  })

  test('returns null for invalid date string', () => {
    expect(parseDate('not-a-date')).toBeNull()
  })
})

describe('formatDateForDisplay', () => {
  test('formats a date string', () => {
    const result = formatDateForDisplay('2025-01-15')
    expect(result).toContain('2025')
    expect(result).toContain('Jan')
  })

  test('formats a Date object directly', () => {
    const d = new Date('2025-06-15T00:00:00Z')
    const result = formatDateForDisplay(d)
    expect(result).toContain('2025')
    expect(result).toContain('Jun')
  })
})

describe('getTodayISOString', () => {
  test('returns a string in YYYY-MM-DD format', () => {
    const today = getTodayISOString()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('checkTripDurationWarning', () => {
  test('returns null for normal trip length', () => {
    const result = checkTripDurationWarning(new Date('2025-01-01'), new Date('2025-01-30'))
    expect(result).toBeNull()
  })

  test('returns warning when trip exceeds 90 days', () => {
    const result = checkTripDurationWarning(new Date('2025-01-01'), new Date('2025-04-15'))
    expect(result).toContain('exceeds the 90-day')
  })

  test('returns error when trip exceeds 180 days', () => {
    const result = checkTripDurationWarning(new Date('2025-01-01'), new Date('2025-08-01'))
    expect(result).toContain('cannot exceed 180 days')
  })
})

describe('isValidISODate', () => {
  test('returns true for valid ISO date', () => {
    expect(isValidISODate('2025-01-15')).toBe(true)
  })

  test('returns false for empty string', () => {
    expect(isValidISODate('')).toBe(false)
  })

  test('returns false for wrong format', () => {
    expect(isValidISODate('15/01/2025')).toBe(false)
    expect(isValidISODate('01-15-2025')).toBe(false)
  })

  test('returns false for invalid date values', () => {
    expect(isValidISODate('2025-13-01')).toBe(false) // month 13
    expect(isValidISODate('2025-02-31')).toBe(false) // Feb 31 doesn't exist
  })

  test('returns true for leap year date', () => {
    expect(isValidISODate('2024-02-29')).toBe(true)
  })

  test('returns false for Feb 29 on non-leap year', () => {
    expect(isValidISODate('2025-02-29')).toBe(false)
  })
})
