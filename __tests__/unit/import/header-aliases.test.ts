import { describe, it, expect } from 'vitest';
import { normalizeHeader } from '@/lib/import/header-aliases';

describe('normalizeHeader', () => {
  it('matches exact header aliases', () => {
    expect(normalizeHeader('First Name')).toBe('first_name');
    expect(normalizeHeader('Surname')).toBe('last_name');
    expect(normalizeHeader('email')).toBe('email');
  });

  it('handles hyphenated aliases like E-Mail', () => {
    expect(normalizeHeader('E-Mail')).toBe('email');
  });
});
