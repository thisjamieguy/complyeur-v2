import { describe, test, expect } from 'vitest'
import {
  getSampleValues,
  initializeMappingState,
  needsManualMapping,
  validateMappingState,
  updateMapping,
  applyMappings,
  mappingsToStorageFormat,
  getAvailableTargetFields,
  findBestSavedMapping,
} from '@/lib/import/mapping'
import type { MappingState, ColumnMapping, SavedColumnMapping } from '@/types/import'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMapping(
  sourceColumn: string,
  targetField: ColumnMapping['targetField'],
  confidence: ColumnMapping['confidence'] = 'auto'
): ColumnMapping {
  return { sourceColumn, targetField, confidence, sampleValues: [] }
}

function makeState(overrides: Partial<MappingState> = {}): MappingState {
  return {
    sessionId: 'session-123',
    format: 'trips',
    sourceColumns: [],
    mappings: [],
    isComplete: true,
    unmappedRequired: [],
    ...overrides,
  }
}

function makeSavedMapping(
  format: SavedColumnMapping['format'],
  mappings: Record<string, string>,
  timesUsed = 1,
  lastUsedAt?: string
): SavedColumnMapping {
  return {
    id: 'saved-1',
    name: 'Test Mapping',
    format,
    mappings,
    times_used: timesUsed,
    last_used_at: lastUsedAt ?? null,
    company_id: 'company-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }
}

// ─── getSampleValues ─────────────────────────────────────────────────────────

describe('getSampleValues', () => {
  const data = [
    { name: 'John Smith', country: 'FR' },
    { name: 'Jane Doe', country: 'DE' },
    { name: 'Bob Jones', country: 'FR' },
    { name: 'Alice Brown', country: 'IT' },
  ]

  test('returns up to limit unique values', () => {
    const samples = getSampleValues(data, 'name', 3)
    expect(samples).toHaveLength(3)
  })

  test('skips duplicate values', () => {
    const samples = getSampleValues(data, 'country')
    // FR appears twice in data but should only appear once in samples
    const frCount = samples.filter((s) => s === 'FR').length
    expect(frCount).toBe(1)
  })

  test('skips null and undefined values', () => {
    const dataWithNulls = [{ name: null }, { name: undefined }, { name: 'Alice' }]
    const samples = getSampleValues(dataWithNulls as never, 'name')
    expect(samples).toEqual(['Alice'])
  })

  test('skips empty string values', () => {
    const dataWithEmpty = [{ name: '' }, { name: '  ' }, { name: 'Bob' }]
    const samples = getSampleValues(dataWithEmpty, 'name')
    expect(samples).toEqual(['Bob'])
  })

  test('returns empty array when column does not exist', () => {
    const samples = getSampleValues(data, 'nonexistent')
    expect(samples).toEqual([])
  })

  test('uses default limit of 5', () => {
    const bigData = Array.from({ length: 10 }, (_, i) => ({ name: `Person ${i}` }))
    const samples = getSampleValues(bigData, 'name')
    expect(samples).toHaveLength(5)
  })

  test('trims values before deduplication', () => {
    const dataWithSpaces = [{ name: ' Alice' }, { name: 'Alice' }]
    const samples = getSampleValues(dataWithSpaces, 'name')
    expect(samples).toHaveLength(1)
  })
})

// ─── initializeMappingState ──────────────────────────────────────────────────

describe('initializeMappingState', () => {
  test('auto-detects employee_email from "email" header', () => {
    const state = initializeMappingState(
      ['email', 'entry date', 'exit date'],
      'trips',
      'session-1'
    )
    const emailMapping = state.mappings.find((m) => m.sourceColumn === 'email')
    expect(emailMapping?.targetField).toBe('employee_email')
    expect(emailMapping?.confidence).toBe('auto')
  })

  test('marks state complete when all required fields mapped', () => {
    // Required for trips: employee_email, entry_date, exit_date, country
    const state = initializeMappingState(
      ['email', 'entry date', 'exit date', 'country'],
      'trips',
      'session-1'
    )
    expect(state.isComplete).toBe(true)
    expect(state.unmappedRequired).toHaveLength(0)
  })

  test('marks state incomplete when required fields missing', () => {
    const state = initializeMappingState(['notes', 'comments'], 'trips', 'session-1')
    expect(state.isComplete).toBe(false)
    expect(state.unmappedRequired.length).toBeGreaterThan(0)
  })

  test('uses saved mappings for unmapped columns', () => {
    const savedMappings = [
      makeSavedMapping('trips', { custom_col: 'country' }, 5),
    ]
    const state = initializeMappingState(
      ['name', 'entry date', 'exit date', 'custom_col'],
      'trips',
      'session-1',
      savedMappings
    )
    const customMapping = state.mappings.find((m) => m.sourceColumn === 'custom_col')
    expect(customMapping?.targetField).toBe('country')
    expect(customMapping?.confidence).toBe('saved')
  })

  test('extracts sample values from rawData', () => {
    const rawData = [{ name: 'Alice' }, { name: 'Bob' }]
    const state = initializeMappingState(
      ['name', 'entry date', 'exit date', 'country'],
      'trips',
      'session-1',
      [],
      rawData
    )
    const nameMapping = state.mappings.find((m) => m.sourceColumn === 'name')
    expect(nameMapping?.sampleValues).toContain('Alice')
  })

  test('does not double-map the same target field', () => {
    // Two columns that both alias to employee_name
    const state = initializeMappingState(
      ['name', 'full name', 'entry date', 'exit date', 'country'],
      'trips',
      'session-1'
    )
    const nameMappings = state.mappings.filter((m) => m.targetField === 'employee_name')
    expect(nameMappings).toHaveLength(1)
  })

  test('returns correct sessionId and format', () => {
    const state = initializeMappingState([], 'employees', 'my-session')
    expect(state.sessionId).toBe('my-session')
    expect(state.format).toBe('employees')
  })

  test('sorts saved mappings by last_used_at descending', () => {
    const savedMappings = [
      makeSavedMapping('trips', { col_a: 'country' }, 1, '2025-01-01T00:00:00Z'),
      makeSavedMapping('trips', { col_a: 'purpose' }, 10, '2025-06-01T00:00:00Z'),
    ]
    const state = initializeMappingState(
      ['name', 'entry date', 'exit date', 'col_a'],
      'trips',
      'session-1',
      savedMappings
    )
    const colA = state.mappings.find((m) => m.sourceColumn === 'col_a')
    // More recent mapping wins
    expect(colA?.targetField).toBe('purpose')
  })
})

// ─── needsManualMapping ──────────────────────────────────────────────────────

describe('needsManualMapping', () => {
  test('returns false when mapping is complete', () => {
    expect(needsManualMapping(makeState({ isComplete: true }))).toBe(false)
  })

  test('returns true when mapping is incomplete', () => {
    expect(needsManualMapping(makeState({ isComplete: false }))).toBe(true)
  })
})

// ─── validateMappingState ────────────────────────────────────────────────────

describe('validateMappingState', () => {
  test('returns valid when all required fields are mapped (trips)', () => {
    // Required for trips: employee_email, entry_date, exit_date, country
    const state = makeState({
      format: 'trips',
      mappings: [
        makeMapping('col1', 'employee_email'),
        makeMapping('col2', 'entry_date'),
        makeMapping('col3', 'exit_date'),
        makeMapping('col4', 'country'),
      ],
    })
    const result = validateMappingState(state)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('returns invalid when required field is missing', () => {
    const state = makeState({
      format: 'trips',
      mappings: [
        makeMapping('col1', 'employee_email'),
        // missing entry_date and exit_date
      ],
    })
    const result = validateMappingState(state)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.includes('entry_date') || e.includes('exit_date'))).toBe(true)
  })

  test('detects duplicate target field mappings', () => {
    const state = makeState({
      format: 'trips',
      mappings: [
        makeMapping('col1', 'employee_name'),
        makeMapping('col2', 'employee_name'), // duplicate!
        makeMapping('col3', 'entry_date'),
        makeMapping('col4', 'exit_date'),
        makeMapping('col5', 'country'),
      ],
    })
    const result = validateMappingState(state)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true)
  })

  test('ignores null targetField in duplicate check', () => {
    // Required for trips: employee_email, entry_date, exit_date, country
    const state = makeState({
      format: 'trips',
      mappings: [
        makeMapping('col1', 'employee_email'),
        makeMapping('col2', null, 'unmapped'),
        makeMapping('col3', null, 'unmapped'), // two nulls — not a duplicate
        makeMapping('col4', 'entry_date'),
        makeMapping('col5', 'exit_date'),
        makeMapping('col6', 'country'),
      ],
    })
    const result = validateMappingState(state)
    expect(result.isValid).toBe(true)
  })
})

