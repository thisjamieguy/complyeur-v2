/**
 * Comprehensive tests for CSV generation utilities.
 * Tests: generateComplianceCsv, getComplianceCsvFilename,
 *        generateTripHistoryCsv, validateCsvContent,
 *        generateFutureAlertsCsv, getFutureAlertsCsvFilename
 */

import { describe, test, expect } from 'vitest'
import { parseISO } from 'date-fns'
import {
  generateComplianceCsv,
  getComplianceCsvFilename,
  generateTripHistoryCsv,
  validateCsvContent,
  generateFutureAlertsCsv,
  getFutureAlertsCsvFilename,
} from '@/lib/exports/csv-generator'
import type { EmployeeExportRow, FutureAlertExportRow } from '@/lib/exports/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

const UTF8_BOM = '\uFEFF'

function makeEmployee(overrides: Partial<EmployeeExportRow> = {}): EmployeeExportRow {
  return {
    id: 'emp-1',
    name: 'Jane Smith',
    status: 'Compliant',
    daysUsed: 10,
    daysRemaining: 80,
    lastTripEnd: parseISO('2026-01-15'),
    lastTripCountry: 'France',
    nextSafeEntry: null,
    totalTrips: 2,
    riskLevel: 'green',
    ...overrides,
  }
}

function makeFutureAlert(overrides: Partial<FutureAlertExportRow> = {}): FutureAlertExportRow {
  return {
    tripId: 'trip-1',
    employeeName: 'Jane Smith',
    country: 'Germany',
    entryDate: parseISO('2026-06-01'),
    exitDate: parseISO('2026-06-07'),
    tripDuration: 7,
    daysUsedBefore: 20,
    daysAfterTrip: 27,
    daysRemaining: 63,
    status: 'Safe',
    riskLevel: 'green',
    isCompliant: true,
    compliantFromDate: null,
    ...overrides,
  }
}

// ─── generateComplianceCsv ───────────────────────────────────────────────────

