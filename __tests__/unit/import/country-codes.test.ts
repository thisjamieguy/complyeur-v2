import { describe, it, expect } from 'vitest';
import { toCountryCode, isValidCountry } from '@/lib/import/country-codes';

describe('toCountryCode', () => {
  it('converts country names to 2-letter codes', () => {
    expect(toCountryCode('Germany')).toBe('DE');
    expect(toCountryCode('France')).toBe('FR');
    expect(toCountryCode('Spain')).toBe('ES');
    expect(toCountryCode('Netherlands')).toBe('NL');
  });

  it('passes through valid 2-letter codes unchanged', () => {
    expect(toCountryCode('DE')).toBe('DE');
    expect(toCountryCode('FR')).toBe('FR');
    expect(toCountryCode('ES')).toBe('ES');
  });

  it('handles lowercase input', () => {
    expect(toCountryCode('germany')).toBe('DE');
    expect(toCountryCode('de')).toBe('DE');
    expect(toCountryCode('france')).toBe('FR');
  });

  it('handles mixed case input', () => {
    expect(toCountryCode('GERMANY')).toBe('DE');
    expect(toCountryCode('Germany')).toBe('DE');
    expect(toCountryCode('GeRmAnY')).toBe('DE');
  });

  it('handles whitespace in input', () => {
    expect(toCountryCode('  Germany  ')).toBe('DE');
    expect(toCountryCode(' DE ')).toBe('DE');
  });

  it('handles Czech Republic variations', () => {
    expect(toCountryCode('Czechia')).toBe('CZ');
    expect(toCountryCode('Czech Republic')).toBe('CZ');
    expect(toCountryCode('CZ')).toBe('CZ');
  });

  it('handles UK alias for GB', () => {
    expect(toCountryCode('UK')).toBe('GB');
    expect(toCountryCode('GB')).toBe('GB');
    expect(toCountryCode('United Kingdom')).toBe('GB');
  });

  it('passes through any 2-letter alphabetic code (worldwide ISO coverage)', () => {
    expect(toCountryCode('US')).toBe('US');
    expect(toCountryCode('JP')).toBe('JP');
    expect(toCountryCode('CA')).toBe('CA');
    expect(toCountryCode('AU')).toBe('AU');
    expect(toCountryCode('ZW')).toBe('ZW');
  });

  it('returns null for non-ISO-format strings', () => {
    expect(toCountryCode('Unknown')).toBeNull();
    expect(toCountryCode('Atlantis')).toBeNull();
    expect(toCountryCode('123')).toBeNull();
    expect(toCountryCode('ABC')).toBeNull();
    expect(toCountryCode('D3')).toBeNull();
  });

  it('returns null for empty or invalid input', () => {
    expect(toCountryCode('')).toBeNull();
    expect(toCountryCode('   ')).toBeNull();
  });

  it('converts non-Schengen EU countries', () => {
    expect(toCountryCode('Ireland')).toBe('IE');
    expect(toCountryCode('Cyprus')).toBe('CY');
    expect(toCountryCode('Bulgaria')).toBe('BG');
    expect(toCountryCode('Romania')).toBe('RO');
  });
});

describe('isValidCountry', () => {
  it('returns true for valid country names', () => {
    expect(isValidCountry('Germany')).toBe(true);
    expect(isValidCountry('France')).toBe(true);
  });

  it('returns true for valid country codes', () => {
    expect(isValidCountry('DE')).toBe(true);
    expect(isValidCountry('FR')).toBe(true);
  });

  it('returns true for any 2-letter alphabetic code', () => {
    expect(isValidCountry('US')).toBe(true);
    expect(isValidCountry('JP')).toBe(true);
    expect(isValidCountry('ZW')).toBe(true);
  });

  it('returns false for non-ISO-format strings', () => {
    expect(isValidCountry('Unknown')).toBe(false);
    expect(isValidCountry('ABC')).toBe(false);
    expect(isValidCountry('123')).toBe(false);
  });
});
