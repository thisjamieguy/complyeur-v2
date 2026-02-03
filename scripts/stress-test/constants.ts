/**
 * @fileoverview Constants for stress test suite.
 */

/**
 * Schengen countries (33 total).
 * These count toward the 90/180-day rule.
 */
export const SCHENGEN_COUNTRIES = [
  // 27 Full members
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria (full member Jan 2025)
  'HR', // Croatia
  'CZ', // Czech Republic
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IS', // Iceland
  'IT', // Italy
  'LV', // Latvia
  'LI', // Liechtenstein
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'NO', // Norway
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania (full member Jan 2025)
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
  'CH', // Switzerland
  // 4 Microstates (open borders)
  'MC', // Monaco
  'VA', // Vatican City
  'SM', // San Marino
  'AD', // Andorra
] as const;

/**
 * Non-Schengen countries for testing.
 * These are stored but don't count toward 90/180.
 */
export const NON_SCHENGEN_COUNTRIES = [
  // EU but not Schengen
  'IE', // Ireland (opted out)
  'CY', // Cyprus (not yet implemented)
  // Non-EU
  'GB', // United Kingdom
  'US', // United States
  'CA', // Canada
  'JP', // Japan
  'AU', // Australia
  'NZ', // New Zealand
  'BR', // Brazil
  'AR', // Argentina
  'MX', // Mexico
  'CN', // China
  'IN', // India
  'KR', // South Korea
  'SG', // Singapore
  'TH', // Thailand
  'ZA', // South Africa
  'TR', // Turkey
  'AE', // UAE
  'SA', // Saudi Arabia
] as const;

/**
 * Set of Schengen codes for O(1) lookup.
 */
export const SCHENGEN_SET = new Set(SCHENGEN_COUNTRIES);

/**
 * All countries combined (51 total).
 */
export const ALL_COUNTRIES = [...SCHENGEN_COUNTRIES, ...NON_SCHENGEN_COUNTRIES] as const;

/**
 * Country names for display.
 */
export const COUNTRY_NAMES: Record<string, string> = {
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
  MC: 'Monaco',
  VA: 'Vatican City',
  SM: 'San Marino',
  AD: 'Andorra',
  IE: 'Ireland',
  CY: 'Cyprus',
  GB: 'United Kingdom',
  US: 'United States',
  CA: 'Canada',
  JP: 'Japan',
  AU: 'Australia',
  NZ: 'New Zealand',
  BR: 'Brazil',
  AR: 'Argentina',
  MX: 'Mexico',
  CN: 'China',
  IN: 'India',
  KR: 'South Korea',
  SG: 'Singapore',
  TH: 'Thailand',
  ZA: 'South Africa',
  TR: 'Turkey',
  AE: 'UAE',
  SA: 'Saudi Arabia',
};

/**
 * Default generator configuration.
 */
export const DEFAULT_CONFIG = {
  seed: 12345,
  targetTotalDays: 150000,
  employeeCount: 100,
  schengenRatio: 0.7,
  startDate: '2025-01-01',
  endDate: '2026-12-31',
  minTripDays: 1,
  maxTripDays: 30,
  overlapProbability: 0.1,
} as const;

/**
 * Test company ID prefix for stress test data.
 */
export const TEST_COMPANY_PREFIX = 'stress-test-company';

/**
 * Test employee email domain.
 */
export const TEST_EMAIL_DOMAIN = 'stress-test.complyeur.local';
