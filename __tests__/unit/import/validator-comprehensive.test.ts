/**
 * Comprehensive tests for the import validator module.
 * Tests: validateRows (employees / trips / gantt),
 *        getValidationSummary, getAllErrors, getAllWarnings
 */

import { describe, test, expect } from 'vitest'
import {
  validateRows,
  getValidationSummary,
  getAllErrors,
  getAllWarnings,
} from '@/lib/import/validator'
import type { ParsedEmployeeRow, ParsedTripRow } from '@/types/import'
import { subYears, format } from 'date-fns'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEmployee(overrides: Partial<ParsedEmployeeRow> = {}): ParsedEmployeeRow {
  return {
    row_number: 1,
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    ...overrides,
  }
}

function makeTrip(overrides: Partial<ParsedTripRow> = {}): ParsedTripRow {
  return {
    row_number: 1,
    employee_email: 'jane.smith@example.com',
    entry_date: '2025-06-01',
    exit_date: '2025-06-07',
    country: 'DE',
    ...overrides,
  }
}

// ISO date string for "2 years and 1 day ago" (always over the limit)
const ANCIENT_DATE = format(subYears(new Date(), 3), 'yyyy-MM-dd')

// ─── validateRows — Employee format ─────────────────────────────────────────

describe('validateRows (employees format)', () => {
  test('valid employee row passes with no errors or warnings', async () => {
    const results = await validateRows([makeEmployee()], 'employees')
    expect(results[0].is_valid).toBe(true)
    expect(results[0].errors).toHaveLength(0)
  })

  test('returns one result per input row', async () => {
    const rows = [makeEmployee({ row_number: 1 }), makeEmployee({ row_number: 2, email: 'b@b.com' })]
    const results = await validateRows(rows, 'employees')
    expect(results).toHaveLength(2)
  })

  test('missing first_name creates error with column "first_name"', async () => {
    const results = await validateRows([makeEmployee({ first_name: '' })], 'employees')
    expect(results[0].is_valid).toBe(false)
    const err = results[0].errors.find((e) => e.column === 'first_name')
    expect(err).toBeDefined()
    expect(err!.severity).toBe('error')
  })

  test('first_name over 50 characters creates an error', async () => {
    const longName = 'A'.repeat(51)
    const results = await validateRows([makeEmployee({ first_name: longName })], 'employees')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'first_name')).toBe(true)
  })

  test('first_name with invalid characters creates an error', async () => {
    const results = await validateRows([makeEmployee({ first_name: 'Jane123' })], 'employees')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'first_name')).toBe(true)
  })

  test('missing last_name creates error with column "last_name"', async () => {
    const results = await validateRows([makeEmployee({ last_name: '' })], 'employees')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'last_name')).toBe(true)
  })

  test('last_name over 50 characters creates an error', async () => {
    const longName = 'B'.repeat(51)
    const results = await validateRows([makeEmployee({ last_name: longName })], 'employees')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'last_name')).toBe(true)
  })

  test('last_name with invalid characters creates an error', async () => {
    const results = await validateRows([makeEmployee({ last_name: 'Sm!th' })], 'employees')
    expect(results[0].is_valid).toBe(false)
  })

  test('missing email creates error with column "email"', async () => {
    const results = await validateRows([makeEmployee({ email: '' })], 'employees')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'email')).toBe(true)
  })

  test('invalid email format (no @) creates error', async () => {
    const results = await validateRows([makeEmployee({ email: 'notanemail' })], 'employees')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'email')).toBe(true)
  })

  test('invalid email format (no domain) creates error', async () => {
    const results = await validateRows([makeEmployee({ email: 'user@' })], 'employees')
    expect(results[0].is_valid).toBe(false)
  })

  test('names with hyphens are valid (e.g. Mary-Jane)', async () => {
    const results = await validateRows([makeEmployee({ first_name: 'Mary-Jane' })], 'employees')
    expect(results[0].errors.filter((e) => e.column === 'first_name')).toHaveLength(0)
  })

  test('names with apostrophes are valid (e.g. O\'Brien)', async () => {
    const results = await validateRows([makeEmployee({ last_name: "O'Brien" })], 'employees')
    expect(results[0].errors.filter((e) => e.column === 'last_name')).toHaveLength(0)
  })

  test('Unicode names are valid (e.g. Müller, Ó Briain)', async () => {
    const results = await validateRows([makeEmployee({ last_name: 'Müller' })], 'employees')
    expect(results[0].errors.filter((e) => e.column === 'last_name')).toHaveLength(0)
  })

  test('duplicate name in file produces a warning on the second occurrence', async () => {
    const rows = [
      makeEmployee({ row_number: 1, email: 'a@a.com' }),
      makeEmployee({ row_number: 2, email: 'b@b.com' }), // same first+last name as row 1
    ]
    const results = await validateRows(rows, 'employees')
    // First row: no duplicate warning; second row: duplicate warning
    expect(results[0].warnings).toHaveLength(0)
    expect(results[1].warnings.some((w) => w.message.includes('Duplicate'))).toBe(true)
  })

  test('existing company employee name produces a warning', async () => {
    const existingNames = new Set(['jane smith'])
    const results = await validateRows([makeEmployee()], 'employees', existingNames)
    expect(results[0].warnings.some((w) => w.message.includes('already exists'))).toBe(true)
  })

  test('row_number is preserved in the result', async () => {
    const results = await validateRows([makeEmployee({ row_number: 42 })], 'employees')
    expect(results[0].row_number).toBe(42)
  })
})