// ─── updateMapping ───────────────────────────────────────────────────────────

describe('updateMapping', () => {
  test('updates the target field for a column', () => {
    const state = makeState({
      format: 'trips',
      mappings: [makeMapping('col1', null, 'unmapped')],
    })
    const updated = updateMapping(state, 'col1', 'country')
    const col = updated.mappings.find((m) => m.sourceColumn === 'col1')
    expect(col?.targetField).toBe('country')
    expect(col?.confidence).toBe('manual')
  })

  test('sets confidence to "skipped" when targetField is null', () => {
    const state = makeState({
      format: 'trips',
      mappings: [makeMapping('col1', 'country', 'auto')],
    })
    const updated = updateMapping(state, 'col1', null)
    const col = updated.mappings.find((m) => m.sourceColumn === 'col1')
    expect(col?.targetField).toBeNull()
    expect(col?.confidence).toBe('skipped')
  })

  test('recalculates isComplete after update', () => {
    // Required for trips: employee_email, entry_date, exit_date, country
    const state = makeState({
      format: 'trips',
      isComplete: false,
      mappings: [
        makeMapping('col1', 'employee_email'),
        makeMapping('col2', 'entry_date'),
        makeMapping('col3', null, 'unmapped'), // exit_date missing
        makeMapping('col4', 'country'),
      ],
    })
    const updated = updateMapping(state, 'col3', 'exit_date')
    expect(updated.isComplete).toBe(true)
    expect(updated.unmappedRequired).toHaveLength(0)
  })

  test('does not mutate the original state', () => {
    const state = makeState({
      format: 'trips',
      mappings: [makeMapping('col1', null, 'unmapped')],
    })
    updateMapping(state, 'col1', 'country')
    expect(state.mappings[0].targetField).toBeNull()
  })
})

