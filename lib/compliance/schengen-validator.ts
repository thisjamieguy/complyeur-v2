/**
 * @fileoverview Schengen country validation functions.
 *
 * Validates whether a country code or name is part of the Schengen Area.
 * Explicitly rejects Ireland and Cyprus (common points of confusion).
 *
 * @version 2025-01-07
 * @see EU Regulation 610/2013 (Schengen Borders Code)
 */

import {
  SCHENGEN_COUNTRY_CODES,
  EXCLUDED_COUNTRY_CODES,
  SCHENGEN_NAME_TO_CODE,
  EXCLUDED_NAME_TO_CODE,
  SCHENGEN_MEMBERSHIP,
} from './constants';

/**
 * Result of country validation with detailed information.
 */
export interface CountryValidationResult {
  /** Whether the country is in the Schengen Area */
  readonly isSchengen: boolean;
  /** Normalized ISO 3166-1 alpha-2 code (if recognized) */
  readonly countryCode: string | null;
  /** Full country name (if recognized) */
  readonly countryName: string | null;
  /** If excluded, the reason why */
  readonly exclusionReason: string | null;
  /** Whether this is a microstate with open borders */
  readonly isMicrostate: boolean;
}

/**
 * Validates if a country code or name is in the Schengen Area.
 *
 * This function is the primary validator for determining if a trip
 * should count toward the 90-day limit. It:
 * - Accepts ISO 3166-1 alpha-2 codes (e.g., 'FR', 'DE')
 * - Accepts full country names (e.g., 'France', 'Germany')
 * - Is case-insensitive
 * - Explicitly rejects Ireland (IE) and Cyprus (CY)
 * - Includes microstates (Monaco, Vatican, San Marino, Andorra)
 *
 * @param countryCodeOrName - ISO country code or full country name
 * @returns true if the country is in the Schengen Area
 *
 * @example
 * isSchengenCountry('FR')      // true
 * isSchengenCountry('France')  // true
 * isSchengenCountry('IE')      // false (Ireland opted out)
 * isSchengenCountry('MC')      // true (Monaco has open border with France)
 * isSchengenCountry('')        // false
 * isSchengenCountry(null)      // false
 */
export function isSchengenCountry(countryCodeOrName: string | null | undefined): boolean {
  // Handle null/undefined/empty
  if (!countryCodeOrName || typeof countryCodeOrName !== 'string') {
    return false;
  }

  const normalized = countryCodeOrName.trim().toUpperCase();

  // Empty after trim
  if (normalized.length === 0) {
    return false;
  }

  // Check explicit exclusions first (Ireland, Cyprus, UK)
  if (EXCLUDED_COUNTRY_CODES.has(normalized)) {
    return false;
  }
  if (EXCLUDED_NAME_TO_CODE.has(normalized)) {
    return false;
  }

  // Check if it's a valid Schengen country code
  if (SCHENGEN_COUNTRY_CODES.has(normalized)) {
    return true;
  }

  // Check if it's a valid Schengen country name
  if (SCHENGEN_NAME_TO_CODE.has(normalized)) {
    return true;
  }

  // Not recognized as Schengen
  return false;
}

/**
 * Validates a country and returns detailed information.
 *
 * Use this when you need more than just a boolean result,
 * such as displaying the country name or explaining why
 * a country is excluded.
 *
 * @param countryCodeOrName - ISO country code or full country name
 * @returns Detailed validation result
 *
 * @example
 * validateCountry('FR')
 * // {
 * //   isSchengen: true,
 * //   countryCode: 'FR',
 * //   countryName: 'France',
 * //   exclusionReason: null,
 * //   isMicrostate: false
 * // }
 *
 * validateCountry('IE')
 * // {
 * //   isSchengen: false,
 * //   countryCode: 'IE',
 * //   countryName: 'Ireland',
 * //   exclusionReason: 'EU member, opted out of Schengen',
 * //   isMicrostate: false
 * // }
 */