describe('generateComplianceCsv', () => {
  test('starts with UTF-8 BOM', () => {
    const csv = generateComplianceCsv([makeEmployee()])
    expect(csv.startsWith(UTF8_BOM)).toBe(true)
  })

  test('first line after BOM contains all 9 column headers', () => {
    const csv = generateComplianceCsv([makeEmployee()])
    const lines = csv.slice(1).split('\n')
    const headers = lines[0].split(',')
    expect(headers).toHaveLength(9)
    expect(headers).toContain('Employee Name')
    expect(headers).toContain('Status')
    expect(headers).toContain('Days Used')
    expect(headers).toContain('Days Remaining')
    expect(headers).toContain('Last Trip End')
    expect(headers).toContain('Last Trip Country')
    expect(headers).toContain('Next Safe Entry')
    expect(headers).toContain('Total Trips')
    expect(headers).toContain('Risk Level')
  })

  test('produces one data row per employee', () => {
    const csv = generateComplianceCsv([makeEmployee(), makeEmployee({ id: 'emp-2', name: 'Bob Jones' })])
    const lines = csv.slice(1).split('\n')
    expect(lines).toHaveLength(3) // header + 2 data rows
  })

  test('formats dates as YYYY-MM-DD', () => {
    const csv = generateComplianceCsv([makeEmployee()])
    expect(csv).toContain('2026-01-15')
  })

  test('emits empty string for null lastTripEnd', () => {
    const csv = generateComplianceCsv([makeEmployee({ lastTripEnd: null })])
    const dataLine = csv.slice(1).split('\n')[1]
    const cols = dataLine.split(',')
    expect(cols[4]).toBe('') // Last Trip End column (index 4)
  })

  test('emits empty string for null lastTripCountry', () => {
    const csv = generateComplianceCsv([makeEmployee({ lastTripCountry: null })])
    const dataLine = csv.slice(1).split('\n')[1]
    const cols = dataLine.split(',')
    expect(cols[5]).toBe('')
  })

  test('emits empty string for null nextSafeEntry', () => {
    const csv = generateComplianceCsv([makeEmployee({ nextSafeEntry: null })])
    const dataLine = csv.slice(1).split('\n')[1]
    const cols = dataLine.split(',')
    expect(cols[6]).toBe('')
  })

  test('includes nextSafeEntry date when present', () => {
    const csv = generateComplianceCsv([makeEmployee({ nextSafeEntry: parseISO('2026-09-01') })])
    expect(csv).toContain('2026-09-01')
  })

  test('handles negative daysRemaining (breach scenario)', () => {
    const csv = generateComplianceCsv([makeEmployee({ daysUsed: 95, daysRemaining: -5 })])
    expect(csv).toContain('-5')
  })

  test('sanitizes employee name starting with = (CSV injection)', () => {
    const csv = generateComplianceCsv([makeEmployee({ name: '=CMD()' })])
    expect(csv).toContain("'=CMD()")
    expect(csv).not.toContain(',=CMD()')
  })

  test('sanitizes employee name starting with + (CSV injection)', () => {
    const csv = generateComplianceCsv([makeEmployee({ name: '+malicious' })])
    expect(csv).toContain("'+malicious")
  })

  test('sanitizes employee name starting with - (CSV injection)', () => {
    const csv = generateComplianceCsv([makeEmployee({ name: '-DROP TABLE' })])
    expect(csv).toContain("'-DROP TABLE")
  })

  test('sanitizes employee name starting with @ (CSV injection)', () => {
    const csv = generateComplianceCsv([makeEmployee({ name: '@formula' })])
    expect(csv).toContain("'@formula")
  })

  test('wraps name with comma in double quotes', () => {
    const csv = generateComplianceCsv([makeEmployee({ name: 'Smith, Jane' })])
    expect(csv).toContain('"Smith, Jane"')
  })

  test('produces only header line when rows array is empty', () => {
    const csv = generateComplianceCsv([])
    const lines = csv.slice(1).split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('Employee Name')
  })

  test('rows are joined with newlines (not commas)', () => {
    const csv = generateComplianceCsv([makeEmployee(), makeEmployee({ id: 'e2', name: 'Bob' })])
    const lines = csv.slice(1).split('\n')
    expect(lines).toHaveLength(3) // header + 2 rows
  })

  test('correctly outputs daysUsed and totalTrips as plain numbers', () => {
    const csv = generateComplianceCsv([makeEmployee({ daysUsed: 45, totalTrips: 5 })])
    expect(csv).toContain('45')
    expect(csv).toContain('5')
  })

  test('includes riskLevel in output', () => {
    const csv = generateComplianceCsv([makeEmployee({ riskLevel: 'amber' })])
    const dataLine = csv.slice(1).split('\n')[1]
    const cols = dataLine.split(',')
    expect(cols[8]).toBe('amber')
  })

  test('high-risk employee status emitted correctly', () => {
    const csv = generateComplianceCsv([makeEmployee({ status: 'High Risk', riskLevel: 'red' })])
    expect(csv).toContain('High Risk')
    expect(csv).toContain('red')
  })
})

// ─── getComplianceCsvFilename ────────────────────────────────────────────────

describe('getComplianceCsvFilename', () => {
  test('returns filename with correct prefix', () => {
    const filename = getComplianceCsvFilename(new Date('2026-04-06'))
    expect(filename).toBe('complyeur_compliance_report_2026-04-06.csv')
  })

  test('returns a .csv extension', () => {
    const filename = getComplianceCsvFilename(new Date('2025-01-01'))
    expect(filename.endsWith('.csv')).toBe(true)
  })

  test('defaults to current date when no argument provided', () => {
    const filename = getComplianceCsvFilename()
    expect(filename).toMatch(/^complyeur_compliance_report_\d{4}-\d{2}-\d{2}\.csv$/)
  })
})

// ─── generateTripHistoryCsv ──────────────────────────────────────────────────

