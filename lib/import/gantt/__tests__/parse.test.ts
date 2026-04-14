import { describe, test, expect } from 'vitest'
import { parseGanttFormat } from '../parse'

/**
 * Creates a data array with ISO date headers (at least 3 for detection)
 * and the given employee rows.
 */
function makeData(employeeRows: string[][]): unknown[][] {
  const header = ['Employee', '2025-01-06', '2025-01-07', '2025-01-08']
  return [header, ...employeeRows]
}

describe('parseGanttFormat', () => {
  describe('input validation', () => {
    test('returns error for null input', () => {
      const result = parseGanttFormat(null as unknown as unknown[][], {})
      expect(result.success).toBe(false)
      expect(result.error).toContain('at least a header row')
    })

    test('returns error for empty array', () => {
      const result = parseGanttFormat([], {})
      expect(result.success).toBe(false)
      expect(result.error).toContain('at least a header row')
    })

    test('returns error for single row (header only, no data)', () => {
      const result = parseGanttFormat([['Employee', '2025-01-06']], {})
      expect(result.success).toBe(false)
    })

    test('returns error when no date columns found', () => {
      const result = parseGanttFormat(
        [
          ['Employee', 'Notes', 'Manager'],
          ['John Smith', 'Some note', 'Jane'],
        ],
        {}
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('No date columns found')
    })

    test('returns error when no employee rows found', () => {
      const result = parseGanttFormat(
        [['Employee', '2025-01-06', '2025-01-07', '2025-01-08']],
        {}
      )
      expect(result.success).toBe(false)
    })
  })

  describe('successful parsing', () => {
    test('parses basic employee data', () => {
      const data = makeData([['John Smith', 'FR', 'FR', 'DE']])
      const result = parseGanttFormat(data, { referenceYear: 2025 })
      expect(result.success).toBe(true)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].employeeName).toBe('John Smith')
    })

    test('parses multiple employees', () => {
      const data = makeData([
        ['John Smith', 'FR', 'FR', 'FR'],
        ['Jane Doe', 'DE', 'DE', 'UK'],
      ])
      const result = parseGanttFormat(data, { referenceYear: 2025 })
      expect(result.success).toBe(true)
      expect(result.rows).toHaveLength(2)
    })

    test('returns correct date columns', () => {
      const data = makeData([['John Smith', 'FR', 'FR', 'FR']])
      const result = parseGanttFormat(data, { referenceYear: 2025 })
      expect(result.success).toBe(true)
      expect(result.dateColumns.length).toBeGreaterThanOrEqual(3)
    })

    test('sorts date columns chronologically', () => {
      // Put dates out of order in header
      const data: unknown[][] = [
        ['Employee', '2025-01-08', '2025-01-06', '2025-01-07'],
        ['John Smith', 'FR', 'DE', 'IT'],
      ]
      const result = parseGanttFormat(data, { referenceYear: 2025 })
      expect(result.success).toBe(true)
      const dates = result.dateColumns.map((dc) => dc.date.date)
      expect(dates[0]! < dates[1]!).toBe(true)
      expect(dates[1]! < dates[2]!).toBe(true)
    })

    test('skips rows with empty employee names', () => {
      const data = makeData([
        ['John Smith', 'FR', 'FR', 'FR'],
        ['', 'DE', 'DE', 'DE'],
        ['Jane Doe', 'IT', 'IT', 'IT'],
      ])
      const result = parseGanttFormat(data, { referenceYear: 2025 })
      expect(result.success).toBe(true)
      expect(result.rows).toHaveLength(2)
    })

    test('skips "Employee" header row if repeated in data', () => {
      const data = makeData([
        ['Employee', '2025-01-06', '2025-01-07', '2025-01-08'],
        ['John Smith', 'FR', 'FR', 'FR'],
      ])
      const result = parseGanttFormat(data, { referenceYear: 2025 })
      expect(result.success).toBe(true)
      const names = result.rows.map((r) => r.employeeName)
      expect(names).not.toContain('Employee')
    })

    test('skips rows with only numbers (week numbers)', () => {
      const data = makeData([
        ['1', 'FR', 'FR', 'FR'],
        ['John Smith', 'DE', 'DE', 'DE'],
      ])
      const result = parseGanttFormat(data, { referenceYear: 2025 })
      expect(result.success).toBe(true)
      expect(result.rows.every((r) => r.employeeName === 'John Smith')).toBe(true)
    })

    test('detects email column', () => {
      const data: unknown[][] = [
        ['Employee', 'Email', '2025-01-06', '2025-01-07', '2025-01-08'],
        ['John Smith', 'john@example.com', 'FR', 'FR', 'FR'],
      ]
      const result = parseGanttFormat(data, { referenceYear: 2025 })
      expect(result.success).toBe(true)
      expect(result.rows[0].email).toBe('john@example.com')
    })

    test('includes ignored columns in result', () => {
      const data: unknown[][] = [
        ['Employee', 'Notes', '2025-01-06', '2025-01-07', '2025-01-08'],
        ['John Smith', 'Some note', 'FR', 'FR', 'FR'],
      ]
      const result = parseGanttFormat(data, { referenceYear: 2025 })
      expect(result.success).toBe(true)
      expect(result.ignoredColumns.length).toBeGreaterThan(0)
      expect(result.ignoredColumns.some((c) => c.header === 'Notes')).toBe(true)
    })

    test('parses cells for each date column', () => {
      const data = makeData([['John Smith', 'FR', 'holiday', 'DE']])
      const result = parseGanttFormat(data, { referenceYear: 2025 })
      expect(result.success).toBe(true)
      expect(result.rows[0].cells).toHaveLength(result.dateColumns.length)
    })

    test('stores referenceYear in result', () => {
      const data = makeData([['John Smith', 'FR', 'FR', 'FR']])
      const result = parseGanttFormat(data, { referenceYear: 2024 })
      expect(result.referenceYear).toBe(2024)
    })
  })
})
