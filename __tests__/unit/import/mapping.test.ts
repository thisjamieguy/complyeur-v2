import { describe, it, expect } from 'vitest';
import { applyMappings, initializeMappingState, needsManualMapping } from '@/lib/import/mapping';

describe('initializeMappingState (employees)', () => {
  it('marks exact headers as complete', () => {
    const headers = ['first_name', 'last_name', 'email'];
    const state = initializeMappingState(headers, 'employees', '00000000-0000-4000-8000-000000000000');

    expect(state.isComplete).toBe(true);
    expect(needsManualMapping(state)).toBe(false);
  });

  it('marks alias headers as complete', () => {
    const headers = ['First Name', 'Surname', 'E-Mail'];
    const state = initializeMappingState(headers, 'employees', '00000000-0000-4000-8000-000000000000');

    expect(state.isComplete).toBe(true);
    expect(needsManualMapping(state)).toBe(false);
  });
});

describe('applyMappings date parsing', () => {
  it('uses DD/MM preference for ambiguous dates by default', () => {
    const rawData = [
      {
        Email: 'jane@example.com',
        Entry: '05/01/2025',
        Exit: '08/01/2025',
        Country: 'FR',
      },
    ];

    const rows = applyMappings(rawData, [
      { sourceColumn: 'Email', targetField: 'employee_email', confidence: 'manual', sampleValues: [] },
      { sourceColumn: 'Entry', targetField: 'entry_date', confidence: 'manual', sampleValues: [] },
      { sourceColumn: 'Exit', targetField: 'exit_date', confidence: 'manual', sampleValues: [] },
      { sourceColumn: 'Country', targetField: 'country', confidence: 'manual', sampleValues: [] },
    ]);

    expect(rows[0]).toMatchObject({
      entry_date: '2025-01-05',
      exit_date: '2025-01-08',
    });
  });

  it('uses MM/DD preference when configured', () => {
    const rawData = [
      {
        Email: 'jane@example.com',
        Entry: '05/01/2025',
        Exit: '05/08/2025',
        Country: 'FR',
      },
    ];

    const rows = applyMappings(
      rawData,
      [
        { sourceColumn: 'Email', targetField: 'employee_email', confidence: 'manual', sampleValues: [] },
        { sourceColumn: 'Entry', targetField: 'entry_date', confidence: 'manual', sampleValues: [] },
        { sourceColumn: 'Exit', targetField: 'exit_date', confidence: 'manual', sampleValues: [] },
        { sourceColumn: 'Country', targetField: 'country', confidence: 'manual', sampleValues: [] },
      ],
      { preferredDateFormat: 'MM/DD' }
    );

    expect(rows[0]).toMatchObject({
      entry_date: '2025-05-01',
      exit_date: '2025-05-08',
    });
  });
});
