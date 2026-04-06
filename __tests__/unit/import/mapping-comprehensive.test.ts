/**
 * Comprehensive tests for the import mapping module.
 * Tests: getSampleValues, initializeMappingState, needsManualMapping,
 *        validateMappingState, updateMapping, applyMappings,
 *        mappingsToStorageFormat, getAvailableTargetFields, findBestSavedMapping
 */

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
import type { MappingState, SavedColumnMapping, ColumnMapping } from '@/types/import'

// ─── Helpers ────────────────────────────────────────────────────────────────

const SESSION_ID = '123e4567-e89b-12d3-a456-426614174000'

function makeSavedMapping(overrides: Partial<SavedColumnMapping> = {}): SavedColumnMapping {
  return {
    id: 'saved-1',
    company_id: 'company-1',
    created_by: 'user-1',
    name: 'My Mapping',
    description: null,
    format: 'trips',
    mappings: {
      'Email': 'employee_email',
      'Start Date': 'entry_date',
      'End Date': 'exit_date',
      'Country': 'country',
    },
    times_used: 5,
    last_used_at: '2026-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── getSampleValues ─────────────────────────────────────────────────────────

describe('getSampleValues', () => {
  test('returns up to 5 non-empty values from a column', () => {
    const data = [
      { Name: 'Alice' },
      { Name: 'Bob' },
      { Name: 'Carol' },
      { Name: 'Dave' },
      { Name: 'Eve' },
      { Name: 'Frank' }, // 6th — should be excluded
    ]
    const samples = getSampleValues(data, 'Name')
    expect(samples).toHaveLength(5)
    expect(samples).toContain('Alice')
    expect(samples).not.toContain('Frank')
  })

  test('skips null and undefined values', () => {
    const data = [{ Name: null }, { Name: undefined }, { Name: 'Alice' }]
    const samples = getSampleValues(data as Record<string, unknown>[], 'Name')
    expect(samples).toEqual(['Alice'])
  })

  test('skips empty-string values', () => {
    const data = [{ Name: '' }, { Name: '   ' }, { Name: 'Alice' }]
    const samples = getSampleValues(data, 'Name')
    expect(samples).toEqual(['Alice'])
  })

  test('returns empty array for a missing column', () => {
    const data = [{ OtherCol: 'value' }]
    const samples = getSampleValues(data, 'Name')
    expect(samples).toEqual([])
  })

  test('deduplicates identical values', () => {
    const data = [{ Name: 'Alice' }, { Name: 'Alice' }, { Name: 'Bob' }]
    const samples = getSampleValues(data, 'Name')
    expect(samples.filter((s) => s === 'Alice')).toHaveLength(1)
  })

  test('respects custom limit parameter', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ Name: `Person ${i}` }))
    const samples = getSampleValues(data, 'Name', 3)
    expect(samples).toHaveLength(3)
  })
})

// ─── initializeMappingState ──────────────────────────────────────────────────

