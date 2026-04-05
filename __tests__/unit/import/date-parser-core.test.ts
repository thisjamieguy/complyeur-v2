import { describe, test, expect } from 'vitest'
import {
  parseDate,
  analyzeAmbiguity,
  parseDates,
  extractDateColumn,
  validateDateRange,
} from '@/lib/import/date-parser'

describe('parseDate', () => {
  describe('ISO format (YYYY-MM-DD)', () => {
    test('parses standard ISO date', () => {
      const result = parseDate('2025-01-15')
      expect(result.date).toBe('2025-01-15')
      expect(result.format).toBe('ISO')
      expect(result.isAmbiguous).toBe(false)
      expect(result.confidence).toBe('high')
    })

    test('parses ISO date at year boundary', () => {
      const result = parseDate('2025-12-31')
      expect(result.date).toBe('2025-12-31')
    })

    test('parses ISO date at start of year', () => {
      const result = parseDate('2025-01-01')
      expect(result.date).toBe('2025-01-01')
    })

    test('rejects invalid ISO date (month 13)', () => {
      const result = parseDate('2025-13-01')
      expect(result.date).toBeNull()
    })
  })

  describe('ISO datetime format', () => {
    test('parses ISO datetime and extracts date part', () => {
      const result = parseDate('2025-01-15T10:30:00')
      expect(result.date).toBe('2025-01-15')
      expect(result.format).toBe('ISO_DATETIME')
    })
  })

  describe('Excel serial dates (numbers)', () => {
    test('parses a known Excel serial date', () => {
      // Excel serial 45292 = 2025-01-01 (approximately)
      const result = parseDate(45292)
      expect(result.date).not.toBeNull()
      expect(result.format).toBe('EXCEL_SERIAL')
      expect(result.confidence).toBe('high')
      expect(result.isAmbiguous).toBe(false)
    })

    test('rejects out-of-range serial number', () => {
      const result = parseDate(0)
      expect(result.date).toBeNull()
      expect(result.format).toBe('UNKNOWN')
    })

    test('rejects very large serial number', () => {
      const result = parseDate(99999)
      expect(result.date).toBeNull()
    })
  })

  describe('text formats with month names', () => {
    test('parses "15 Jan 2025" (DMY text)', () => {
      const result = parseDate('15 Jan 2025')
      expect(result.date).toBe('2025-01-15')
      expect(result.format).toBe('TEXT_DMY')
    })

    test('parses "15-Jan-2025" (DMY with dash)', () => {
      const result = parseDate('15-Jan-2025')
      expect(result.date).toBe('2025-01-15')
      expect(result.format).toBe('TEXT_DMY')
    })

    test('parses "Jan 15, 2025" (MDY text)', () => {
      const result = parseDate('Jan 15, 2025')
      expect(result.date).toBe('2025-01-15')
      expect(result.format).toBe('TEXT_MDY')
    })

    test('parses "January 15 2025" (full month name MDY)', () => {
      const result = parseDate('January 15 2025')
      expect(result.date).toBe('2025-01-15')
    })

    test('parses various month abbreviations', () => {
      expect(parseDate('1 Feb 2025').date).toBe('2025-02-01')
      expect(parseDate('1 Mar 2025').date).toBe('2025-03-01')
      expect(parseDate('1 Apr 2025').date).toBe('2025-04-01')
      expect(parseDate('1 May 2025').date).toBe('2025-05-01')
      expect(parseDate('1 Jun 2025').date).toBe('2025-06-01')
      expect(parseDate('1 Jul 2025').date).toBe('2025-07-01')
      expect(parseDate('1 Aug 2025').date).toBe('2025-08-01')
      expect(parseDate('1 Sep 2025').date).toBe('2025-09-01')
      expect(parseDate('1 Oct 2025').date).toBe('2025-10-01')
      expect(parseDate('1 Nov 2025').date).toBe('2025-11-01')
      expect(parseDate('1 Dec 2025').date).toBe('2025-12-01')
    })
  })

  describe('Gantt header format', () => {
    test('parses "Mon 06 Jan" with reference year', () => {
      const result = parseDate('Mon 06 Jan', { referenceYear: 2025, isGanttHeader: true })
      expect(result.date).toBe('2025-01-06')
      expect(result.format).toBe('GANTT_HEADER')
    })

    test('parses "Wed 15" short Gantt header', () => {
      const result = parseDate('Wed 15', { referenceYear: 2025, isGanttHeader: true })
      expect(result.date).not.toBeNull()
    })
  })

  describe('numeric formats', () => {
    test('parses UK format "15/01/2025"', () => {
      const result = parseDate('15/01/2025')
      expect(result.date).toBe('2025-01-15')
    })

    test('parses numeric date with dashes "15-01-2025"', () => {
      const result = parseDate('15-01-2025', { preferredFormat: 'DD/MM' })
      expect(result.date).toBe('2025-01-15')
    })

    test('marks ambiguous date "01/02/2025" as ambiguous', () => {
      const result = parseDate('01/02/2025')
      expect(result.isAmbiguous).toBe(true)
    })

    test('unambiguous "15/01/2025" is not ambiguous', () => {
      const result = parseDate('15/01/2025')
      expect(result.isAmbiguous).toBe(false)
    })
  })

  describe('empty and invalid inputs', () => {
    test('returns null date for empty string', () => {
      const result = parseDate('')
      expect(result.date).toBeNull()
      expect(result.warning).toBeTruthy()
    })

    test('returns null date for whitespace', () => {
      const result = parseDate('   ')
      expect(result.date).toBeNull()
    })

    test('returns UNKNOWN format for unrecognized input', () => {
      const result = parseDate('not a date at all')
      expect(result.date).toBeNull()
      expect(result.format).toBe('UNKNOWN')
    })

    test('preserves original input in result', () => {
      const result = parseDate('2025-06-15')
      expect(result.original).toBe('2025-06-15')
    })
  })

  describe('additional parseDate branches', () => {
    test('parses MM/DD format when preferredFormat is MM/DD', () => {
      // "03/04/2025" ambiguous; MM/DD preference → month=3, day=4 → March 4
      const result = parseDate('03/04/2025', { preferredFormat: 'MM/DD' })
      expect(result.date).toBe('2025-03-04')
      expect(result.isAmbiguous).toBe(true)
    })

    test('parses short "06 Jan" format (no year)', () => {
      const result = parseDate('06 Jan', { referenceYear: 2025 })
      expect(result.date).toBe('2025-01-06')
      expect(result.format).toBe('SHORT_DM')
    })

    test('parses short "Jan 06" format (no year)', () => {
      const result = parseDate('Jan 06', { referenceYear: 2025 })
      expect(result.date).toBe('2025-01-06')
    })

    test('parses Gantt header with day name and explicit year "Mon 06 Jan 2025"', () => {
      // Has day name prefix → skips TEXT_DMY, goes through parseGanttDate
      const result = parseDate('Mon 06 Jan 2025', { referenceYear: 2025, isGanttHeader: true })
      expect(result.date).toBe('2025-01-06')
      expect(result.format).toBe('GANTT_HEADER')
    })
  })
})