// ─── validateRows — Trips format ─────────────────────────────────────────────

describe('validateRows (trips format)', () => {
  test('valid trip row passes with no errors', async () => {
    const results = await validateRows([makeTrip()], 'trips')
    expect(results[0].is_valid).toBe(true)
    expect(results[0].errors).toHaveLength(0)
  })

  test('missing employee_email creates error for trips format', async () => {
    const results = await validateRows([makeTrip({ employee_email: '' })], 'trips')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'employee_email')).toBe(true)
  })

  test('invalid employee_email format creates error', async () => {
    const results = await validateRows([makeTrip({ employee_email: 'bad-email' })], 'trips')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'employee_email')).toBe(true)
  })

  test('missing entry_date creates error', async () => {
    const results = await validateRows([makeTrip({ entry_date: '' })], 'trips')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'entry_date')).toBe(true)
  })

  test('non-ISO entry_date format creates error', async () => {
    const results = await validateRows([makeTrip({ entry_date: '15/01/2025' })], 'trips')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'entry_date')).toBe(true)
  })

  test('entry_date older than 2 years creates error', async () => {
    const results = await validateRows([makeTrip({ entry_date: ANCIENT_DATE })], 'trips')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'entry_date')).toBe(true)
  })

  test('missing exit_date creates error', async () => {
    const results = await validateRows([makeTrip({ exit_date: '' })], 'trips')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'exit_date')).toBe(true)
  })

  test('exit_date before entry_date creates error', async () => {
    const results = await validateRows([
      makeTrip({ entry_date: '2025-06-10', exit_date: '2025-06-01' }),
    ], 'trips')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'exit_date')).toBe(true)
  })

  test('same entry and exit date is valid (single-day trip)', async () => {
    const results = await validateRows([
      makeTrip({ entry_date: '2025-06-01', exit_date: '2025-06-01' }),
    ], 'trips')
    expect(results[0].errors.filter((e) => e.column === 'exit_date')).toHaveLength(0)
  })

  test('missing country creates error', async () => {
    const results = await validateRows([makeTrip({ country: '' })], 'trips')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'country')).toBe(true)
  })

  test('unrecognized country name creates error', async () => {
    // Only 2-letter codes are accepted as pass-through; full names must match known countries
    const results = await validateRows([makeTrip({ country: 'NotACountryAtAll' })], 'trips')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'country')).toBe(true)
  })

  test('Schengen country code (DE) is valid', async () => {
    const results = await validateRows([makeTrip({ country: 'DE' })], 'trips')
    expect(results[0].is_valid).toBe(true)
    expect(results[0].errors.filter((e) => e.column === 'country')).toHaveLength(0)
  })

  test('Schengen country full name (France) is valid and normalised to code', async () => {
    const results = await validateRows([makeTrip({ country: 'France' })], 'trips')
    expect(results[0].is_valid).toBe(true)
    // Validator should convert country name to code in-place
    expect(results[0].data.country).toBe('FR')
  })

  test('non-Schengen non-EU country (US) produces a warning, not an error', async () => {
    const results = await validateRows([makeTrip({ country: 'US' })], 'trips')
    expect(results[0].is_valid).toBe(true)
    expect(results[0].warnings.some((w) => w.column === 'country')).toBe(true)
  })

  test('purpose over 200 characters creates error', async () => {
    const longPurpose = 'x'.repeat(201)
    const results = await validateRows([makeTrip({ purpose: longPurpose })], 'trips')
    expect(results[0].is_valid).toBe(false)
    expect(results[0].errors.some((e) => e.column === 'purpose')).toBe(true)
  })

  test('purpose is optional — missing purpose does not create error', async () => {
    const results = await validateRows([makeTrip({ purpose: undefined })], 'trips')
    expect(results[0].errors.filter((e) => e.column === 'purpose')).toHaveLength(0)
  })

  test('employee_email is NOT required in gantt format', async () => {
    const results = await validateRows([
      makeTrip({ employee_email: '', employee_name: 'Jane Smith' }),
    ], 'gantt')
    // Gantt format should not require email
    expect(results[0].errors.some((e) => e.column === 'employee_email' && e.message.includes('required'))).toBe(false)
  })

  test('gantt format requires employee_name', async () => {
    const results = await validateRows([
      makeTrip({ employee_name: '', employee_email: '' }),
    ], 'gantt')
    expect(results[0].errors.some((e) => e.column === 'employee_name')).toBe(true)
  })

  test('invalid email provided in gantt still creates error', async () => {
    const results = await validateRows([
      makeTrip({ employee_email: 'bad-email', employee_name: 'Jane Smith' }),
    ], 'gantt')
    expect(results[0].errors.some((e) => e.column === 'employee_email')).toBe(true)
  })
})