describe('initializeMappingState', () => {
  test('auto-detects standard trip headers', () => {
    const headers = ['Email', 'Entry Date', 'Exit Date', 'Country']
    const state = initializeMappingState(headers, 'trips', SESSION_ID)

    const emailMapping = state.mappings.find((m) => m.sourceColumn === 'Email')
    expect(emailMapping?.targetField).toBe('employee_email')
    expect(emailMapping?.confidence).toBe('auto')
  })

  test('auto-detects standard employee headers', () => {
    const headers = ['First Name', 'Last Name', 'Email']
    const state = initializeMappingState(headers, 'employees', SESSION_ID)

    const firstNameMapping = state.mappings.find((m) => m.sourceColumn === 'First Name')
    expect(firstNameMapping?.targetField).toBe('first_name')
    expect(firstNameMapping?.confidence).toBe('auto')
  })

  test('marks unknown columns as unmapped', () => {
    const headers = ['MyColumn', 'AnotherColumn']
    const state = initializeMappingState(headers, 'trips', SESSION_ID)

    for (const mapping of state.mappings) {
      expect(mapping.confidence).toBe('unmapped')
      expect(mapping.targetField).toBeNull()
    }
  })

  test('sets isComplete=true when all required trip fields are auto-detected', () => {
    const headers = ['Email', 'Entry Date', 'Exit Date', 'Country']
    const state = initializeMappingState(headers, 'trips', SESSION_ID)
    expect(state.isComplete).toBe(true)
    expect(state.unmappedRequired).toHaveLength(0)
  })

  test('sets isComplete=false when required fields are missing', () => {
    const headers = ['Name', 'SomeOtherColumn']
    const state = initializeMappingState(headers, 'trips', SESSION_ID)
    expect(state.isComplete).toBe(false)
    expect(state.unmappedRequired.length).toBeGreaterThan(0)
  })

  test('unmappedRequired lists missing required fields', () => {
    const headers = ['Email'] // Missing entry_date, exit_date, country
    const state = initializeMappingState(headers, 'trips', SESSION_ID)
    expect(state.unmappedRequired).toContain('entry_date')
    expect(state.unmappedRequired).toContain('exit_date')
    expect(state.unmappedRequired).toContain('country')
  })

  test('applies saved mappings for undetected columns', () => {
    const headers = ['Custom Email', 'Start', 'End', 'Destination']
    const saved = [
      makeSavedMapping({
        mappings: {
          'Custom Email': 'employee_email',
          'Start': 'entry_date',
          'End': 'exit_date',
          'Destination': 'country',
        },
      }),
    ]
    const state = initializeMappingState(headers, 'trips', SESSION_ID, saved)

    const emailMapping = state.mappings.find((m) => m.sourceColumn === 'Custom Email')
    expect(emailMapping?.confidence).toBe('saved')
    expect(emailMapping?.targetField).toBe('employee_email')
    expect(state.isComplete).toBe(true)
  })

  test('stores sessionId and format in the state', () => {
    const state = initializeMappingState(['Name'], 'employees', SESSION_ID)
    expect(state.sessionId).toBe(SESSION_ID)
    expect(state.format).toBe('employees')
  })

  test('sourceColumns matches the input headers array', () => {
    const headers = ['Col A', 'Col B']
    const state = initializeMappingState(headers, 'trips', SESSION_ID)
    expect(state.sourceColumns).toEqual(headers)
  })

  test('extracts sample values from rawData when provided', () => {
    const headers = ['First Name']
    const rawData = [{ 'First Name': 'Alice' }, { 'First Name': 'Bob' }]
    const state = initializeMappingState(headers, 'employees', SESSION_ID, [], rawData)
    const mapping = state.mappings.find((m) => m.sourceColumn === 'First Name')
    expect(mapping?.sampleValues).toContain('Alice')
    expect(mapping?.sampleValues).toContain('Bob')
  })
})

// ─── needsManualMapping ──────────────────────────────────────────────────────

describe('needsManualMapping', () => {
  test('returns false when all required fields are mapped', () => {
    const state = initializeMappingState(
      ['Email', 'Entry Date', 'Exit Date', 'Country'],
      'trips',
      SESSION_ID
    )
    expect(needsManualMapping(state)).toBe(false)
  })

  test('returns true when any required field is unmapped', () => {
    const state = initializeMappingState(['Name'], 'trips', SESSION_ID)
    expect(needsManualMapping(state)).toBe(true)
  })
})

// ─── validateMappingState ────────────────────────────────────────────────────

describe('validateMappingState', () => {
  test('returns isValid=true for a complete trips mapping', () => {
    const state = initializeMappingState(
      ['Email', 'Entry Date', 'Exit Date', 'Country'],
      'trips',
      SESSION_ID
    )
    const result = validateMappingState(state)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('returns error when required field is not mapped', () => {
    const state = initializeMappingState(['Email'], 'trips', SESSION_ID)
    const result = validateMappingState(state)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.includes('entry_date'))).toBe(true)
  })

  test('returns error for duplicate target field mapping', () => {
    // Build a state with two source columns pointing to same target
    const state = initializeMappingState(
      ['Email', 'Entry Date', 'Exit Date', 'Country'],
      'trips',
      SESSION_ID
    )
    // Manually duplicate the email mapping onto the second column
    const stateWithDupe: MappingState = {
      ...state,
      mappings: state.mappings.map((m, i) =>
        i === 1
          ? { ...m, targetField: 'employee_email', confidence: 'manual' }
          : m
      ),
    }
    const result = validateMappingState(stateWithDupe)
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('duplicate'))).toBe(true)
  })

  test('collects multiple errors when multiple required fields are missing', () => {
    const state = initializeMappingState([], 'trips', SESSION_ID)
    const result = validateMappingState(state)
    expect(result.errors.length).toBeGreaterThanOrEqual(4) // email, entry_date, exit_date, country
  })
})

// ─── updateMapping ───────────────────────────────────────────────────────────

