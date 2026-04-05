import { describe, test, expect } from 'vitest'
import { generateTripsFromGantt, generateTripsWithSummary } from '../trips'
import type { GanttParseResult } from '../types'

function makeDateColumn(date: string, index: number) {
  return {
    index,
    header: date,
    date: { date, original: date, format: 'ISO' as const, isAmbiguous: false, confidence: 'high' as const },
  }
}

function makeCell(countryCode: string | null, isSchengen = false, rawValue = '') {
  return {
    rowIndex: 0,
    colIndex: 0,
    rawValue: rawValue || countryCode || '',
    countryCode,
    isSchengen,
    isTravelDay: false,
    countsAsDay: !!countryCode,
  }
}

function makeResult(rows: GanttParseResult['rows'], dateColumns = [
  makeDateColumn('2025-01-06', 0),
  makeDateColumn('2025-01-07', 1),
  makeDateColumn('2025-01-08', 2),
]): GanttParseResult {
  return {
    success: true,
    dateColumns,
    rows,
    referenceYear: 2025,
    ignoredColumns: [],
  }
}

describe('generateTripsFromGantt', () => {
  test('returns empty array for failed parse result', () => {
    const result = generateTripsFromGantt({
      success: false,
      dateColumns: [],
      rows: [],
      referenceYear: 2025,
      ignoredColumns: [],
    })
    expect(result).toEqual([])
  })

  test('returns empty array when no rows', () => {
    const result = generateTripsFromGantt(makeResult([]))
    expect(result).toEqual([])
  })

  test('generates single trip for consecutive same-country days', () => {
    const rows = [{
      index: 0,
      employeeName: 'John Smith',
      cells: [
        makeCell('FR', true),
        makeCell('FR', true),
        makeCell('FR', true),
      ],
    }]
    const trips = generateTripsFromGantt(makeResult(rows))
    expect(trips).toHaveLength(1)
    expect(trips[0].country).toBe('FR')
    expect(trips[0].dayCount).toBe(3)
    expect(trips[0].employeeName).toBe('John Smith')
    expect(trips[0].entryDate).toBe('2025-01-06')
    expect(trips[0].exitDate).toBe('2025-01-08')
  })

  test('splits trip when country changes', () => {
    const rows = [{
      index: 0,
      employeeName: 'John Smith',
      cells: [
        makeCell('FR', true),
        makeCell('FR', true),
        makeCell('DE', true),
      ],
    }]
    const trips = generateTripsFromGantt(makeResult(rows))
    expect(trips).toHaveLength(2)
    expect(trips[0].country).toBe('FR')
    expect(trips[0].dayCount).toBe(2)
    expect(trips[1].country).toBe('DE')
    expect(trips[1].dayCount).toBe(1)
  })

  test('splits trip on non-travel day', () => {
    const rows = [{
      index: 0,
      employeeName: 'John Smith',
      cells: [
        makeCell('FR', true),
        makeCell(null),     // holiday
        makeCell('FR', true),
      ],
    }]
    const trips = generateTripsFromGantt(makeResult(rows))
    expect(trips).toHaveLength(2)
    expect(trips[0].dayCount).toBe(1)
    expect(trips[1].dayCount).toBe(1)
  })

  test('handles last trip correctly (end of row)', () => {
    const rows = [{
      index: 0,
      employeeName: 'Jane Doe',
      cells: [
        makeCell(null),
        makeCell('IT', true),
        makeCell('IT', true),
      ],
    }]
    const trips = generateTripsFromGantt(makeResult(rows))
    expect(trips).toHaveLength(1)
    expect(trips[0].country).toBe('IT')
    expect(trips[0].dayCount).toBe(2)
    expect(trips[0].entryDate).toBe('2025-01-07')
    expect(trips[0].exitDate).toBe('2025-01-08')
  })

  test('generates trips for multiple employees', () => {
    const rows = [
      {
        index: 0,
        employeeName: 'John Smith',
        cells: [makeCell('FR', true), makeCell('FR', true), makeCell(null)],
      },
      {
        index: 1,
        employeeName: 'Jane Doe',
        cells: [makeCell(null), makeCell('DE', true), makeCell('DE', true)],
      },
    ]
    const trips = generateTripsFromGantt(makeResult(rows))
    expect(trips).toHaveLength(2)
    expect(trips.find((t) => t.employeeName === 'John Smith')?.country).toBe('FR')
    expect(trips.find((t) => t.employeeName === 'Jane Doe')?.country).toBe('DE')
  })

  test('includes employee email when present', () => {
    const rows = [{
      index: 0,
      employeeName: 'John Smith',
      email: 'john@example.com',
      cells: [makeCell('FR', true), makeCell(null), makeCell(null)],
    }]
    const trips = generateTripsFromGantt(makeResult(rows))
    expect(trips[0].employeeEmail).toBe('john@example.com')
  })

  test('sets correct sourceRow (1-based, accounts for header)', () => {
    const rows = [{
      index: 0, // row 0 in data = row 2 in file (1-based + header)
      employeeName: 'John Smith',
      cells: [makeCell('FR', true), makeCell(null), makeCell(null)],
    }]
    const trips = generateTripsFromGantt(makeResult(rows))
    expect(trips[0].sourceRow).toBe(2)
  })

  describe('schengenOnly option', () => {
    test('includes only Schengen trips when schengenOnly is true', () => {
      const rows = [{
        index: 0,
        employeeName: 'John Smith',
        cells: [
          makeCell('FR', true),   // Schengen
          makeCell('GB', false),  // non-Schengen
          makeCell('DE', true),   // Schengen
        ],
      }]
      const trips = generateTripsFromGantt(makeResult(rows), { schengenOnly: true })
      expect(trips).toHaveLength(2)
      expect(trips.every((t) => t.isSchengen)).toBe(true)
    })

    test('includes all trips when schengenOnly is false (default)', () => {
      const rows = [{
        index: 0,
        employeeName: 'John Smith',
        cells: [
          makeCell('FR', true),
          makeCell('GB', false),
        ],
      }]
      const dateColumns = [
        makeDateColumn('2025-01-06', 0),
        makeDateColumn('2025-01-07', 1),
      ]
      const trips = generateTripsFromGantt(makeResult(rows, dateColumns))
      expect(trips).toHaveLength(2)
    })
  })

  describe('minDays option', () => {
    test('filters out trips below minDays', () => {
      const rows = [{
        index: 0,
        employeeName: 'John Smith',
        cells: [
          makeCell('FR', true),
          makeCell(null),
          makeCell('DE', true),
          makeCell('DE', true),
        ],
      }]
      const dateColumns = [
        makeDateColumn('2025-01-06', 0),
        makeDateColumn('2025-01-07', 1),
        makeDateColumn('2025-01-08', 2),
        makeDateColumn('2025-01-09', 3),
      ]
      const trips = generateTripsFromGantt(makeResult(rows, dateColumns), { minDays: 2 })
      expect(trips).toHaveLength(1)
      expect(trips[0].country).toBe('DE')
    })
  })
})

