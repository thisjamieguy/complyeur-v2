import { describe, test, expect } from 'vitest'
import {
  SCHENGEN_COUNTRIES,
  SCHENGEN_MICROSTATES,
  EU_NON_SCHENGEN,
  isSchengenCountry,
  getCountryDisplayName,
  getAllSchengenCodes,
  normalizeCountries,
  summarizeCountries,
} from '@/lib/import/country-normalizer'

// The main normalizeCountry function — import it directly
import { normalizeCountry } from '@/lib/import/country-normalizer'

describe('SCHENGEN_COUNTRIES set', () => {
  test('contains core Schengen members', () => {
    expect(SCHENGEN_COUNTRIES.has('FR')).toBe(true)
    expect(SCHENGEN_COUNTRIES.has('DE')).toBe(true)
    expect(SCHENGEN_COUNTRIES.has('IT')).toBe(true)
    expect(SCHENGEN_COUNTRIES.has('ES')).toBe(true)
  })

  test('does NOT contain IE (Ireland — EU but not Schengen)', () => {
    expect(SCHENGEN_COUNTRIES.has('IE')).toBe(false)
  })

  test('does NOT contain CY (Cyprus — EU but not Schengen)', () => {
    expect(SCHENGEN_COUNTRIES.has('CY')).toBe(false)
  })

  test('does NOT contain GB (UK left Schengen)', () => {
    expect(SCHENGEN_COUNTRIES.has('GB')).toBe(false)
  })
})

describe('SCHENGEN_MICROSTATES set', () => {
  test('contains all four microstates', () => {
    expect(SCHENGEN_MICROSTATES.has('AD')).toBe(true) // Andorra
    expect(SCHENGEN_MICROSTATES.has('MC')).toBe(true) // Monaco
    expect(SCHENGEN_MICROSTATES.has('SM')).toBe(true) // San Marino
    expect(SCHENGEN_MICROSTATES.has('VA')).toBe(true) // Vatican
  })
})

describe('EU_NON_SCHENGEN set', () => {
  test('contains Ireland and Cyprus', () => {
    expect(EU_NON_SCHENGEN.has('IE')).toBe(true)
    expect(EU_NON_SCHENGEN.has('CY')).toBe(true)
  })
})

describe('isSchengenCountry', () => {
  test('returns true for Schengen member', () => {
    expect(isSchengenCountry('FR')).toBe(true)
    expect(isSchengenCountry('DE')).toBe(true)
  })

  test('returns true for Schengen microstates', () => {
    expect(isSchengenCountry('MC')).toBe(true) // Monaco
    expect(isSchengenCountry('AD')).toBe(true) // Andorra
  })

  test('returns false for non-Schengen', () => {
    expect(isSchengenCountry('GB')).toBe(false)
    expect(isSchengenCountry('US')).toBe(false)
  })

  test('is case-insensitive', () => {
    expect(isSchengenCountry('fr')).toBe(true)
    expect(isSchengenCountry('Fr')).toBe(true)
  })
})

