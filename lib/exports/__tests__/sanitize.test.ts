/**
 * @fileoverview Tests for CSV injection prevention.
 * Phase 12: Exports & Reporting - Item #104 (CRITICAL)
 *
 * These tests verify that the sanitization functions properly
 * prevent CSV injection attacks.
 */

import { describe, test, expect } from 'vitest'
import {
  sanitizeCsvValue,
  sanitizeCsvRow,
  toCsvRow,
  isPotentialCsvInjection,
} from '../sanitize'

describe('CSV Injection Prevention', () => {
  describe('sanitizeCsvValue', () => {
    test('prefixes = with single quote', () => {
      expect(sanitizeCsvValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
      expect(sanitizeCsvValue("=cmd|'/C calc'!A0")).toBe("'=cmd|'/C calc'!A0")
    })

    test('prefixes + with single quote', () => {
      expect(sanitizeCsvValue('+1234567890')).toBe("'+1234567890")
      expect(sanitizeCsvValue('+49123456789')).toBe("'+49123456789")
    })

    test('prefixes - with single quote', () => {
      expect(sanitizeCsvValue('-Revenue')).toBe("'-Revenue")
      expect(sanitizeCsvValue('-100')).toBe("'-100")
    })

    test('prefixes @ with single quote', () => {
      expect(sanitizeCsvValue('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)")
      expect(sanitizeCsvValue('@username')).toBe("'@username")
    })

    test('handles tab character', () => {
      expect(sanitizeCsvValue('\tmalicious')).toBe("'\tmalicious")
    })

    test('handles carriage return', () => {
      expect(sanitizeCsvValue('\rmalicious')).toBe("'\rmalicious")
    })

    test('handles newline', () => {
      // Newline at start: prefix with quote AND wrap in quotes (contains newline)
      expect(sanitizeCsvValue('\nmalicious')).toBe("\"'\nmalicious\"")
    })

    test('handles normal text unchanged', () => {
      expect(sanitizeCsvValue('John Smith')).toBe('John Smith')
      expect(sanitizeCsvValue('Regular text')).toBe('Regular text')
      expect(sanitizeCsvValue('Name123')).toBe('Name123')
    })

    test('handles names with commas (CSV special char)', () => {
      expect(sanitizeCsvValue("O'Brien, Mary")).toBe("\"O'Brien, Mary\"")
      expect(sanitizeCsvValue('Smith, John')).toBe('"Smith, John"')
    })

    test('handles names with quotes', () => {
      expect(sanitizeCsvValue('John "Jack" Smith')).toBe('"John ""Jack"" Smith"')
    })

    test('handles names with newlines', () => {
      expect(sanitizeCsvValue('Line1\nLine2')).toBe('"Line1\nLine2"')
    })

    test('handles empty string', () => {
      expect(sanitizeCsvValue('')).toBe('')
    })

    test('handles null', () => {
      expect(sanitizeCsvValue(null)).toBe('')
    })

    test('handles undefined', () => {
      expect(sanitizeCsvValue(undefined)).toBe('')
    })

    test('handles dangerous character with special chars', () => {
      // A value that starts with = AND contains a comma
      expect(sanitizeCsvValue('=SUM(A1,B1)')).toBe("\"'=SUM(A1,B1)\"")
    })

    // Real-world attack patterns
    test('prevents DDE attack pattern 1', () => {
      expect(sanitizeCsvValue("=cmd|'/C calc'!A0")).toBe("'=cmd|'/C calc'!A0")
    })

    test('prevents DDE attack pattern 2', () => {
      expect(sanitizeCsvValue("=HYPERLINK(\"http://evil.com\")")).toBe(
        "\"'=HYPERLINK(\"\"http://evil.com\"\")\""
      )
    })

    test('prevents formula with whitespace trick', () => {
      expect(sanitizeCsvValue(' =SUM(A1)')).toBe(' =SUM(A1)') // Safe - doesn't start with =
    })

    // International characters
    test('handles international characters', () => {
      expect(sanitizeCsvValue('José García')).toBe('José García')
      expect(sanitizeCsvValue('山田太郎')).toBe('山田太郎')
      expect(sanitizeCsvValue('Müller')).toBe('Müller')
    })
  })

  describe('sanitizeCsvRow', () => {
    test('sanitizes array of values', () => {
      const input = ['John', '=SUM()', 'Regular']
      const result = sanitizeCsvRow(input)
      expect(result).toEqual(['John', "'=SUM()", 'Regular'])
    })

    test('handles numbers', () => {
      const input = [42, 'text', 0]
      const result = sanitizeCsvRow(input)
      expect(result).toEqual(['42', 'text', '0'])
    })

    test('handles null and undefined', () => {
      const input = [null, undefined, 'text']
      const result = sanitizeCsvRow(input)
      expect(result).toEqual(['', '', 'text'])
    })
  })

  describe('toCsvRow', () => {
    test('joins values with comma', () => {
      const input = ['John', 'Smith', '45']
      const result = toCsvRow(input)
      expect(result).toBe('John,Smith,45')
    })

    test('joins values with custom delimiter', () => {
      const input = ['John', 'Smith', '45']
      const result = toCsvRow(input, ';')
      expect(result).toBe('John;Smith;45')
    })

    test('sanitizes values before joining', () => {
      const input = ['John', '=SUM()', '45']
      const result = toCsvRow(input)
      expect(result).toBe("John,'=SUM(),45")
    })
  })

  describe('isPotentialCsvInjection', () => {
    test('detects = as injection attempt', () => {
      expect(isPotentialCsvInjection('=SUM(A1)')).toBe(true)
    })

    test('detects + as injection attempt', () => {
      expect(isPotentialCsvInjection('+123')).toBe(true)
    })

    test('detects - as injection attempt', () => {
      expect(isPotentialCsvInjection('-123')).toBe(true)
    })

    test('detects @ as injection attempt', () => {
      expect(isPotentialCsvInjection('@SUM')).toBe(true)
    })

    test('detects tab as injection attempt', () => {
      expect(isPotentialCsvInjection('\tvalue')).toBe(true)
    })

    test('returns false for safe values', () => {
      expect(isPotentialCsvInjection('John Smith')).toBe(false)
      expect(isPotentialCsvInjection('Regular text')).toBe(false)
      expect(isPotentialCsvInjection('123')).toBe(false)
    })

    test('returns false for null/undefined/empty', () => {
      expect(isPotentialCsvInjection(null)).toBe(false)
      expect(isPotentialCsvInjection(undefined)).toBe(false)
      expect(isPotentialCsvInjection('')).toBe(false)
    })
  })
})

describe('Edge Cases', () => {
  test('handles very long strings', () => {
    const longString = 'A'.repeat(10000)
    expect(sanitizeCsvValue(longString)).toBe(longString)
  })

  test('handles very long dangerous string', () => {
    const longDangerous = '=' + 'A'.repeat(10000)
    expect(sanitizeCsvValue(longDangerous)).toBe("'=" + 'A'.repeat(10000))
  })

  test('handles unicode special characters', () => {
    expect(sanitizeCsvValue('Test\u0000Value')).toBe('Test\u0000Value')
    expect(sanitizeCsvValue('\u200BInvisible')).toBe('\u200BInvisible')
  })

  test('handles emoji', () => {
    expect(sanitizeCsvValue('John 😀 Smith')).toBe('John 😀 Smith')
  })
})
