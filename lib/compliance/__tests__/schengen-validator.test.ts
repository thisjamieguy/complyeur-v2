/**
 * @fileoverview Tests for Schengen country validation.
 */

import { describe, it, expect } from 'vitest';
import {
  isSchengenCountry,
  validateCountry,
  normalizeCountryCode,
  getSchengenCountryCodes,
  getSchengenCountries,
} from '../schengen-validator';

describe('isSchengenCountry', () => {
  describe('Schengen member countries', () => {
    it.each([
      'AT', 'BE', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE',
      'GR', 'HU', 'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL',
      'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH',
    ])('returns true for %s', (code) => {
      expect(isSchengenCountry(code)).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isSchengenCountry('fr')).toBe(true);
      expect(isSchengenCountry('Fr')).toBe(true);
      expect(isSchengenCountry('FR')).toBe(true);
    });

    it('handles whitespace', () => {
      expect(isSchengenCountry(' FR ')).toBe(true);
      expect(isSchengenCountry('  DE  ')).toBe(true);
    });
  });

  describe('Schengen microstates', () => {
    it.each([
      ['MC', 'Monaco'],
      ['VA', 'Vatican City'],
      ['SM', 'San Marino'],
      ['AD', 'Andorra'],
    ])('returns true for %s (%s)', (code) => {
      expect(isSchengenCountry(code)).toBe(true);
    });
  });

  describe('country names', () => {
    it.each([
      'France', 'Germany', 'Spain', 'Italy', 'Netherlands',
      'Austria', 'Belgium', 'Switzerland', 'Portugal', 'Greece',
    ])('returns true for %s', (name) => {
      expect(isSchengenCountry(name)).toBe(true);
    });

    it('is case-insensitive for names', () => {
      expect(isSchengenCountry('france')).toBe(true);
      expect(isSchengenCountry('FRANCE')).toBe(true);
      expect(isSchengenCountry('France')).toBe(true);
    });

    it('handles common variations', () => {
      expect(isSchengenCountry('Czechia')).toBe(true);
      expect(isSchengenCountry('Czech Republic')).toBe(true);
      expect(isSchengenCountry('Holland')).toBe(true);
      expect(isSchengenCountry('The Netherlands')).toBe(true);
    });
  });

  describe('excluded countries (common confusion)', () => {
    it('returns false for Ireland (IE) - opted out of Schengen', () => {
      expect(isSchengenCountry('IE')).toBe(false);
      expect(isSchengenCountry('Ireland')).toBe(false);
      expect(isSchengenCountry('IRELAND')).toBe(false);
      expect(isSchengenCountry('Eire')).toBe(false);
    });

    it('returns false for Cyprus (CY) - EU but not Schengen', () => {
      expect(isSchengenCountry('CY')).toBe(false);
      expect(isSchengenCountry('Cyprus')).toBe(false);
      expect(isSchengenCountry('CYPRUS')).toBe(false);
    });

    it('returns false for United Kingdom (GB)', () => {
      expect(isSchengenCountry('GB')).toBe(false);
      expect(isSchengenCountry('UK')).toBe(false);
      expect(isSchengenCountry('United Kingdom')).toBe(false);
      expect(isSchengenCountry('Great Britain')).toBe(false);
      expect(isSchengenCountry('England')).toBe(false);
    });
  });

  describe('invalid inputs', () => {
    it('returns false for null', () => {
      expect(isSchengenCountry(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSchengenCountry(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isSchengenCountry('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isSchengenCountry('   ')).toBe(false);
    });

    it('returns false for unknown country codes', () => {
      expect(isSchengenCountry('XX')).toBe(false);
      expect(isSchengenCountry('ZZ')).toBe(false);
      expect(isSchengenCountry('US')).toBe(false);
      expect(isSchengenCountry('CN')).toBe(false);
    });

    it('returns false for unknown country names', () => {
      expect(isSchengenCountry('Narnia')).toBe(false);
      expect(isSchengenCountry('Atlantis')).toBe(false);
    });
  });
});

describe('validateCountry', () => {
  describe('valid Schengen countries', () => {
    it('returns full details for member countries', () => {
      const result = validateCountry('FR');
      expect(result.isSchengen).toBe(true);
      expect(result.countryCode).toBe('FR');
      expect(result.countryName).toBe('France');
      expect(result.exclusionReason).toBeNull();
      expect(result.isMicrostate).toBe(false);
    });

    it('returns isMicrostate=true for microstates', () => {
      const result = validateCountry('MC');
      expect(result.isSchengen).toBe(true);
      expect(result.countryCode).toBe('MC');
      expect(result.countryName).toBe('Monaco');
      expect(result.isMicrostate).toBe(true);
    });

    it('normalizes country names to codes', () => {
      const result = validateCountry('France');
      expect(result.countryCode).toBe('FR');
    });
  });

  describe('excluded countries', () => {
    it('returns exclusion reason for Ireland', () => {
      const result = validateCountry('IE');
      expect(result.isSchengen).toBe(false);
      expect(result.countryCode).toBe('IE');
      expect(result.countryName).toBe('Ireland');
      expect(result.exclusionReason).toContain('opted out');
    });

    it('returns exclusion reason for Cyprus', () => {
      const result = validateCountry('CY');
      expect(result.isSchengen).toBe(false);
      expect(result.countryCode).toBe('CY');
      expect(result.exclusionReason).toContain('not yet implemented');
    });
  });

  describe('invalid inputs', () => {
    it('returns null values for invalid input', () => {
      const result = validateCountry('XX');
      expect(result.isSchengen).toBe(false);
      expect(result.countryCode).toBeNull();
      expect(result.countryName).toBeNull();
    });
  });
});

describe('normalizeCountryCode', () => {
  it('normalizes valid Schengen names to codes', () => {
    expect(normalizeCountryCode('France')).toBe('FR');
    expect(normalizeCountryCode('germany')).toBe('DE');
    expect(normalizeCountryCode('SPAIN')).toBe('ES');
  });

  it('returns code unchanged for valid codes', () => {
    expect(normalizeCountryCode('FR')).toBe('FR');
    expect(normalizeCountryCode('de')).toBe('DE');
  });

  it('returns null for excluded countries', () => {
    expect(normalizeCountryCode('Ireland')).toBeNull();
    expect(normalizeCountryCode('IE')).toBeNull();
  });

  it('returns null for unknown countries', () => {
    expect(normalizeCountryCode('Narnia')).toBeNull();
  });
});

describe('getSchengenCountryCodes', () => {
  it('returns array of country codes', () => {
    const codes = getSchengenCountryCodes();
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBeGreaterThan(0);
  });

  it('includes all member countries', () => {
    const codes = getSchengenCountryCodes();
    expect(codes).toContain('FR');
    expect(codes).toContain('DE');
    expect(codes).toContain('ES');
  });

  it('includes microstates', () => {
    const codes = getSchengenCountryCodes();
    expect(codes).toContain('MC');
    expect(codes).toContain('VA');
    expect(codes).toContain('SM');
    expect(codes).toContain('AD');
  });

  it('excludes Ireland and Cyprus', () => {
    const codes = getSchengenCountryCodes();
    expect(codes).not.toContain('IE');
    expect(codes).not.toContain('CY');
    expect(codes).not.toContain('GB');
  });

  it('returns sorted array', () => {
    const codes = getSchengenCountryCodes();
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });
});

describe('getSchengenCountries', () => {
  it('returns array of country objects', () => {
    const countries = getSchengenCountries();
    expect(Array.isArray(countries)).toBe(true);
    expect(countries.length).toBeGreaterThan(0);
  });

  it('each entry has code, name, and isMicrostate', () => {
    const countries = getSchengenCountries();
    for (const country of countries) {
      expect(country).toHaveProperty('code');
      expect(country).toHaveProperty('name');
      expect(country).toHaveProperty('isMicrostate');
      expect(typeof country.code).toBe('string');
      expect(typeof country.name).toBe('string');
      expect(typeof country.isMicrostate).toBe('boolean');
    }
  });

  it('marks microstates correctly', () => {
    const countries = getSchengenCountries();
    const monaco = countries.find(c => c.code === 'MC');
    const france = countries.find(c => c.code === 'FR');

    expect(monaco?.isMicrostate).toBe(true);
    expect(france?.isMicrostate).toBe(false);
  });

  it('returns sorted by name', () => {
    const countries = getSchengenCountries();
    const names = countries.map(c => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});

describe('Country Code Validation Edge Cases', () => {
  describe('Invalid/malformed country codes', () => {
    it('returns false for completely invalid country code', () => {
      expect(isSchengenCountry('XYZ')).toBe(false);
      expect(isSchengenCountry('ABC')).toBe(false);
      expect(isSchengenCountry('ZZ')).toBe(false);
    });

    it('returns false for numeric strings', () => {
      expect(isSchengenCountry('123')).toBe(false);
      expect(isSchengenCountry('12')).toBe(false);
      expect(isSchengenCountry('1')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isSchengenCountry('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isSchengenCountry('   ')).toBe(false);
      expect(isSchengenCountry('\t')).toBe(false);
      expect(isSchengenCountry('\n')).toBe(false);
    });

    it('returns false for null and undefined', () => {
      expect(isSchengenCountry(null)).toBe(false);
      expect(isSchengenCountry(undefined)).toBe(false);
    });

    it('returns false for special characters', () => {
      expect(isSchengenCountry('FR!')).toBe(false);
      expect(isSchengenCountry('F@R')).toBe(false);
      expect(isSchengenCountry('FR-DE')).toBe(false);
    });
  });

  describe('Case sensitivity handling', () => {
    it('handles lowercase country codes', () => {
      expect(isSchengenCountry('fr')).toBe(true);
      expect(isSchengenCountry('de')).toBe(true);
    });

    it('handles mixed case country codes', () => {
      expect(isSchengenCountry('Fr')).toBe(true);
      expect(isSchengenCountry('fR')).toBe(true);
    });

    it('handles lowercase country names', () => {
      expect(isSchengenCountry('france')).toBe(true);
      expect(isSchengenCountry('germany')).toBe(true);
    });

    it('handles mixed case country names', () => {
      expect(isSchengenCountry('FrAnCe')).toBe(true);
      expect(isSchengenCountry('GERMANY')).toBe(true);
    });
  });

  describe('Whitespace handling', () => {
    it('trims leading/trailing whitespace', () => {
      expect(isSchengenCountry(' FR ')).toBe(true);
      expect(isSchengenCountry('  France  ')).toBe(true);
    });
  });

  describe('validateCountry returns correct structure for invalid inputs', () => {
    it('returns null fields for invalid code', () => {
      const result = validateCountry('XYZ');
      expect(result.isSchengen).toBe(false);
      expect(result.countryCode).toBeNull();
      expect(result.countryName).toBeNull();
      expect(result.exclusionReason).toBeNull();
      expect(result.isMicrostate).toBe(false);
    });

    it('returns null fields for empty input', () => {
      const result = validateCountry('');
      expect(result.isSchengen).toBe(false);
      expect(result.countryCode).toBeNull();
    });

    it('returns null fields for null input', () => {
      const result = validateCountry(null);
      expect(result.isSchengen).toBe(false);
      expect(result.countryCode).toBeNull();
    });
  });
});
