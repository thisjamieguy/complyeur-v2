/**
 * @fileoverview Unit tests for Gantt cell parser.
 *
 * Tests the parsing of cell values to extract country codes from
 * various job/project description formats.
 *
 * Key patterns tested:
 * - "PREFIX-CC-SUFFIX" → CC (country code after first hyphen)
 * - "tr-CC" → CC (travel day)
 * - "n/w-CC" → CC (non-working, still counts as being abroad)
 * - Non-counting values (hol, sick, etc.)
 * - Bug regression: 3+ letter codes should NOT be truncated to 2 letters
 */

import { describe, test, expect } from 'vitest';
import { parseCell } from '../cell-parser';

describe('parseCell', () => {
  describe('standard job description patterns', () => {
    test('extracts country code from "PREFIX-CC-SUFFIX" format', () => {
      const result = parseCell('HP-DE-DP38 Install', 0, 0);
      expect(result.countryCode).toBe('DE');
      expect(result.isSchengen).toBe(true);
      expect(result.isTravelDay).toBe(false);
      expect(result.countsAsDay).toBe(true);
    });

    test('extracts Belgium from project code', () => {
      const result = parseCell('Axc-BE-GSD & Purion', 0, 0);
      expect(result.countryCode).toBe('BE');
      expect(result.isSchengen).toBe(true);
    });

    test('extracts France with multiple hyphens', () => {
      const result = parseCell('ST-FR-Crolles-6x Implanters', 0, 0);
      expect(result.countryCode).toBe('FR');
      expect(result.isSchengen).toBe(true);
    });

    test('extracts Italy from project code', () => {
      const result = parseCell('NMG-IT-Rome Project', 0, 0);
      expect(result.countryCode).toBe('IT');
      expect(result.isSchengen).toBe(true);
    });

    test('extracts Netherlands from simple format', () => {
      const result = parseCell('ABC-NL', 0, 0);
      expect(result.countryCode).toBe('NL');
      expect(result.isSchengen).toBe(true);
    });
  });

  describe('travel day prefix (tr-XX)', () => {
    test('parses tr-DE as travel day to Germany', () => {
      const result = parseCell('tr-DE', 0, 0);
      expect(result.countryCode).toBe('DE');
      expect(result.isTravelDay).toBe(true);
      expect(result.isSchengen).toBe(true);
      expect(result.countsAsDay).toBe(true);
    });

    test('parses tr-FR as travel day to France', () => {
      const result = parseCell('tr-FR', 0, 0);
      expect(result.countryCode).toBe('FR');
      expect(result.isTravelDay).toBe(true);
    });

    test('handles TR uppercase', () => {
      const result = parseCell('TR-BE', 0, 0);
      expect(result.countryCode).toBe('BE');
      expect(result.isTravelDay).toBe(true);
    });

    test('handles tr with space separator', () => {
      const result = parseCell('tr DE', 0, 0);
      // Pattern expects hyphen after tr, so this may not match as travel
      // But should still try to extract country code
      expect(result.rawValue).toBe('tr DE');
    });

    test('tr/ slash separator does not work (hyphen required)', () => {
      // "tr/DE" is NOT a valid travel day format
      // Country extraction requires hyphen separator (tr-DE not tr/DE)
      // When no country is extracted, isTravelDay is also false
      const result = parseCell('tr/DE', 0, 0);
      expect(result.countryCode).toBe(null);
      expect(result.isTravelDay).toBe(false);
    });
  });

  describe('non-working prefix (n/w-XX)', () => {
    test('parses n/w-BE as Belgium (not working but still abroad)', () => {
      const result = parseCell('n/w-BE', 0, 0);
      expect(result.countryCode).toBe('BE');
      expect(result.isSchengen).toBe(true);
      expect(result.isTravelDay).toBe(false);
      expect(result.countsAsDay).toBe(true);
    });

    test('parses n/w-DE as Germany', () => {
      const result = parseCell('n/w-DE', 0, 0);
      expect(result.countryCode).toBe('DE');
      expect(result.isSchengen).toBe(true);
    });

    test('parses n/w-FR-client with suffix', () => {
      const result = parseCell('n/w-FR-SomeClient', 0, 0);
      expect(result.countryCode).toBe('FR');
    });

    test('handles N/W uppercase', () => {
      const result = parseCell('N/W-IT', 0, 0);
      expect(result.countryCode).toBe('IT');
    });

    test('n/w alone without country does not match', () => {
      // "n/w" by itself is in NON_COUNTING_VALUES
      const result = parseCell('n/w', 0, 0);
      expect(result.countryCode).toBe(null);
      expect(result.countsAsDay).toBe(false);
    });
  });

  describe('standalone 2-letter country codes', () => {
    test('parses standalone FR as France', () => {
      const result = parseCell('FR', 0, 0);
      expect(result.countryCode).toBe('FR');
      expect(result.isSchengen).toBe(true);
    });

    test('parses standalone DE as Germany', () => {
      const result = parseCell('DE', 0, 0);
      expect(result.countryCode).toBe('DE');
    });

    test('parses lowercase de as Germany', () => {
      const result = parseCell('de', 0, 0);
      expect(result.countryCode).toBe('DE');
    });

    test('parses standalone IT as Italy', () => {
      const result = parseCell('IT', 0, 0);
      expect(result.countryCode).toBe('IT');
    });
  });

  describe('UK to GB conversion', () => {
    test('converts UK to GB in prefix-CC format', () => {
      const result = parseCell('ABC-UK-Client', 0, 0);
      expect(result.countryCode).toBe('GB');
      expect(result.isSchengen).toBe(false);
      expect(result.countsAsDay).toBe(false); // UK is not Schengen
    });

    test('converts standalone UK to GB', () => {
      const result = parseCell('UK', 0, 0);
      expect(result.countryCode).toBe('GB');
    });

    test('converts n/w-UK to GB', () => {
      const result = parseCell('n/w-UK', 0, 0);
      expect(result.countryCode).toBe('GB');
    });
  });

  describe('non-counting values', () => {
    test.each([
      'hol',
      'HOL',
      'holiday',
      'Holiday',
      'annual leave',
      'al',
      'AL',
      'wfh',
      'WFH',
      'work from home',
      'home',
      'remote',
      'off',
      'sick',
      's/d',
      'sl',
      'sick leave',
      'leave',
      'bank holiday',
      'bh',
      '',
      '-',
      'n/a',
      'na',
      'x',
      'none',
      'blank',
      'null',
      'free',
      'available',
      'unallocated',
      'other duties',
      ' ',
      'tr', // Just "tr" without country
    ])('treats "%s" as non-counting', (value) => {
      const result = parseCell(value, 0, 0);
      expect(result.countryCode).toBe(null);
      expect(result.countsAsDay).toBe(false);
    });
  });

  describe('BUG FIX: 3+ letter codes should NOT be truncated', () => {
    test('PAC-IES-Client should NOT match Ireland (IE)', () => {
      // This was the original bug - IES was being truncated to IE
      const result = parseCell('PAC-IES-Client', 0, 0);
      expect(result.countryCode).not.toBe('IE');
      expect(result.countryCode).toBe(null);
      expect(result.countsAsDay).toBe(false);
    });

    test('ABC-DEF-GHI should NOT match Germany (DE)', () => {
      const result = parseCell('ABC-DEF-GHI', 0, 0);
      expect(result.countryCode).not.toBe('DE');
      expect(result.countryCode).toBe(null);
    });

    test('XYZ-FRA-Paris should NOT match France (FR)', () => {
      // FRA is 3 letters, should not be truncated to FR
      const result = parseCell('XYZ-FRA-Paris', 0, 0);
      expect(result.countryCode).not.toBe('FR');
      expect(result.countryCode).toBe(null);
    });

    test('PRJ-GER-Berlin should NOT match Germany', () => {
      // GER is 3 letters, not a valid 2-letter code
      const result = parseCell('PRJ-GER-Berlin', 0, 0);
      expect(result.countryCode).toBe(null);
    });

    test('WORK-ESP-Madrid should NOT match Spain (ES)', () => {
      const result = parseCell('WORK-ESP-Madrid', 0, 0);
      expect(result.countryCode).not.toBe('ES');
      expect(result.countryCode).toBe(null);
    });
  });

  describe('Schengen vs non-Schengen classification', () => {
    test('Germany (DE) is Schengen', () => {
      const result = parseCell('ABC-DE', 0, 0);
      expect(result.isSchengen).toBe(true);
      expect(result.countsAsDay).toBe(true);
    });

    test('France (FR) is Schengen', () => {
      const result = parseCell('ABC-FR', 0, 0);
      expect(result.isSchengen).toBe(true);
    });

    test('Ireland (IE) is NOT Schengen', () => {
      const result = parseCell('ABC-IE', 0, 0);
      expect(result.countryCode).toBe('IE');
      expect(result.isSchengen).toBe(false);
      expect(result.countsAsDay).toBe(false);
    });

    test('United Kingdom (GB) is NOT Schengen', () => {
      const result = parseCell('ABC-GB', 0, 0);
      expect(result.isSchengen).toBe(false);
      expect(result.countsAsDay).toBe(false);
    });

    test('Cyprus (CY) is NOT Schengen', () => {
      const result = parseCell('ABC-CY', 0, 0);
      expect(result.isSchengen).toBe(false);
    });

    test('Bulgaria (BG) is NOT Schengen', () => {
      const result = parseCell('ABC-BG', 0, 0);
      expect(result.isSchengen).toBe(false);
    });
  });

  describe('row and column indices', () => {
    test('preserves row and column indices', () => {
      const result = parseCell('HP-DE', 5, 10);
      expect(result.rowIndex).toBe(5);
      expect(result.colIndex).toBe(10);
    });

    test('preserves raw value', () => {
      const result = parseCell('HP-DE-Project', 0, 0);
      expect(result.rawValue).toBe('HP-DE-Project');
    });
  });

  describe('edge cases', () => {
    test('handles null value', () => {
      const result = parseCell(null, 0, 0);
      expect(result.countryCode).toBe(null);
      expect(result.countsAsDay).toBe(false);
    });

    test('handles undefined value', () => {
      const result = parseCell(undefined, 0, 0);
      expect(result.countryCode).toBe(null);
    });

    test('handles number value', () => {
      const result = parseCell(123, 0, 0);
      expect(result.rawValue).toBe('123');
      expect(result.countryCode).toBe(null);
    });

    test('handles whitespace around value', () => {
      const result = parseCell('  HP-DE  ', 0, 0);
      expect(result.countryCode).toBe('DE');
    });

    test('handles mixed case country codes', () => {
      const result = parseCell('ABC-de-Project', 0, 0);
      expect(result.countryCode).toBe('DE');
    });

    test('single hyphen with no country returns null', () => {
      const result = parseCell('ABC-', 0, 0);
      expect(result.countryCode).toBe(null);
    });

    test('unrecognized 2-letter code after hyphen returns null', () => {
      // ZZ is not a known country code
      const result = parseCell('ABC-ZZ-Project', 0, 0);
      expect(result.countryCode).toBe(null);
    });

    test('handles special characters in suffix', () => {
      const result = parseCell('HP-DE-Project#123!@', 0, 0);
      expect(result.countryCode).toBe('DE');
    });
  });

  describe('real-world examples from user data', () => {
    test('HP-DE-DP38 Install → Germany', () => {
      expect(parseCell('HP-DE-DP38 Install', 0, 0).countryCode).toBe('DE');
    });

    test('Axc-BE-GSD & Purion → Belgium', () => {
      expect(parseCell('Axc-BE-GSD & Purion', 0, 0).countryCode).toBe('BE');
    });

    test('ST-FR-Crolles-6x Implanters → France', () => {
      expect(parseCell('ST-FR-Crolles-6x Implanters', 0, 0).countryCode).toBe('FR');
    });

    test('tr-DE → Germany (travel day)', () => {
      const result = parseCell('tr-DE', 0, 0);
      expect(result.countryCode).toBe('DE');
      expect(result.isTravelDay).toBe(true);
    });

    test('n/w-BE → Belgium (non-working)', () => {
      const result = parseCell('n/w-BE', 0, 0);
      expect(result.countryCode).toBe('BE');
      expect(result.isTravelDay).toBe(false);
    });
  });

  describe('all Schengen countries', () => {
    const schengenCodes = [
      'AT', // Austria
      'BE', // Belgium
      'CH', // Switzerland
      'CZ', // Czech Republic
      'DE', // Germany
      'DK', // Denmark
      'EE', // Estonia
      'ES', // Spain
      'FI', // Finland
      'FR', // France
      'GR', // Greece
      'HR', // Croatia
      'HU', // Hungary
      'IS', // Iceland
      'IT', // Italy
      'LI', // Liechtenstein
      'LT', // Lithuania
      'LU', // Luxembourg
      'LV', // Latvia
      'MT', // Malta
      'NL', // Netherlands
      'NO', // Norway
      'PL', // Poland
      'PT', // Portugal
      'SE', // Sweden
      'SI', // Slovenia
      'SK', // Slovakia
    ];

    test.each(schengenCodes)('%s is recognized as Schengen', (code) => {
      const result = parseCell(`ABC-${code}`, 0, 0);
      expect(result.countryCode).toBe(code);
      expect(result.isSchengen).toBe(true);
      expect(result.countsAsDay).toBe(true);
    });
  });
});