describe('generateTripHistoryCsv', () => {
  const trips = [
    {
      entryDate: parseISO('2026-01-10'),
      exitDate: parseISO('2026-01-17'),
      country: 'Germany',
      days: 8,
      purpose: 'Business meeting',
    },
  ]

  test('starts with UTF-8 BOM', () => {
    const csv = generateTripHistoryCsv('Jane Smith', trips)
    expect(csv.startsWith(UTF8_BOM)).toBe(true)
  })

  test('includes employee name in first line', () => {
    const csv = generateTripHistoryCsv('Jane Smith', trips)
    expect(csv).toContain('Jane Smith')
  })

  test('includes trip history column headers', () => {
    const csv = generateTripHistoryCsv('Jane Smith', trips)
    expect(csv).toContain('Entry Date')
    expect(csv).toContain('Exit Date')
    expect(csv).toContain('Country')
    expect(csv).toContain('Days')
    expect(csv).toContain('Purpose')
  })

  test('formats trip dates as YYYY-MM-DD', () => {
    const csv = generateTripHistoryCsv('Jane Smith', trips)
    expect(csv).toContain('2026-01-10')
    expect(csv).toContain('2026-01-17')
  })

  test('includes trip country and purpose', () => {
    const csv = generateTripHistoryCsv('Jane Smith', trips)
    expect(csv).toContain('Germany')
    expect(csv).toContain('Business meeting')
  })

  test('handles null purpose as empty string', () => {
    const tripsWithNullPurpose = [{ ...trips[0], purpose: null }]
    const csv = generateTripHistoryCsv('Jane Smith', tripsWithNullPurpose)
    // Should not throw and should produce valid CSV
    expect(csv).toContain('Germany')
  })

  test('sanitizes employee name against CSV injection', () => {
    const csv = generateTripHistoryCsv('=MALICIOUS()', trips)
    expect(csv).toContain("'=MALICIOUS()")
  })

  test('handles multiple trips', () => {
    const multiTrips = [
      { entryDate: parseISO('2026-01-10'), exitDate: parseISO('2026-01-17'), country: 'DE', days: 8, purpose: null },
      { entryDate: parseISO('2026-02-01'), exitDate: parseISO('2026-02-05'), country: 'FR', days: 5, purpose: 'Conference' },
    ]
    const csv = generateTripHistoryCsv('Jane Smith', multiTrips)
    expect(csv).toContain('DE')
    expect(csv).toContain('FR')
    expect(csv).toContain('Conference')
  })
})

// ─── validateCsvContent ──────────────────────────────────────────────────────

describe('validateCsvContent', () => {
  test('returns true for a valid compliance CSV', () => {
    const csv = generateComplianceCsv([makeEmployee()])
    expect(validateCsvContent(csv)).toBe(true)
  })

  test('returns true for header-only CSV (empty data)', () => {
    const csv = generateComplianceCsv([])
    expect(validateCsvContent(csv)).toBe(true)
  })

  test('returns false when BOM is missing', () => {
    const csv = generateComplianceCsv([makeEmployee()])
    const noBom = csv.slice(1) // strip BOM
    expect(validateCsvContent(noBom)).toBe(false)
  })

  test('returns false for empty string', () => {
    expect(validateCsvContent('')).toBe(false)
  })

  test('returns false when column count is wrong', () => {
    // BOM + header with wrong number of columns
    const invalidCsv = UTF8_BOM + 'Col1,Col2,Col3\nval1,val2,val3'
    expect(validateCsvContent(invalidCsv)).toBe(false)
  })

  test('returns false for BOM-only string', () => {
    expect(validateCsvContent(UTF8_BOM)).toBe(false)
  })
})

// ─── generateFutureAlertsCsv ─────────────────────────────────────────────────

