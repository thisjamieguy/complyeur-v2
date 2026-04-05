import { describe, test, expect } from 'vitest'
import {
  exportScopeSchema,
  exportFormatSchema,
  statusFilterSchema,
  alertsFilterSchema,
  exportOptionsSchema,
} from '@/lib/validations/exports'

const validDateRange = { start: '2025-01-01', end: '2025-12-31' }

describe('exportScopeSchema', () => {
  test.each(['all', 'single', 'filtered', 'future-alerts'])('accepts "%s"', (scope) => {
    expect(exportScopeSchema.parse(scope)).toBe(scope)
  })

  test('rejects invalid scope', () => {
    expect(() => exportScopeSchema.parse('invalid')).toThrow()
  })
})

describe('exportFormatSchema', () => {
  test('accepts csv', () => expect(exportFormatSchema.parse('csv')).toBe('csv'))
  test('accepts pdf', () => expect(exportFormatSchema.parse('pdf')).toBe('pdf'))
  test('rejects invalid format', () => {
    expect(() => exportFormatSchema.parse('xlsx')).toThrow()
  })
})

describe('statusFilterSchema', () => {
  test.each(['compliant', 'at-risk', 'non-compliant'])('accepts "%s"', (status) => {
    expect(statusFilterSchema.parse(status)).toBe(status)
  })

  test('rejects invalid status', () => {
    expect(() => statusFilterSchema.parse('warning')).toThrow()
  })
})

describe('alertsFilterSchema', () => {
  test.each(['all', 'at-risk', 'critical'])('accepts "%s"', (filter) => {
    expect(alertsFilterSchema.parse(filter)).toBe(filter)
  })

  test('rejects invalid alerts filter', () => {
    expect(() => alertsFilterSchema.parse('low')).toThrow()
  })
})

describe('exportOptionsSchema', () => {
  describe('valid inputs', () => {
    test('accepts all-scope export', () => {
      const result = exportOptionsSchema.parse({
        scope: 'all',
        dateRange: validDateRange,
        format: 'csv',
      })
      expect(result.scope).toBe('all')
      expect(result.format).toBe('csv')
    })

    test('accepts single-scope export with employeeId', () => {
      const result = exportOptionsSchema.parse({
        scope: 'single',
        employeeId: '123e4567-e89b-12d3-a456-426614174000',
        dateRange: validDateRange,
        format: 'pdf',
      })
      expect(result.scope).toBe('single')
      expect(result.employeeId).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    test('accepts filtered-scope export with statusFilter', () => {
      const result = exportOptionsSchema.parse({
        scope: 'filtered',
        statusFilter: 'at-risk',
        dateRange: validDateRange,
        format: 'csv',
      })
      expect(result.statusFilter).toBe('at-risk')
    })

    test('accepts future-alerts scope with alertsFilter', () => {
      const result = exportOptionsSchema.parse({
        scope: 'future-alerts',
        alertsFilter: 'critical',
        dateRange: validDateRange,
        format: 'csv',
      })
      expect(result.alertsFilter).toBe('critical')
    })

    test('accepts same start and end date', () => {
      const result = exportOptionsSchema.parse({
        scope: 'all',
        dateRange: { start: '2025-06-01', end: '2025-06-01' },
        format: 'csv',
      })
      expect(result.dateRange.start).toBe('2025-06-01')
    })
  })

  describe('date range validation', () => {
    test('rejects end date before start date', () => {
      expect(() =>
        exportOptionsSchema.parse({
          scope: 'all',
          dateRange: { start: '2025-12-31', end: '2025-01-01' },
          format: 'csv',
        })
      ).toThrow()
    })

    test('rejects non-ISO date format', () => {
      expect(() =>
        exportOptionsSchema.parse({
          scope: 'all',
          dateRange: { start: '01/01/2025', end: '31/12/2025' },
          format: 'csv',
        })
      ).toThrow()
    })

    test('rejects invalid date value', () => {
      expect(() =>
        exportOptionsSchema.parse({
          scope: 'all',
          dateRange: { start: '2025-13-99', end: '2025-12-31' },
          format: 'csv',
        })
      ).toThrow()
    })
  })

  describe('single scope validation', () => {
    test('rejects single scope without employeeId', () => {
      expect(() =>
        exportOptionsSchema.parse({
          scope: 'single',
          dateRange: validDateRange,
          format: 'csv',
        })
      ).toThrow('Employee ID is required for single employee exports')
    })

    test('rejects invalid UUID for employeeId', () => {
      expect(() =>
        exportOptionsSchema.parse({
          scope: 'single',
          employeeId: 'not-a-uuid',
          dateRange: validDateRange,
          format: 'csv',
        })
      ).toThrow()
    })

    test('all scope does not require employeeId', () => {
      expect(() =>
        exportOptionsSchema.parse({
          scope: 'all',
          dateRange: validDateRange,
          format: 'csv',
        })
      ).not.toThrow()
    })
  })
})