describe('normalizeCountry', () => {
  describe('empty / null inputs', () => {
    test('returns warning for empty string', () => {
      const result = normalizeCountry('')
      expect(result.code).toBeNull()
      expect(result.warning).toBeTruthy()
    })

    test('returns warning for whitespace-only string', () => {
      const result = normalizeCountry('   ')
      expect(result.code).toBeNull()
    })
  })

  describe('ISO code inputs', () => {
    test('accepts 2-letter Schengen code', () => {
      const result = normalizeCountry('FR')
      expect(result.code).toBe('FR')
      expect(result.isSchengen).toBe(true)
      expect(result.warning).toBeUndefined()
    })

    test('accepts lowercase code', () => {
      const result = normalizeCountry('fr')
      expect(result.code).toBe('FR')
      expect(result.isSchengen).toBe(true)
    })

    test('accepts mixed case code', () => {
      const result = normalizeCountry('Fr')
      expect(result.code).toBe('FR')
    })

    test('returns non-Schengen code with warning for GB', () => {
      const result = normalizeCountry('GB')
      expect(result.code).toBe('GB')
      expect(result.isSchengen).toBe(false)
      expect(result.warning).toContain('not in the Schengen zone')
    })

    test('returns EU non-Schengen warning for Ireland', () => {
      const result = normalizeCountry('IE')
      expect(result.code).toBe('IE')
      expect(result.isSchengen).toBe(false)
      expect(result.isEuNonSchengen).toBe(true)
      expect(result.warning).toContain('EU but NOT in the Schengen')
    })

    test('returns EU non-Schengen warning for Cyprus', () => {
      const result = normalizeCountry('CY')
      expect(result.code).toBe('CY')
      expect(result.isEuNonSchengen).toBe(true)
    })
  })

  describe('country name inputs', () => {
    test('recognizes "Germany"', () => {
      const result = normalizeCountry('Germany')
      expect(result.code).toBe('DE')
      expect(result.isSchengen).toBe(true)
    })

    test('recognizes "France"', () => {
      const result = normalizeCountry('France')
      expect(result.code).toBe('FR')
      expect(result.isSchengen).toBe(true)
    })

    test('recognizes "Italy"', () => {
      const result = normalizeCountry('Italy')
      expect(result.code).toBe('IT')
    })

    test('recognizes "Spain"', () => {
      const result = normalizeCountry('Spain')
      expect(result.code).toBe('ES')
    })

    test('recognizes "Netherlands"', () => {
      const result = normalizeCountry('Netherlands')
      expect(result.code).toBe('NL')
    })

    test('recognizes "United Kingdom"', () => {
      const result = normalizeCountry('United Kingdom')
      expect(result.code).toBe('GB')
      expect(result.isSchengen).toBe(false)
    })

    test('is case insensitive for country names', () => {
      const result = normalizeCountry('GERMANY')
      expect(result.code).toBe('DE')
    })
  })

  describe('microstate inputs', () => {
    test('recognizes Monaco', () => {
      const result = normalizeCountry('MC')
      expect(result.code).toBe('MC')
      expect(result.isSchengen).toBe(true)
      expect(result.isMicrostate).toBe(true)
    })

    test('recognizes Andorra', () => {
      const result = normalizeCountry('AD')
      expect(result.isSchengen).toBe(true)
      expect(result.isMicrostate).toBe(true)
    })
  })

  describe('unrecognized codes', () => {
    test('returns unrecognized warning for unknown 2-letter code', () => {
      const result = normalizeCountry('XX')
      expect(result.code).toBe('XX')
      expect(result.isSchengen).toBe(false)
      expect(result.warning).toContain('Unrecognized country code')
    })

    test('returns specific warning for 3-letter codes', () => {
      // Use a 3-letter code that is definitely not in the name map
      const result = normalizeCountry('ZZZ')
      expect(result.code).toBeNull()
      expect(result.warning).toContain('3-letter code')
    })

    test('returns generic warning for unrecognized name', () => {
      const result = normalizeCountry('Narnia')
      expect(result.code).toBeNull()
      expect(result.warning).toContain('Could not recognize country')
    })
  })

  describe('result structure', () => {
    test('always includes original input', () => {
      const result = normalizeCountry('France')
      expect(result.original).toBe('France')
    })

    test('includes displayName for known countries', () => {
      const result = normalizeCountry('DE')
      expect(result.displayName).toBeTruthy()
    })
  })

  describe('non-Schengen non-EU non-GB warning', () => {
    test('returns not-in-Schengen warning for non-EU non-Schengen country with display name', () => {
      // US is a known country (has a display name) but not Schengen, not EU, not GB
      const result = normalizeCountry('US')
      expect(result.code).toBe('US')
      expect(result.isSchengen).toBe(false)
      expect(result.isEuNonSchengen).toBe(false)
      expect(result.warning).toContain('not in the Schengen zone')
    })
  })
})

describe('getCountryDisplayName', () => {
  test('returns display name for known code', () => {
    expect(getCountryDisplayName('FR')).toBeTruthy()
    expect(getCountryDisplayName('DE')).toBeTruthy()
  })

  test('is case-insensitive', () => {
    expect(getCountryDisplayName('fr')).toBe(getCountryDisplayName('FR'))
  })

  test('returns the code itself for unknown code', () => {
    expect(getCountryDisplayName('ZZ')).toBe('ZZ')
  })
})

describe('getAllSchengenCodes', () => {
  test('returns an array of strings', () => {
    const codes = getAllSchengenCodes()
    expect(Array.isArray(codes)).toBe(true)
    expect(codes.length).toBeGreaterThan(0)
  })

  test('includes core Schengen members', () => {
    const codes = getAllSchengenCodes()
    expect(codes).toContain('FR')
    expect(codes).toContain('DE')
  })

  test('includes microstates', () => {
    const codes = getAllSchengenCodes()
    expect(codes).toContain('MC') // Monaco
  })
})

describe('normalizeCountries', () => {
  test('maps an array of country strings to normalization results', () => {
    const results = normalizeCountries(['FR', 'DE', 'GB'])
    expect(results).toHaveLength(3)
    expect(results[0].code).toBe('FR')
    expect(results[1].code).toBe('DE')
    expect(results[2].code).toBe('GB')
  })

  test('returns empty array for empty input', () => {
    expect(normalizeCountries([])).toEqual([])
  })
})

describe('summarizeCountries', () => {
  test('counts schengen, non-schengen, and unrecognized', () => {
    const summary = summarizeCountries(['FR', 'DE', 'GB', 'US', 'ZZZ'])
    expect(summary.total).toBe(5)
    expect(summary.schengen).toBeGreaterThanOrEqual(2) // FR, DE
    expect(summary.nonSchengen).toBeGreaterThanOrEqual(2) // GB, US
  })

  test('counts unrecognized codes', () => {
    const summary = summarizeCountries(['NARNIA', ''])
    expect(summary.unrecognized).toBeGreaterThanOrEqual(1)
  })

  test('tracks per-country counts', () => {
    const summary = summarizeCountries(['FR', 'FR', 'DE'])
    expect(summary.byCountry.get('FR')).toBe(2)
    expect(summary.byCountry.get('DE')).toBe(1)
  })
})