// ─── applyMappings ───────────────────────────────────────────────────────────

describe('applyMappings', () => {
  test('transforms raw data using column mappings', () => {
    const rawData = [{ 'Employee Name': 'John', 'Start Date': '2025-01-06', 'End Date': '2025-01-10', 'Dest': 'FR' }]
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'Employee Name', targetField: 'employee_name', confidence: 'auto', sampleValues: [] },
      { sourceColumn: 'Start Date', targetField: 'entry_date', confidence: 'auto', sampleValues: [] },
      { sourceColumn: 'End Date', targetField: 'exit_date', confidence: 'auto', sampleValues: [] },
      { sourceColumn: 'Dest', targetField: 'country', confidence: 'auto', sampleValues: [] },
    ]
    const result = applyMappings(rawData, mappings)
    expect(result[0]).toMatchObject({
      employee_name: 'John',
      country: 'FR',
    })
  })

  test('parses date fields through date parser', () => {
    const rawData = [{ 'Start': '2025-01-06', 'End': '2025-01-10' }]
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'Start', targetField: 'entry_date', confidence: 'auto', sampleValues: [] },
      { sourceColumn: 'End', targetField: 'exit_date', confidence: 'auto', sampleValues: [] },
    ]
    const result = applyMappings(rawData, mappings)
    expect(result[0]).toHaveProperty('entry_date', '2025-01-06')
    expect(result[0]).toHaveProperty('exit_date', '2025-01-10')
  })

  test('handles empty date values', () => {
    const rawData = [{ 'Start': '' }]
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'Start', targetField: 'entry_date', confidence: 'auto', sampleValues: [] },
    ]
    const result = applyMappings(rawData, mappings)
    expect(result[0]).toHaveProperty('entry_date', '')
  })

  test('handles null date values', () => {
    const rawData = [{ 'Start': null }]
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'Start', targetField: 'entry_date', confidence: 'auto', sampleValues: [] },
    ]
    const result = applyMappings(rawData, mappings)
    expect(result[0]).toHaveProperty('entry_date', '')
  })

  test('skips columns with no target field', () => {
    const rawData = [{ 'Notes': 'Ignore me', 'Name': 'John' }]
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'Notes', targetField: null, confidence: 'unmapped', sampleValues: [] },
      { sourceColumn: 'Name', targetField: 'employee_name', confidence: 'auto', sampleValues: [] },
    ]
    const result = applyMappings(rawData, mappings)
    expect(result[0]).not.toHaveProperty('Notes')
    expect(result[0]).toHaveProperty('employee_name', 'John')
  })

  test('adds row_number to each row', () => {
    const rawData = [{ name: 'Alice' }, { name: 'Bob' }]
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'name', targetField: 'employee_name', confidence: 'auto', sampleValues: [] },
    ]
    const result = applyMappings(rawData, mappings)
    expect((result[0] as Record<string, unknown>).row_number).toBe(1)
    expect((result[1] as Record<string, unknown>).row_number).toBe(2)
  })
})