describe('generateFutureAlertsCsv', () => {
  test('starts with UTF-8 BOM', () => {
    const csv = generateFutureAlertsCsv([makeFutureAlert()])
    expect(csv.startsWith(UTF8_BOM)).toBe(true)
  })

  test('contains all 11 headers', () => {
    const csv = generateFutureAlertsCsv([makeFutureAlert()])
    const headerLine = csv.slice(1).split('\n')[0]
    const headers = headerLine.split(',')
    expect(headers).toHaveLength(11)
    expect(headers).toContain('Employee Name')
    expect(headers).toContain('Country')
    expect(headers).toContain('Entry Date')
    expect(headers).toContain('Exit Date')
    expect(headers).toContain('Trip Duration')
    expect(headers).toContain('Days Used Before')
    expect(headers).toContain('Days After Trip')
    expect(headers).toContain('Days Remaining')
    expect(headers).toContain('Status')
    expect(headers).toContain('Compliant')
    expect(headers).toContain('Safe From Date')
  })

  test('formats isCompliant as "Yes" when true', () => {
    const csv = generateFutureAlertsCsv([makeFutureAlert({ isCompliant: true })])
    const dataLine = csv.slice(1).split('\n')[1]
    expect(dataLine).toContain('Yes')
  })

  test('formats isCompliant as "No" when false', () => {
    const csv = generateFutureAlertsCsv([makeFutureAlert({ isCompliant: false })])
    const dataLine = csv.slice(1).split('\n')[1]
    expect(dataLine).toContain('No')
  })

  test('emits empty string for null compliantFromDate', () => {
    const csv = generateFutureAlertsCsv([makeFutureAlert({ compliantFromDate: null })])
    const dataLine = csv.slice(1).split('\n')[1]
    const cols = dataLine.split(',')
    expect(cols[10]).toBe('') // Safe From Date column
  })

  test('includes compliantFromDate when present', () => {
    const csv = generateFutureAlertsCsv([
      makeFutureAlert({ compliantFromDate: parseISO('2026-09-15') }),
    ])
    expect(csv).toContain('2026-09-15')
  })

  test('formats entry and exit dates as YYYY-MM-DD', () => {
    const csv = generateFutureAlertsCsv([makeFutureAlert()])
    expect(csv).toContain('2026-06-01')
    expect(csv).toContain('2026-06-07')
  })

  test('sanitizes employee name against CSV injection', () => {
    const csv = generateFutureAlertsCsv([makeFutureAlert({ employeeName: '@formula' })])
    expect(csv).toContain("'@formula")
  })

  test('produces one data row per alert', () => {
    const csv = generateFutureAlertsCsv([
      makeFutureAlert(),
      makeFutureAlert({ tripId: 'trip-2', employeeName: 'Bob' }),
    ])
    const lines = csv.slice(1).split('\n')
    expect(lines).toHaveLength(3) // header + 2 data rows
  })

  test('outputs empty CSV (header only) for empty array', () => {
    const csv = generateFutureAlertsCsv([])
    const lines = csv.slice(1).split('\n')
    expect(lines).toHaveLength(1)
  })

  test('includes numeric fields as plain numbers', () => {
    const csv = generateFutureAlertsCsv([makeFutureAlert({ tripDuration: 14, daysRemaining: 63 })])
    expect(csv).toContain('14')
    expect(csv).toContain('63')
  })

  test('status "Critical" emits correctly', () => {
    const csv = generateFutureAlertsCsv([makeFutureAlert({ status: 'Critical' })])
    expect(csv).toContain('Critical')
  })
})

// ─── getFutureAlertsCsvFilename ──────────────────────────────────────────────

describe('getFutureAlertsCsvFilename', () => {
  test('returns filename with correct prefix', () => {
    const filename = getFutureAlertsCsvFilename(new Date('2026-04-06'))
    expect(filename).toBe('complyeur_future_alerts_2026-04-06.csv')
  })

  test('returns a .csv extension', () => {
    const filename = getFutureAlertsCsvFilename(new Date('2025-06-15'))
    expect(filename.endsWith('.csv')).toBe(true)
  })

  test('defaults to current date when no argument provided', () => {
    const filename = getFutureAlertsCsvFilename()
    expect(filename).toMatch(/^complyeur_future_alerts_\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