describe('analyzeAmbiguity', () => {
  test('returns empty report for empty array', () => {
    const report = analyzeAmbiguity([])
    expect(report.totalDates).toBe(0)
    expect(report.requiresConfirmation).toBe(false)
  })

  test('detects DD/MM format from unambiguous dates', () => {
    const report = analyzeAmbiguity(['15/01/2025', '20/01/2025', '25/01/2025'])
    expect(report.detectedFormat).toBe('DD/MM')
    expect(report.confidence).toBe('high')
  })

  test('detects MM/DD format from unambiguous dates', () => {
    const report = analyzeAmbiguity(['01/15/2025', '01/20/2025'])
    expect(report.detectedFormat).toBe('MM/DD')
  })

  test('reports MIXED when both DD/MM and MM/DD evidence found', () => {
    // 15/01/2025 → DD/MM evidence; 01/15/2025 → MM/DD evidence
    const report = analyzeAmbiguity(['15/01/2025', '01/15/2025'])
    expect(report.detectedFormat).toBe('MIXED')
    expect(report.requiresConfirmation).toBe(true)
  })

  test('reports UNKNOWN when all dates are ambiguous', () => {
    const report = analyzeAmbiguity(['01/02/2025', '03/04/2025'])
    expect(report.detectedFormat).toBe('UNKNOWN')
    expect(report.requiresConfirmation).toBe(true)
  })

  test('reports UNKNOWN with medium confidence for non-numeric dates', () => {
    const report = analyzeAmbiguity(['2025-01-15', '15 Jan 2025'])
    expect(report.detectedFormat).toBe('UNKNOWN')
    expect(report.confidence).toBe('medium')
  })

  test('filters empty strings from input', () => {
    const report = analyzeAmbiguity(['', '  ', '15/01/2025'])
    expect(report.totalDates).toBe(1)
  })
})

