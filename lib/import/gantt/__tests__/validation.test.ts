import { describe, test, expect } from 'vitest'
import { validateGanttData } from '../validation'
import type { GanttParseResult } from '../types'

/** Builds a minimal valid GanttParseResult for testing. */
function makeResult(overrides: Partial<GanttParseResult> = {}): GanttParseResult {
  return {
    success: true,
    dateColumns: [],
    rows: [],
    referenceYear: 2025,
    ignoredColumns: [],
    ...overrides,
  }
}

function makeDateColumn(date: string, index: number) {
  return {
    index,
    header: date,
    date: { date, original: date, format: 'ISO' as const, isAmbiguous: false, confidence: 'high' as const },
  }
}

function makeCell(rawValue: string, countryCode: string | null) {
  return {
    rowIndex: 0,
    colIndex: 0,
    rawValue,
    countryCode,
    isSchengen: !!countryCode,
    isTravelDay: false,
    countsAsDay: !!countryCode,
  }
}

describe('validateGanttData', () => {
  describe('failed parse results', () => {
    test('returns invalid with error message when parse failed', () => {
      const result = validateGanttData(makeResult({ success: false, error: 'Parse failed' }))
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Parse failed')
    })

    test('uses generic error when no error message provided', () => {
      const result = validateGanttData(makeResult({ success: false }))
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toBe('Unknown parsing error')
    })
  })

  describe('successful parse results', () => {
    test('returns valid for clean data with no issues', () => {
      const result = validateGanttData(makeResult({
        dateColumns: [
          makeDateColumn('2025-01-06', 1),
          makeDateColumn('2025-01-07', 2),
        ],
        rows: [],
      }))
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    test('warns about date gaps', () => {
      const result = validateGanttData(makeResult({
        dateColumns: [
          makeDateColumn('2025-01-06', 1),
          makeDateColumn('2025-01-09', 2), // 2-day gap
        ],
        rows: [],
      }))
      expect(result.isValid).toBe(true)
      expect(result.warnings.some((w) => w.includes('Gap detected'))).toBe(true)
      expect(result.warnings.some((w) => w.includes('2025-01-06') && w.includes('2025-01-09'))).toBe(true)
    })

    test('does not warn when dates are consecutive', () => {
      const result = validateGanttData(makeResult({
        dateColumns: [
          makeDateColumn('2025-01-06', 1),
          makeDateColumn('2025-01-07', 2),
          makeDateColumn('2025-01-08', 3),
        ],
        rows: [],
      }))
      expect(result.warnings.some((w) => w.includes('Gap'))).toBe(false)
    })

    test('warns about unrecognized country values', () => {
      const result = validateGanttData(makeResult({
        dateColumns: [makeDateColumn('2025-01-06', 1)],
        rows: [{
          index: 0,
          employeeName: 'John Smith',
          cells: [makeCell('UNKNOWN_COUNTRY', null)],
        }],
      }))
      expect(result.isValid).toBe(true)
      expect(result.warnings.some((w) => w.includes('Unrecognized values'))).toBe(true)
    })

    test('does not warn for dash values', () => {
      const result = validateGanttData(makeResult({
        dateColumns: [makeDateColumn('2025-01-06', 1)],
        rows: [{
          index: 0,
          employeeName: 'John Smith',
          cells: [makeCell('-', null)],
        }],
      }))
      expect(result.warnings.some((w) => w.includes('Unrecognized'))).toBe(false)
    })

    test('does not warn for recognized non-counting values (holiday)', () => {
      const result = validateGanttData(makeResult({
        dateColumns: [makeDateColumn('2025-01-06', 1)],
        rows: [{
          index: 0,
          employeeName: 'John Smith',
          cells: [makeCell('holiday', null)],
        }],
      }))
      expect(result.warnings.some((w) => w.includes('Unrecognized'))).toBe(false)
    })

    test('does not warn for recognized country codes (null rawValue)', () => {
      const result = validateGanttData(makeResult({
        dateColumns: [makeDateColumn('2025-01-06', 1)],
        rows: [{
          index: 0,
          employeeName: 'John Smith',
          cells: [makeCell('', null)],
        }],
      }))
      expect(result.warnings.some((w) => w.includes('Unrecognized'))).toBe(false)
    })

    test('truncates unrecognized list beyond 5', () => {
      const cells = Array.from({ length: 8 }, (_, i) => makeCell(`BADVAL${i}`, null))
      const result = validateGanttData(makeResult({
        dateColumns: [makeDateColumn('2025-01-06', 1)],
        rows: [{ index: 0, employeeName: 'John', cells }],
      }))
      expect(result.warnings.some((w) => w.includes('and 3 more'))).toBe(true)
    })

    test('warns about ignored columns', () => {
      const result = validateGanttData(makeResult({
        ignoredColumns: [
          { index: 5, header: 'Notes' },
          { index: 6, header: 'Manager' },
        ],
      }))
      expect(result.warnings.some((w) => w.includes('ignored'))).toBe(true)
      expect(result.warnings.some((w) => w.includes('Notes'))).toBe(true)
    })

    test('truncates ignored columns list beyond 3', () => {
      const result = validateGanttData(makeResult({
        ignoredColumns: [
          { index: 1, header: 'Notes' },
          { index: 2, header: 'Manager' },
          { index: 3, header: 'Department' },
          { index: 4, header: 'Location' },
        ],
      }))
      expect(result.warnings.some((w) => w.includes('...'))).toBe(true)
    })

    test('does not warn when no ignored columns', () => {
      const result = validateGanttData(makeResult({ ignoredColumns: [] }))
      expect(result.warnings.some((w) => w.includes('ignored'))).toBe(false)
    })

    test('handles single date column without gap check', () => {
      const result = validateGanttData(makeResult({
        dateColumns: [makeDateColumn('2025-01-06', 1)],
        rows: [],
      }))
      expect(result.isValid).toBe(true)
      expect(result.warnings.some((w) => w.includes('Gap'))).toBe(false)
    })
  })
})