describe('generateTripsWithSummary', () => {
  test('returns empty summary for no trips', () => {
    const { trips, summary } = generateTripsWithSummary(makeResult([]))
    expect(trips).toHaveLength(0)
    expect(summary.tripsCreated).toBe(0)
    expect(summary.totalDays).toBe(0)
    expect(summary.schengenDays).toBe(0)
  })

  test('calculates summary statistics correctly', () => {
    const rows = [
      {
        index: 0,
        employeeName: 'John Smith',
        cells: [
          makeCell('FR', true),
          makeCell('FR', true),
          makeCell('DE', true),
        ],
      },
    ]
    const { trips, summary } = generateTripsWithSummary(makeResult(rows))
    expect(summary.tripsCreated).toBe(2)
    expect(summary.totalDays).toBe(3)
    expect(summary.schengenDays).toBe(3)
    expect(summary.rowsProcessed).toBe(1)
  })

  test('distinguishes schengen and non-schengen days', () => {
    const rows = [{
      index: 0,
      employeeName: 'John Smith',
      cells: [
        makeCell('FR', true),
        makeCell('GB', false),
      ],
    }]
    const dateColumns = [makeDateColumn('2025-01-06', 0), makeDateColumn('2025-01-07', 1)]
    const { summary } = generateTripsWithSummary(makeResult(rows, dateColumns))
    expect(summary.schengenDays).toBe(1)
    expect(summary.totalDays).toBe(2)
  })

  test('tracks days by country', () => {
    const rows = [{
      index: 0,
      employeeName: 'John Smith',
      cells: [
        makeCell('FR', true),
        makeCell('FR', true),
        makeCell('DE', true),
      ],
    }]
    const { summary } = generateTripsWithSummary(makeResult(rows))
    expect(summary.daysByCountry.get('FR')).toBe(2)
    expect(summary.daysByCountry.get('DE')).toBe(1)
  })

  test('tracks trips by employee', () => {
    const rows = [
      {
        index: 0,
        employeeName: 'John Smith',
        cells: [makeCell('FR', true), makeCell('DE', true), makeCell(null)],
      },
      {
        index: 1,
        employeeName: 'Jane Doe',
        cells: [makeCell('IT', true), makeCell(null), makeCell(null)],
      },
    ]
    const { summary } = generateTripsWithSummary(makeResult(rows))
    expect(summary.tripsByEmployee.get('John Smith')).toBe(2)
    expect(summary.tripsByEmployee.get('Jane Doe')).toBe(1)
  })
})