describe('updateMapping', () => {
  test('updates target field for the specified source column', () => {
    const state = initializeMappingState(['Start', 'End', 'Dest', 'Email'], 'trips', SESSION_ID)
    const updated = updateMapping(state, 'Email', 'employee_email')
    const mapping = updated.mappings.find((m) => m.sourceColumn === 'Email')
    expect(mapping?.targetField).toBe('employee_email')
  })

  test('sets confidence to "manual" when assigning a target', () => {
    const state = initializeMappingState(['MyColumn', 'End', 'Start', 'Dest'], 'trips', SESSION_ID)
    const updated = updateMapping(state, 'MyColumn', 'employee_email')
    const mapping = updated.mappings.find((m) => m.sourceColumn === 'MyColumn')
    expect(mapping?.confidence).toBe('manual')
  })

  test('sets confidence to "skipped" when target is set to null', () => {
    const state = initializeMappingState(['Email', 'Entry Date', 'Exit Date', 'Country'], 'trips', SESSION_ID)
    const updated = updateMapping(state, 'Email', null)
    const mapping = updated.mappings.find((m) => m.sourceColumn === 'Email')
    expect(mapping?.confidence).toBe('skipped')
    expect(mapping?.targetField).toBeNull()
  })

  test('recalculates isComplete after update completes all required fields', () => {
    // Start with incomplete state
    let state = initializeMappingState(['A', 'B', 'C', 'D'], 'trips', SESSION_ID)
    expect(state.isComplete).toBe(false)

    state = updateMapping(state, 'A', 'employee_email')
    state = updateMapping(state, 'B', 'entry_date')
    state = updateMapping(state, 'C', 'exit_date')
    state = updateMapping(state, 'D', 'country')

    expect(state.isComplete).toBe(true)
    expect(state.unmappedRequired).toHaveLength(0)
  })

  test('leaves other column mappings unchanged', () => {
    const state = initializeMappingState(['Email', 'Entry Date', 'Exit Date', 'Country'], 'trips', SESSION_ID)
    const updated = updateMapping(state, 'Country', null)
    const emailMapping = updated.mappings.find((m) => m.sourceColumn === 'Email')
    expect(emailMapping?.targetField).toBe('employee_email') // unchanged
  })
})

// ─── applyMappings ───────────────────────────────────────────────────────────

describe('applyMappings', () => {
  const mappings: ColumnMapping[] = [
    { sourceColumn: 'Email', targetField: 'employee_email', confidence: 'auto', sampleValues: [] },
    { sourceColumn: 'Start', targetField: 'entry_date', confidence: 'auto', sampleValues: [] },
    { sourceColumn: 'End', targetField: 'exit_date', confidence: 'auto', sampleValues: [] },
    { sourceColumn: 'Dest', targetField: 'country', confidence: 'auto', sampleValues: [] },
  ]

  const rawData = [
    { Email: 'alice@example.com', Start: '2025-06-01', End: '2025-06-07', Dest: 'DE' },
  ]

  test('transforms raw data to target field names', () => {
    const result = applyMappings(rawData, mappings)
    expect(result[0]).toHaveProperty('employee_email', 'alice@example.com')
    expect(result[0]).toHaveProperty('country', 'DE')
  })

  test('adds row_number starting at 1', () => {
    const result = applyMappings(rawData, mappings)
    expect(result[0]).toHaveProperty('row_number', 1)
  })

  test('increments row_number for each row', () => {
    const multi = [...rawData, { Email: 'bob@example.com', Start: '2025-07-01', End: '2025-07-07', Dest: 'FR' }]
    const result = applyMappings(multi, mappings)
    expect(result[0].row_number).toBe(1)
    expect(result[1].row_number).toBe(2)
  })

  test('ignores unmapped (null targetField) columns', () => {
    const mappingsWithSkip: ColumnMapping[] = [
      ...mappings,
      { sourceColumn: 'Notes', targetField: null, confidence: 'skipped', sampleValues: [] },
    ]
    const data = [{ Email: 'a@a.com', Start: '2025-01-01', End: '2025-01-07', Dest: 'FR', Notes: 'ignore me' }]
    const result = applyMappings(data, mappingsWithSkip)
    expect(result[0]).not.toHaveProperty('Notes')
  })

  test('parses ISO date fields through the date parser', () => {
    const result = applyMappings(rawData, mappings)
    // ISO dates should remain as YYYY-MM-DD
    expect(result[0]).toHaveProperty('entry_date', '2025-06-01')
    expect(result[0]).toHaveProperty('exit_date', '2025-06-07')
  })

  test('returns empty array for empty rawData', () => {
    const result = applyMappings([], mappings)
    expect(result).toHaveLength(0)
  })
})

// ─── mappingsToStorageFormat ─────────────────────────────────────────────────

