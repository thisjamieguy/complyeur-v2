/**
 * Smoke test that verifies the gantt-parser barrel re-exports are intact.
 * This ensures lib/import/gantt-parser.ts is covered in the coverage report.
 */
import { describe, test, expect } from 'vitest'
import {
  parseGanttFormat,
  generateTripsFromGantt,
  generateTripsWithSummary,
  validateGanttData,
  previewGanttParse,
} from '@/lib/import/gantt-parser'

describe('gantt-parser barrel exports', () => {
  test('parseGanttFormat is exported and callable', () => {
    expect(typeof parseGanttFormat).toBe('function')
    const result = parseGanttFormat([], {})
    expect(result.success).toBe(false) // empty input → fails gracefully
  })

  test('generateTripsFromGantt is exported and callable', () => {
    expect(typeof generateTripsFromGantt).toBe('function')
    const result = generateTripsFromGantt({
      success: false,
      dateColumns: [],
      rows: [],
      referenceYear: 2025,
      ignoredColumns: [],
    })
    expect(result).toEqual([])
  })

  test('generateTripsWithSummary is exported and callable', () => {
    expect(typeof generateTripsWithSummary).toBe('function')
    const { trips, summary } = generateTripsWithSummary({
      success: false,
      dateColumns: [],
      rows: [],
      referenceYear: 2025,
      ignoredColumns: [],
    })
    expect(trips).toHaveLength(0)
    expect(summary.tripsCreated).toBe(0)
  })

  test('validateGanttData is exported and callable', () => {
    expect(typeof validateGanttData).toBe('function')
    const result = validateGanttData({
      success: false,
      error: 'test',
      dateColumns: [],
      rows: [],
      referenceYear: 2025,
      ignoredColumns: [],
    })
    expect(result.isValid).toBe(false)
  })

  test('previewGanttParse is exported and callable', () => {
    expect(typeof previewGanttParse).toBe('function')
    const result = previewGanttParse([['Employee', 'Notes']], { referenceYear: 2025 })
    expect(result).toHaveProperty('headers')
    expect(result).toHaveProperty('sampleRows')
  })
})