export function validateCountry(
  countryCodeOrName: string | null | undefined
): CountryValidationResult {
  // Default result for invalid input
  const invalidResult: CountryValidationResult = {
    isSchengen: false,
    countryCode: null,
    countryName: null,
    exclusionReason: null,
    isMicrostate: false,
  };

  if (!countryCodeOrName || typeof countryCodeOrName !== 'string') {
    return invalidResult;
  }

  const normalized = countryCodeOrName.trim().toUpperCase();

  if (normalized.length === 0) {
    return invalidResult;
  }

  // Check explicit exclusions first
  if (EXCLUDED_COUNTRY_CODES.has(normalized)) {
    const excluded = SCHENGEN_MEMBERSHIP.excluded[normalized];
    return {
      isSchengen: false,
      countryCode: normalized,
      countryName: excluded?.name ?? null,
      exclusionReason: excluded?.reason ?? 'Explicitly excluded from Schengen',
      isMicrostate: false,
    };
  }

  // Check excluded by name
  const excludedCode = EXCLUDED_NAME_TO_CODE.get(normalized);
  if (excludedCode) {
    const excluded = SCHENGEN_MEMBERSHIP.excluded[excludedCode];
    return {
      isSchengen: false,
      countryCode: excludedCode,
      countryName: excluded?.name ?? null,
      exclusionReason: excluded?.reason ?? 'Explicitly excluded from Schengen',
      isMicrostate: false,
    };
  }

  // Check if it's a valid Schengen country code
  if (SCHENGEN_COUNTRY_CODES.has(normalized)) {
    // Check if it's a member or microstate
    const member = SCHENGEN_MEMBERSHIP.members[normalized];
    if (member) {
      return {
        isSchengen: true,
        countryCode: normalized,
        countryName: member.name,
        exclusionReason: null,
        isMicrostate: false,
      };
    }

    const microstate = SCHENGEN_MEMBERSHIP.microstates[normalized];
    if (microstate) {
      return {
        isSchengen: true,
        countryCode: normalized,
        countryName: microstate.name,
        exclusionReason: null,
        isMicrostate: true,
      };
    }
  }

  // Check if it's a valid Schengen country name
  const schengenCode = SCHENGEN_NAME_TO_CODE.get(normalized);
  if (schengenCode) {
    const member = SCHENGEN_MEMBERSHIP.members[schengenCode];
    if (member) {
      return {
        isSchengen: true,
        countryCode: schengenCode,
        countryName: member.name,
        exclusionReason: null,
        isMicrostate: false,
      };
    }

    const microstate = SCHENGEN_MEMBERSHIP.microstates[schengenCode];
    if (microstate) {
      return {
        isSchengen: true,
        countryCode: schengenCode,
        countryName: microstate.name,
        exclusionReason: null,
        isMicrostate: true,
      };
    }
  }

  // Not recognized
  return invalidResult;
}

/**
 * Normalizes a country input to its ISO 3166-1 alpha-2 code.
 *
 * Returns the country code if the input is a valid Schengen country,
 * or null if not recognized or excluded.
 *
 * @param countryCodeOrName - ISO country code or full country name
 * @returns Normalized country code or null
 *
 * @example
 * normalizeCountryCode('france')   // 'FR'
 * normalizeCountryCode('FR')       // 'FR'
 * normalizeCountryCode('Monaco')   // 'MC'
 * normalizeCountryCode('Ireland')  // null (excluded)
 * normalizeCountryCode('XYZ')      // null (unknown)
 */
export function normalizeCountryCode(
  countryCodeOrName: string | null | undefined
): string | null {
  const result = validateCountry(countryCodeOrName);
  return result.isSchengen ? result.countryCode : null;
}

/**
 * Gets the list of all Schengen country codes.
 *
 * Useful for populating dropdowns or validating bulk data.
 *
 * @returns Array of ISO 3166-1 alpha-2 codes for all Schengen countries
 *
 * @example
 * const codes = getSchengenCountryCodes();
 * // ['AT', 'BE', 'BG', ..., 'MC', 'VA', 'SM', 'AD']
 */
export function getSchengenCountryCodes(): readonly string[] {
  return Array.from(SCHENGEN_COUNTRY_CODES).sort();
}

/**
 * Gets the list of all Schengen countries with their names.
 *
 * Useful for displaying country selection UI.
 *
 * @returns Array of { code, name, isMicrostate } objects
 */
export function getSchengenCountries(): readonly {
  code: string;
  name: string;
  isMicrostate: boolean;
}[] {
  const countries: { code: string; name: string; isMicrostate: boolean }[] = [];

  // Add full members
  for (const [code, data] of Object.entries(SCHENGEN_MEMBERSHIP.members)) {
    countries.push({ code, name: data.name, isMicrostate: false });
  }

  // Add microstates
  for (const [code, data] of Object.entries(SCHENGEN_MEMBERSHIP.microstates)) {
    countries.push({ code, name: data.name, isMicrostate: true });
  }

  // Sort by name
  return countries.sort((a, b) => a.name.localeCompare(b.name));
}
