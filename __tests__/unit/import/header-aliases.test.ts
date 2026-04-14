import { describe, it, expect, test } from 'vitest';
import {
  normalizeHeader,
  checkFormatRequirements,
  getFieldAliases,
  isDateLikeHeader,
  mapHeaders,
} from '@/lib/import/header-aliases';

describe('normalizeHeader', () => {
  it('matches exact header aliases', () => {
    expect(normalizeHeader('First Name')).toBe('first_name');
    expect(normalizeHeader('Surname')).toBe('last_name');
    expect(normalizeHeader('email')).toBe('email');
  });

  it('handles hyphenated aliases like E-Mail', () => {
    expect(normalizeHeader('E-Mail')).toBe('email');
  });

  it('returns null for empty string', () => {
    expect(normalizeHeader('')).toBeNull();
  });

  it('returns null for unrecognized header', () => {
    expect(normalizeHeader('foobar_xyz_123')).toBeNull();
  });
});

describe('mapHeaders', () => {
  it('maps headers to canonical fields', () => {
    const result = mapHeaders(['First Name', 'Last Name', 'email'], []);
    expect(result.mappings.size).toBe(3);
    expect(result.mapped.length).toBe(3);
  });

  it('reports missing required fields', () => {
    const result = mapHeaders(['name'], ['entry_date', 'exit_date']);
    expect(result.hasRequiredFields).toBe(false);
    expect(result.missingFields).toContain('entry_date');
  });
});

describe('checkFormatRequirements', () => {
  it('returns valid for trips with email + dates + country', () => {
    const result = checkFormatRequirements(
      ['email', 'entry date', 'exit date', 'country'],
      'trips'
    );
    expect(result.isValid).toBe(true);
    expect(result.matchedConfig).toBeTruthy();
  });

  it('returns valid for trips with name-based config', () => {
    const result = checkFormatRequirements(
      ['name', 'entry date', 'exit date', 'country'],
      'trips'
    );
    expect(result.isValid).toBe(true);
  });

  it('returns invalid when required fields are missing', () => {
    const result = checkFormatRequirements(['notes', 'comments'], 'trips');
    expect(result.isValid).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('returns valid for employees with employee name column', () => {
    // employees_simple only needs employee_name; 'name' maps to that canonical
    const result = checkFormatRequirements(['name', 'email'], 'employees');
    expect(result.isValid).toBe(true);
  });

  it('returns valid for gantt with employee name', () => {
    const result = checkFormatRequirements(['name'], 'gantt');
    expect(result.isValid).toBe(true);
  });

  it('returns invalid for gantt with no employee column', () => {
    const result = checkFormatRequirements(['2025-01-01', '2025-01-02'], 'gantt');
    expect(result.isValid).toBe(false);
  });
});

describe('getFieldAliases', () => {
  it('returns aliases for email field', () => {
    const aliases = getFieldAliases('email');
    expect(aliases).toContain('email');
    expect(aliases.length).toBeGreaterThan(1);
  });

  it('returns aliases for entry_date field', () => {
    const aliases = getFieldAliases('entry_date');
    expect(aliases).toContain('entry_date');
    expect(aliases).toContain('start date');
  });
});

describe('isDateLikeHeader', () => {
  test('detects ISO date header', () => {
    expect(isDateLikeHeader('2025-01-15')).toBe(true);
  });

  test('detects slash date header', () => {
    expect(isDateLikeHeader('01/15/2025')).toBe(true);
  });

  test('detects "Mon 06" Gantt header', () => {
    expect(isDateLikeHeader('Mon 06')).toBe(true);
  });

  test('detects "Mon 06 Jan" Gantt header', () => {
    expect(isDateLikeHeader('Mon 06 Jan')).toBe(true);
  });

  test('returns false for non-date header', () => {
    expect(isDateLikeHeader('Employee Name')).toBe(false);
    expect(isDateLikeHeader('Country')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isDateLikeHeader('')).toBe(false);
  });
});