describe('mappingsToStorageFormat', () => {
  test('converts array of ColumnMappings to { source: target } record', () => {
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'Email', targetField: 'employee_email', confidence: 'auto', sampleValues: [] },
      { sourceColumn: 'Country', targetField: 'country', confidence: 'manual', sampleValues: [] },
    ]
    const result = mappingsToStorageFormat(mappings)
    expect(result).toEqual({ Email: 'employee_email', Country: 'country' })
  })

  test('excludes mappings with null targetField', () => {
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'Notes', targetField: null, confidence: 'skipped', sampleValues: [] },
      { sourceColumn: 'Email', targetField: 'employee_email', confidence: 'auto', sampleValues: [] },
    ]
    const result = mappingsToStorageFormat(mappings)
    expect(result).not.toHaveProperty('Notes')
    expect(result).toHaveProperty('Email')
  })

  test('excludes skipped mappings even if targetField somehow has a value', () => {
    const mappings: ColumnMapping[] = [
      {
        sourceColumn: 'SkippedCol',
        targetField: 'country',
        confidence: 'skipped',
        sampleValues: [],
      },
    ]
    const result = mappingsToStorageFormat(mappings)
    expect(result).not.toHaveProperty('SkippedCol')
  })

  test('returns empty record for empty mappings array', () => {
    expect(mappingsToStorageFormat([])).toEqual({})
  })
})

// ─── getAvailableTargetFields ────────────────────────────────────────────────

describe('getAvailableTargetFields', () => {
  test('returns all trip fields when nothing is mapped', () => {
    const mappings: ColumnMapping[] = []
    const available = getAvailableTargetFields('trips', mappings)
    expect(available).toContain('employee_email')
    expect(available).toContain('entry_date')
    expect(available).toContain('exit_date')
    expect(available).toContain('country')
  })

  test('excludes already-mapped fields', () => {
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'Email', targetField: 'employee_email', confidence: 'auto', sampleValues: [] },
    ]
    const available = getAvailableTargetFields('trips', mappings)
    expect(available).not.toContain('employee_email')
    expect(available).toContain('entry_date')
  })

  test('includes field used by excludeSourceColumn in the result', () => {
    const mappings: ColumnMapping[] = [
      { sourceColumn: 'MyEmailCol', targetField: 'employee_email', confidence: 'manual', sampleValues: [] },
    ]
    // Exclude the column being edited — its target should become available again
    const available = getAvailableTargetFields('trips', mappings, 'MyEmailCol')
    expect(available).toContain('employee_email')
  })

  test('returns employee fields for employees format', () => {
    const available = getAvailableTargetFields('employees', [])
    expect(available).toContain('first_name')
    expect(available).toContain('last_name')
    expect(available).toContain('email')
    expect(available).not.toContain('employee_email')
  })
})

// ─── findBestSavedMapping ────────────────────────────────────────────────────

describe('findBestSavedMapping', () => {
  test('returns null when no saved mappings exist', () => {
    const result = findBestSavedMapping(['Email', 'Start'], 'trips', [])
    expect(result).toBeNull()
  })

  test('returns null when format does not match', () => {
    const saved = [makeSavedMapping({ format: 'employees' })]
    const result = findBestSavedMapping(['Email', 'Start'], 'trips', saved)
    expect(result).toBeNull()
  })

  test('returns null when column overlap is zero', () => {
    const saved = [makeSavedMapping({ mappings: { 'Completely Different': 'employee_email' } })]
    const result = findBestSavedMapping(['Email', 'Start', 'End', 'Country'], 'trips', saved)
    expect(result).toBeNull()
  })

  test('returns the saved mapping with the highest column overlap', () => {
    const bestMatch = makeSavedMapping({
      id: 'best',
      // All 4 columns present in the headers → 4/4 = 100% match
      mappings: { 'Email': 'employee_email', 'Start Date': 'entry_date', 'End Date': 'exit_date', 'Country': 'country' },
    })
    const poorMatch = makeSavedMapping({
      id: 'poor',
      // Only 1 of 2 saved columns present in the headers → 1/2 = 50% match
      mappings: { 'Email': 'employee_email', 'NonExistentColumn': 'entry_date' },
    })
    const result = findBestSavedMapping(
      ['Email', 'Start Date', 'End Date', 'Country'],
      'trips',
      [poorMatch, bestMatch]
    )
    expect(result?.id).toBe('best')
  })

  test('returns a saved mapping when at least one column overlaps', () => {
    const saved = [makeSavedMapping({ mappings: { 'Email': 'employee_email', 'X': 'entry_date' } })]
    const result = findBestSavedMapping(['Email', 'Start', 'End', 'Country'], 'trips', saved)
    expect(result).not.toBeNull()
  })
})