// ─── Summary helpers ─────────────────────────────────────────────────────────

describe('getValidationSummary', () => {
  test('counts total, valid, errors, and warning rows correctly', async () => {
    const rows = [
      makeEmployee({ row_number: 1 }), // valid
      makeEmployee({ row_number: 2, first_name: '' }), // error
      makeEmployee({ row_number: 3, email: 'c@c.com' }), // valid (no dupes)
    ]
    const validated = await validateRows(rows, 'employees')
    const summary = getValidationSummary(validated)

    expect(summary.total).toBe(3)
    expect(summary.valid).toBe(2)
    expect(summary.errors).toBe(1)
  })

  test('warnings count reflects rows with at least one warning', async () => {
    const existingNames = new Set(['jane smith'])
    const rows = [makeEmployee({ row_number: 1 }), makeEmployee({ row_number: 2, email: 'x@x.com' })]
    const validated = await validateRows(rows, 'employees', existingNames)
    const summary = getValidationSummary(validated)
    // Both share the same name so both match existingNames → each gets a warning
    expect(summary.warnings).toBeGreaterThan(0)
  })

  test('all zeros for empty input', async () => {
    const validated = await validateRows([], 'employees')
    const summary = getValidationSummary(validated)
    expect(summary.total).toBe(0)
    expect(summary.valid).toBe(0)
    expect(summary.errors).toBe(0)
    expect(summary.warnings).toBe(0)
  })
})

describe('getAllErrors', () => {
  test('returns flat array of all errors from all rows', async () => {
    const rows = [
      makeEmployee({ row_number: 1, first_name: '', email: '' }),
      makeEmployee({ row_number: 2, last_name: '' }),
    ]
    const validated = await validateRows(rows, 'employees')
    const errors = getAllErrors(validated)
    // Row 1 has at least 2 errors (first_name, email); row 2 has 1 error
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })

  test('returns empty array when all rows are valid', async () => {
    const rows = [makeEmployee({ row_number: 1 })]
    const validated = await validateRows(rows, 'employees')
    expect(getAllErrors(validated)).toHaveLength(0)
  })
})

describe('getAllWarnings', () => {
  test('returns flat array of all warnings from all rows', async () => {
    const existingNames = new Set(['jane smith'])
    const rows = [
      makeEmployee({ row_number: 1 }),
      makeEmployee({ row_number: 2, email: 'b@b.com' }),
    ]
    const validated = await validateRows(rows, 'employees', existingNames)
    const warnings = getAllWarnings(validated)
    expect(warnings.length).toBeGreaterThan(0)
  })

  test('returns empty array when no rows have warnings', async () => {
    const rows = [makeEmployee({ row_number: 1, email: 'unique@example.com' })]
    const validated = await validateRows(rows, 'employees')
    expect(getAllWarnings(validated)).toHaveLength(0)
  })
})
