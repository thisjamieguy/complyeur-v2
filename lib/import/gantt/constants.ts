import {
  ALL_SCHENGEN_COUNTRIES,
  NON_SCHENGEN_EU,
} from '@/lib/constants/schengen-countries'

export const MAX_GANTT_COLUMNS = 500;

/**
 * Cell values that indicate non-travel (don't count as trip days).
 * These are case-insensitive.
 */
export const NON_COUNTING_VALUES = new Set([
  'hol',
  'holiday',
  'annual leave',
  'al',
  'wfh',
  'work from home',
  'home',
  'remote',
  // NOTE: 'n/w' is NOT here - "n/w-XX" means not working but still abroad, counts as travel
  'off',
  'sick',
  's/d', // Sick day
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
  ' ', // Single space
  'tr', // Just "tr" with no country is not useful
]);

/**
 * Known country codes for validation.
 */
export const KNOWN_COUNTRY_CODES = new Set([
  ...ALL_SCHENGEN_COUNTRIES,
  ...NON_SCHENGEN_EU,
  'GB', 'UK', 'US', 'CA', 'AU', 'MX', 'JP', 'CN', 'IN'
]);
