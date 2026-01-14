import { describe, it, expect } from 'vitest';
import { initializeMappingState, needsManualMapping } from '@/lib/import/mapping';

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
