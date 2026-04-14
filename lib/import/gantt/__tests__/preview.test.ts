import { describe, test, expect } from 'vitest'
import { previewGanttParse } from '../preview'

function makeData(employeeRows: string[][]): unknown[][] {
  const header = ['Employee', '2025-01-06', '2025-01-07', '2025-01-08']
  return [header, ...employeeRows]
}

describe('previewGanttParse', () => {
  test('returns headers and sample rows for valid data', () => {
    const data = makeData([['John Smith', 'FR', 'FR', 'DE']])
    const { headers, sampleRows } = previewGanttParse(data, { referenceYear: 2025 })

    expect(headers).toHaveLength(4) // Employee + 3 dates
    expect(sampleRows).toHaveLength(1)
    expect(sampleRows[0].name).toBe('John Smith')
  })

  test('classifies first column as name type', () => {
    const data = makeData([['John Smith', 'FR', 'FR', 'FR']])
    const { headers } = previewGanttParse(data, { referenceYear: 2025 })

    const nameCol = headers.find((h) => h.index === 0)
    expect(nameCol?.type).toBe('name')
  })

  test('classifies date columns as date type', () => {
    const data = makeData([['John Smith', 'FR', 'FR', 'FR']])
    const { headers } = previewGanttParse(data, { referenceYear: 2025 })

    const dateCols = headers.filter((h) => h.type === 'date')
    expect(dateCols.length).toBeGreaterThanOrEqual(3)
  })

  test('classifies non-date columns as ignored type', () => {
    const data: unknown[][] = [
      ['Employee', 'Notes', '2025-01-06', '2025-01-07', '2025-01-08'],
      ['John Smith', 'Some note', 'FR', 'FR', 'FR'],
    ]
    const { headers } = previewGanttParse(data, { referenceYear: 2025 })

    const ignoredCols = headers.filter((h) => h.type === 'ignored')
    expect(ignoredCols.length).toBeGreaterThan(0)
    expect(ignoredCols.some((h) => h.value === 'Notes')).toBe(true)
  })

  test('limits sample rows to 5', () => {
    const employeeRows = Array.from({ length: 10 }, (_, i) => [
      `Employee ${i}`,
      'FR',
      'FR',
      'FR',
    ])
    const data = makeData(employeeRows)
    const { sampleRows } = previewGanttParse(data, { referenceYear: 2025 })

    expect(sampleRows.length).toBeLessThanOrEqual(5)
  })

  test('returns cells with value and country for each sample row', () => {
    const data = makeData([['John Smith', 'FR', 'holiday', 'DE']])
    const { sampleRows } = previewGanttParse(data, { referenceYear: 2025 })

    expect(sampleRows[0].cells.length).toBeGreaterThan(0)
    const frCell = sampleRows[0].cells.find((c) => c.country === 'FR')
    expect(frCell).toBeDefined()
  })

  test('returns empty sampleRows when parse fails', () => {
    const data: unknown[][] = [
      ['Employee', 'Notes', 'Manager'],
      ['John Smith', 'note', 'Jane'],
    ]
    const { sampleRows } = previewGanttParse(data, { referenceYear: 2025 })
    expect(sampleRows).toHaveLength(0)
  })

  test('maps header index and value correctly', () => {
    const data = makeData([['John Smith', 'FR', 'FR', 'FR']])
    const { headers } = previewGanttParse(data, { referenceYear: 2025 })

    expect(headers[0].index).toBe(0)
    expect(headers[0].value).toBe('Employee')
    expect(headers[1].value).toBe('2025-01-06')
  })
})