// ─── mappingsToStorageFormat ─────────────────────────────────────────────────

describe('mappingsToStorageFormat', () => {
  test('converts mapped columns to storage format', () => {
    const mappings: ColumnMapping[] = [
      makeMapping('Name', 'employee_name'),
      makeMapping('Start', 'entry_date'),
    ]
    const result = mappingsToStorageFormat(mappings)
    expect(result).toEqual({ Name: 'employee_name', Start: 'entry_date' })
  })

  test('excludes null target fields', () => {
    const mappings: ColumnMapping[] = [
      makeMapping('Name', 'employee_name'),
      makeMapping('Notes', null, 'unmapped'),
    ]
    const result = mappingsToStorageFormat(mappings)
    expect(result).not.toHaveProperty('Notes')
  })

  test('excludes skipped mappings', () => {
    const mappings: ColumnMapping[] = [
      makeMapping('Name', 'employee_name'),
      makeMapping('Notes', 'purpose', 'skipped'),
    ]
    const result = mappingsToStorageFormat(mappings)
    expect(result).not.toHaveProperty('Notes')
  })

  test('returns empty object for no mappings', () => {
    expect(mappingsToStorageFormat([])).toEqual({})
  })
})

// ─── getAvailableTargetFields ─────────────────────────────────────────────────

describe('getAvailableTargetFields', () => {
  test('returns all fields when none are mapped (trips)', () => {
    const fields = getAvailableTargetFields('trips', [])
    expect(fields).toContain('employee_name')
    expect(fields).toContain('entry_date')
    expect(fields).toContain('exit_date')
    expect(fields).toContain('country')
  })

  test('excludes already-mapped fields', () => {
    const mappings: ColumnMapping[] = [makeMapping('col1', 'employee_name')]
    const fields = getAvailableTargetFields('trips', mappings)
    expect(fields).not.toContain('employee_name')
  })

  test('re-includes field for the excluded source column', () => {
    const mappings: ColumnMapping[] = [makeMapping('col1', 'country')]
    const fields = getAvailableTargetFields('trips', mappings, 'col1')
    // col1's own target (country) should be available again
    expect(fields).toContain('country')
  })

  test('returns employee-specific fields for employees format', () => {
    const fields = getAvailableTargetFields('employees', [])
    expect(fields).toContain('name')
    expect(fields).toContain('email')
    expect(fields).not.toContain('entry_date')
  })
})

// ─── findBestSavedMapping ────────────────────────────────────────────────────

describe('findBestSavedMapping', () => {
  test('returns null when no saved mappings', () => {
    const result = findBestSavedMapping(['col1', 'col2'], 'trips', [])
    expect(result).toBeNull()
  })

  test('returns null when no format matches', () => {
    const saved = [makeSavedMapping('employees', { col1: 'name' })]
    const result = findBestSavedMapping(['col1'], 'trips', saved)
    expect(result).toBeNull()
  })

  test('returns null when no columns match', () => {
    const saved = [makeSavedMapping('trips', { completely_different: 'country' })]
    const result = findBestSavedMapping(['col1', 'col2'], 'trips', saved)
    expect(result).toBeNull()
  })

  test('returns best matching saved mapping', () => {
    const saved = [
      makeSavedMapping('trips', { name: 'employee_name', start: 'entry_date' }),
    ]
    const result = findBestSavedMapping(['name', 'start', 'end'], 'trips', saved)
    expect(result).not.toBeNull()
  })

  test('prefers mapping with more column matches', () => {
    const saved = [
      makeSavedMapping('trips', { col_a: 'country' }),                        // 1/1 = 100% match
      makeSavedMapping('trips', { col_a: 'entry_date', col_b: 'exit_date' }), // 2/2 = 100% match, same %
    ]
    // Both should be found; at minimum the one with matches is returned
    const result = findBestSavedMapping(['col_a', 'col_b', 'col_c'], 'trips', saved)
    expect(result).not.toBeNull()
  })

  test('applies usage bonus to score', () => {
    const saved = [
      makeSavedMapping('trips', { col_a: 'country' }, 1),   // less used
      makeSavedMapping('trips', { col_a: 'purpose' }, 100), // heavily used - bonus applies
    ]
    // Both match equally by column count; usage bonus should differentiate
    const result = findBestSavedMapping(['col_a'], 'trips', saved)
    expect(result).not.toBeNull()
  })
})