describe('parseDates', () => {
  test('parses array of date strings', () => {
    const results = parseDates(['2025-01-15', '2025-06-30'])
    expect(results).toHaveLength(2)
    expect(results[0].date).toBe('2025-01-15')
    expect(results[1].date).toBe('2025-06-30')
  })

  test('returns empty array for empty input', () => {
    expect(parseDates([])).toHaveLength(0)
  })

  test('uses preferred format for ambiguous dates', () => {
    // MM/DD: month=3, day=4 → March 4 = 2025-03-04
    const results = parseDates(['03/04/2025'], 'MM/DD')
    expect(results[0].date).toBe('2025-03-04')
  })
})

describe('extractDateColumn', () => {
  test('extracts non-empty values from a column', () => {
    const rows = [
      { date: '2025-01-01' },
      { date: '2025-01-02' },
      { date: '' },
      { date: null },
    ]
    const result = extractDateColumn(rows, 'date')
    expect(result).toHaveLength(2)
    expect(result).toContain('2025-01-01')
  })

  test('returns empty array for missing column', () => {
    const rows = [{ name: 'Alice' }]
    expect(extractDateColumn(rows, 'date')).toHaveLength(0)
  })

  test('converts numbers to strings', () => {
    const rows = [{ date: 45292 }]
    const result = extractDateColumn(rows as never, 'date')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('45292')
  })
})

describe('validateDateRange', () => {
  test('returns valid for a reasonable date', () => {
    const result = validateDateRange('2025-06-15')
    expect(result.valid).toBe(true)
    expect(result.warning).toBeUndefined()
  })

  test('returns invalid for non-ISO format', () => {
    const result = validateDateRange('15/06/2025')
    expect(result.valid).toBe(false)
    expect(result.warning).toContain('Invalid date format')
  })

  test('returns invalid for year before minYear', () => {
    const result = validateDateRange('1999-01-01')
    expect(result.valid).toBe(false)
    expect(result.warning).toContain('2000')
  })

  test('returns invalid for year after maxYear', () => {
    const result = validateDateRange('2101-01-01')
    expect(result.valid).toBe(false)
  })

  test('returns invalid for future date when allowFuture is false', () => {
    const result = validateDateRange('2099-01-01', { allowFuture: false })
    expect(result.valid).toBe(false)
    expect(result.warning).toContain('future')
  })

  test('returns warning (but valid) for date far in the future', () => {
    const result = validateDateRange('2030-01-01', { allowFuture: true, maxFutureDays: 30 })
    expect(result.valid).toBe(true)
    expect(result.warning).toContain('future')
  })
})
