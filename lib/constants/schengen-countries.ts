/**
 * Schengen Area Country Constants
 *
 * This file contains the authoritative list of countries in the Schengen Area
 * and helper functions for country validation.
 *
 * IMPORTANT: Ireland (IE) and Cyprus (CY) are EU members but NOT in the Schengen Area.
 * Trips to these countries do NOT count toward the 90/180 day limit.
 */

// Full Schengen member countries (29 total as of 2024)
export const SCHENGEN_FULL_MEMBERS = [
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria (full member 2024)
  'HR', // Croatia (full member 2023)
  'CZ', // Czech Republic
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IS', // Iceland (non-EU Schengen)
  'IT', // Italy
  'LV', // Latvia
  'LI', // Liechtenstein (non-EU Schengen)
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'NO', // Norway (non-EU Schengen)
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania (full member 2024)
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
  'CH', // Switzerland (non-EU Schengen)
] as const

// De facto Schengen (microstates with open borders - count toward 90 days)
export const SCHENGEN_MICROSTATES = [
  'MC', // Monaco (via France)
  'VA', // Vatican City (via Italy)
  'SM', // San Marino (via Italy)
  'AD', // Andorra (via France/Spain)
] as const

// EU countries NOT in Schengen - trips here don't count toward 90 days
export const NON_SCHENGEN_EU = [
  'IE', // Ireland - EU but opted out of Schengen
  'CY', // Cyprus - EU but not yet Schengen
] as const

// Combined list of all Schengen countries (33 total)
export const ALL_SCHENGEN_COUNTRIES = [
  ...SCHENGEN_FULL_MEMBERS,
  ...SCHENGEN_MICROSTATES,
] as const

export type SchengenCountryCode = typeof ALL_SCHENGEN_COUNTRIES[number]
export type NonSchengenEUCode = typeof NON_SCHENGEN_EU[number]

// Country name lookup
export const COUNTRY_NAMES: Record<string, string> = {
  // Schengen members
  AT: 'Austria',
  BE: 'Belgium',
  BG: 'Bulgaria',
  HR: 'Croatia',
  CZ: 'Czech Republic',
  DK: 'Denmark',
  EE: 'Estonia',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GR: 'Greece',
  HU: 'Hungary',
  IS: 'Iceland',
  IT: 'Italy',
  LV: 'Latvia',
  LI: 'Liechtenstein',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  NL: 'Netherlands',
  NO: 'Norway',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SK: 'Slovakia',
  SI: 'Slovenia',
  ES: 'Spain',
  SE: 'Sweden',
  CH: 'Switzerland',
  // Microstates
  MC: 'Monaco',
  VA: 'Vatican City',
  SM: 'San Marino',
  AD: 'Andorra',
  // Non-Schengen EU
  IE: 'Ireland',
  CY: 'Cyprus',
  // Other common destinations (for completeness in dropdown)
  GB: 'United Kingdom',
  US: 'United States',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  CN: 'China',
  IN: 'India',
  BR: 'Brazil',
  MX: 'Mexico',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
  HK: 'Hong Kong',
  KR: 'South Korea',
  TW: 'Taiwan',
  TH: 'Thailand',
  ZA: 'South Africa',
  NZ: 'New Zealand',
  TR: 'Turkey',
  RU: 'Russia',
  UA: 'Ukraine',
}

// Ordered list for the country dropdown
export const COUNTRY_LIST = Object.entries(COUNTRY_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name))

/**
 * Check if a country is in the Schengen Area
 */
export function isSchengenCountry(code: string): boolean {
  return ALL_SCHENGEN_COUNTRIES.includes(code.toUpperCase() as SchengenCountryCode)
}

/**
 * Check if a country is EU but not Schengen (IE, CY)
 */
export function isNonSchengenEU(code: string): boolean {
  return NON_SCHENGEN_EU.includes(code.toUpperCase() as NonSchengenEUCode)
}

/**
 * Get the country name from code
 */
export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code.toUpperCase()
}

/**
 * Validate a country code and return its Schengen status
 */
export interface CountryValidationResult {
  valid: boolean
  isSchengen: boolean
  isNonSchengenEU: boolean
  warning: string | null
  error: string | null
}

export function validateCountry(countryCode: string): CountryValidationResult {
  const code = countryCode.toUpperCase().trim()

  // Must be 2 characters
  if (code.length !== 2) {
    return {
      valid: false,
      isSchengen: false,
      isNonSchengenEU: false,
      warning: null,
      error: 'Country code must be 2 letters',
    }
  }

  // Check if it's a known country
  if (!COUNTRY_NAMES[code]) {
    return {
      valid: false,
      isSchengen: false,
      isNonSchengenEU: false,
      warning: null,
      error: 'Unknown country code',
    }
  }

  const schengen = isSchengenCountry(code)
  const nonSchengenEU = isNonSchengenEU(code)

  return {
    valid: true,
    isSchengen: schengen,
    isNonSchengenEU: nonSchengenEU,
    warning: nonSchengenEU
      ? `${getCountryName(code)} is EU but not Schengen. This trip will not count toward the 90-day limit.`
      : null,
    error: null,
  }
}

/**
 * Get the Schengen status badge text for a country
 */
export function getCountryStatusBadge(code: string): {
  text: string
  variant: 'default' | 'secondary' | 'outline'
} {
  if (isSchengenCountry(code)) {
    return { text: 'Schengen', variant: 'default' }
  }
  if (isNonSchengenEU(code)) {
    return { text: 'EU (non-Schengen)', variant: 'secondary' }
  }
  return { text: 'Non-Schengen', variant: 'outline' }
}
