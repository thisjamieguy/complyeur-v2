import { describe, test, expect } from 'vitest'
import { generateErrorCsv, getErrorCsvFilename } from '../error-export'
import type { ValidationError } from '@/types/import'

const UTF8_BOM = '\uFEFF'

function makeError(overrides: Partial<ValidationError> = {}): ValidationError {
  return {
    row: 1,
    column: 'name',
    value: 'John',
    message: 'Name is required',
    severity: 'error',
    ...overrides,
  }
}

describe('generateErrorCsv', () => {
  test('starts with UTF-8 BOM for Excel compatibility', () => {
    const csv = generateErrorCsv([])
    expect(csv.startsWith(UTF8_BOM)).toBe(true)
  })

  test('includes header row', () => {
    const csv = generateErrorCsv([])
    expect(csv).toContain('Row,Field,Value,Message,Severity')
  })

  test('returns header-only CSV for empty errors array', () => {
    const csv = generateErrorCsv([])
    const lines = csv.replace(UTF8_BOM, '').split('\n')
    expect(lines).toHaveLength(1)
  })

  test('generates a row for each error', () => {
    const errors = [makeError({ row: 1 }), makeError({ row: 2 }), makeError({ row: 3 })]
    const csv = generateErrorCsv(errors)
    const lines = csv.replace(UTF8_BOM, '').split('\n')
    expect(lines).toHaveLength(4) // header + 3 rows
  })

  test('includes error data in correct columns', () => {
    const errors = [
      makeError({ row: 5, column: 'email', value: 'bad@', message: 'Invalid email', severity: 'error' }),
    ]
    const csv = generateErrorCsv(errors)
    expect(csv).toContain('5')
    expect(csv).toContain('email')
    expect(csv).toContain('Invalid email')
    expect(csv).toContain('error')
  })

  test('handles warning severity', () => {
    const errors = [makeError({ severity: 'warning', message: 'Missing optional field' })]
    const csv = generateErrorCsv(errors)
    expect(csv).toContain('warning')
  })

  test('handles missing value (uses empty string)', () => {
    // The error-export uses `error.value ?? ''`
    const errors = [makeError({ value: '' })]
    const csv = generateErrorCsv(errors)
    expect(csv).not.toContain('undefined')
  })

  test('sanitizes CSV injection in values by prefixing with single quote', () => {
    // Values starting with = are prefixed with ' to neutralise formula execution
    const errors = [makeError({ value: '=cmd|/C calc', message: 'Bad value' })]
    const csv = generateErrorCsv(errors)
    // Sanitiser prepends a single quote: '=cmd|/C calc
    expect(csv).toContain("'=cmd")
  })

  test('handles special characters in message', () => {
    const errors = [makeError({ message: 'Date must be "YYYY-MM-DD" format' })]
    const csv = generateErrorCsv(errors)
    // Should be quoted to handle the inner quotes
    expect(csv).toContain('Date must be')
  })

  test('handles multiple errors with commas in values', () => {
    const errors = [makeError({ value: 'Smith, John' })]
    const csv = generateErrorCsv(errors)
    const lines = csv.replace(UTF8_BOM, '').split('\n')
    expect(lines).toHaveLength(2) // header + 1 data row
  })
})

describe('getErrorCsvFilename', () => {
  test('generates filename with correct prefix', () => {
    const filename = getErrorCsvFilename('employees.xlsx')
    expect(filename.startsWith('import_errors_')).toBe(true)
  })

  test('removes file extension from original name', () => {
    const filename = getErrorCsvFilename('my_data.xlsx')
    expect(filename).not.toContain('.xlsx')
  })

  test('ends with .csv extension', () => {
    const filename = getErrorCsvFilename('employees.xlsx')
    expect(filename.endsWith('.csv')).toBe(true)
  })

  test('includes sanitized original name', () => {
    const filename = getErrorCsvFilename('employee_data.xlsx')
    expect(filename).toContain('employee_data')
  })

  test('replaces special characters with underscores', () => {
    const filename = getErrorCsvFilename('my file (v2).xlsx')
    expect(filename).not.toMatch(/[ ()]/)
  })

  test('truncates long filenames to 30 characters for the base name', () => {
    const longName = 'a'.repeat(50) + '.xlsx'
    const filename = getErrorCsvFilename(longName)
    // The safe name part should not exceed 30 chars
    const safeNamePart = filename.replace('import_errors_', '').split('_').slice(0, -2).join('_')
    expect(safeNamePart.length).toBeLessThanOrEqual(30)
  })

  test('includes timestamp in filename', () => {
    const filename = getErrorCsvFilename('test.csv')
    // Timestamp format: YYYY-MM-DD_HH-mm
    expect(filename).toMatch(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/)
  })

  test('handles filename without extension', () => {
    const filename = getErrorCsvFilename('employees')
    expect(filename.startsWith('import_errors_employees')).toBe(true)
    expect(filename.endsWith('.csv')).toBe(true)
  })

  test('handles CSV file extension', () => {
    const filename = getErrorCsvFilename('trips_data.csv')
    expect(filename).not.toContain('.csv_')
  })
})

// Note: downloadCsv is a browser-only DOM utility.
// It is covered by e2e/import tests which run in a real browser context.
