import { describe, test, expect } from 'vitest'
import {
  DEFAULT_IMPORT_DATE_FORMAT,
  DEFAULT_DATE_DISPLAY_FORMAT,
  IMPORT_DATE_FORMAT_STORAGE_KEY,
  DATE_DISPLAY_FORMAT_STORAGE_KEY,
  getStoredImportDateFormat,
  setStoredImportDateFormat,
  getStoredDateDisplayFormat,
  setStoredDateDisplayFormat,
  formatIsoDateForDisplay,
} from '@/lib/import/date-preferences'

// Tests run in Node environment (no window) — functions return defaults gracefully.

describe('constants', () => {
  test('DEFAULT_IMPORT_DATE_FORMAT is DD/MM', () => {
    expect(DEFAULT_IMPORT_DATE_FORMAT).toBe('DD/MM')
  })

  test('DEFAULT_DATE_DISPLAY_FORMAT is DD-MM-YYYY', () => {
    expect(DEFAULT_DATE_DISPLAY_FORMAT).toBe('DD-MM-YYYY')
  })

  test('storage keys are strings', () => {
    expect(typeof IMPORT_DATE_FORMAT_STORAGE_KEY).toBe('string')
    expect(typeof DATE_DISPLAY_FORMAT_STORAGE_KEY).toBe('string')
  })
})

describe('getStoredImportDateFormat (no window)', () => {
  test('returns default when window is not available', () => {
    // In Node environment, window is undefined → falls back to default
    const result = getStoredImportDateFormat()
    expect(result).toBe(DEFAULT_IMPORT_DATE_FORMAT)
  })
})

describe('setStoredImportDateFormat (no window)', () => {
  test('does not throw when window is not available', () => {
    expect(() => setStoredImportDateFormat('MM/DD')).not.toThrow()
  })
})

describe('getStoredDateDisplayFormat (no window)', () => {
  test('returns default when window is not available', () => {
    const result = getStoredDateDisplayFormat()
    expect(result).toBe(DEFAULT_DATE_DISPLAY_FORMAT)
  })
})

describe('setStoredDateDisplayFormat (no window)', () => {
  test('does not throw when window is not available', () => {
    expect(() => setStoredDateDisplayFormat('YYYY-MM-DD')).not.toThrow()
  })
})

describe('formatIsoDateForDisplay', () => {
  test('formats ISO date as DD-MM-YYYY by default', () => {
    expect(formatIsoDateForDisplay('2025-01-15')).toBe('15-01-2025')
  })

  test('formats ISO date as YYYY-MM-DD when requested', () => {
    expect(formatIsoDateForDisplay('2025-01-15', 'YYYY-MM-DD')).toBe('2025-01-15')
  })

  test('returns input unchanged for non-ISO string', () => {
    expect(formatIsoDateForDisplay('not-a-date')).toBe('not-a-date')
  })

  test('handles year boundary dates', () => {
    expect(formatIsoDateForDisplay('2025-12-31')).toBe('31-12-2025')
    expect(formatIsoDateForDisplay('2025-01-01')).toBe('01-01-2025')
  })
})
