/**
 * @fileoverview Schengen Area membership constants and compliance defaults.
 *
 * VERIFICATION REQUIRED: Before each release, verify membership against:
 * https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/schengen-area_en
 *
 * @version 2025-01-07
 * @verifiedBy Phase 7 Implementation
 * @nextReview 2025-04-01 (quarterly)
 */

import type { SchengenMembershipData, RiskThresholds } from './types';

/**
 * Default date when compliance tracking starts.
 * Trips before this date are excluded from calculations.
 *
 * Per business requirements: October 12, 2025
 */
export const DEFAULT_COMPLIANCE_START_DATE = new Date('2025-10-12');

/**
 * Maximum days allowed in Schengen within any 180-day rolling window.
 */
export const SCHENGEN_DAY_LIMIT = 90;

/**
 * Size of the rolling window for compliance calculations.
 */
export const WINDOW_SIZE_DAYS = 180;

/**
 * Default risk level thresholds.
 * - green: 30+ days remaining
 * - amber: 10-29 days remaining
 * - red: <10 days remaining
 */
export const DEFAULT_RISK_THRESHOLDS: Readonly<RiskThresholds> = {
  green: 30,
  amber: 10,
} as const;

/**
 * Schengen Area membership status.
 *
 * VERIFICATION REQUIRED: Before each release, verify against:
 * https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/schengen-area_en
 *
 * @version 2025-01-07
 * @verifiedBy Phase 7 Implementation
 * @nextReview 2025-04-01 (quarterly)
 */
export const SCHENGEN_MEMBERSHIP: SchengenMembershipData = {
  version: '2025-01-07',
  sourceUrl:
    'https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/schengen-area_en',

  // Full Schengen members (27 countries)
  members: {
    AT: { name: 'Austria', since: '1997-12-01' },
    BE: { name: 'Belgium', since: '1995-03-26' },
    BG: { name: 'Bulgaria', since: '2025-01-01' }, // Land borders removed Jan 2025
    HR: { name: 'Croatia', since: '2023-01-01' },
    CZ: { name: 'Czech Republic', since: '2007-12-21' },
    DK: { name: 'Denmark', since: '2001-03-25' },
    EE: { name: 'Estonia', since: '2007-12-21' },
    FI: { name: 'Finland', since: '2001-03-25' },
    FR: { name: 'France', since: '1995-03-26' },
    DE: { name: 'Germany', since: '1995-03-26' },
    GR: { name: 'Greece', since: '2000-01-01' },
    HU: { name: 'Hungary', since: '2007-12-21' },
    IS: { name: 'Iceland', since: '2001-03-25' },
    IT: { name: 'Italy', since: '1997-10-26' },
    LV: { name: 'Latvia', since: '2007-12-21' },
    LI: { name: 'Liechtenstein', since: '2011-12-19' },
    LT: { name: 'Lithuania', since: '2007-12-21' },
    LU: { name: 'Luxembourg', since: '1995-03-26' },
    MT: { name: 'Malta', since: '2007-12-21' },
    NL: { name: 'Netherlands', since: '1995-03-26' },
    NO: { name: 'Norway', since: '2001-03-25' },
    PL: { name: 'Poland', since: '2007-12-21' },
    PT: { name: 'Portugal', since: '1995-03-26' },
    RO: { name: 'Romania', since: '2025-01-01' }, // Land borders removed Jan 2025
    SK: { name: 'Slovakia', since: '2007-12-21' },
    SI: { name: 'Slovenia', since: '2007-12-21' },
    ES: { name: 'Spain', since: '1995-03-26' },
    SE: { name: 'Sweden', since: '2001-03-25' },
    CH: { name: 'Switzerland', since: '2008-12-12' },
  },

  // Microstates with open borders - count as Schengen for user safety
  // These have no border controls with their neighboring Schengen countries.
  // Border agents DO count time in microstates as Schengen presence.
  microstates: {
    MC: { name: 'Monaco', rationale: 'Open border with France, no passport control' },
    VA: { name: 'Vatican City', rationale: 'Open border with Italy, no passport control' },
    SM: { name: 'San Marino', rationale: 'Open border with Italy, no passport control' },
    AD: { name: 'Andorra', rationale: 'Open borders with France/Spain, no passport control' },
  },

  // Explicitly NOT Schengen (common user confusion)
  excluded: {
    IE: { name: 'Ireland', reason: 'EU member, opted out of Schengen' },
    CY: { name: 'Cyprus', reason: 'EU member, not yet implemented Schengen' },
    GB: { name: 'United Kingdom', reason: 'Not EU, not Schengen' },
  },
} as const;

/**
 * Set of all Schengen country codes (members + microstates) for O(1) lookup.
 */
export const SCHENGEN_COUNTRY_CODES: ReadonlySet<string> = new Set([
  ...Object.keys(SCHENGEN_MEMBERSHIP.members),
  ...Object.keys(SCHENGEN_MEMBERSHIP.microstates),
]);

/**
 * Set of excluded country codes for O(1) lookup.
 */
export const EXCLUDED_COUNTRY_CODES: ReadonlySet<string> = new Set(
  Object.keys(SCHENGEN_MEMBERSHIP.excluded)
);

/**
 * Map of country names (uppercase) to country codes for name-based lookup.
 * Includes both full names and common variations.
 */
export const SCHENGEN_NAME_TO_CODE: ReadonlyMap<string, string> = new Map([
  // Member country names
  ...Object.entries(SCHENGEN_MEMBERSHIP.members).flatMap(([code, data]) => [
    [data.name.toUpperCase(), code] as [string, string],
    [code, code] as [string, string], // Also allow code as "name"
  ]),
  // Microstate names
  ...Object.entries(SCHENGEN_MEMBERSHIP.microstates).flatMap(([code, data]) => [
    [data.name.toUpperCase(), code] as [string, string],
    [code, code] as [string, string],
  ]),
  // Common name variations
  ['CZECHIA', 'CZ'],
  ['CZECH', 'CZ'],
  ['HOLLAND', 'NL'],
  ['THE NETHERLANDS', 'NL'],
  ['HELLENIC REPUBLIC', 'GR'],
  ['SWISS CONFEDERATION', 'CH'],
  ['REPUBLIC OF CROATIA', 'HR'],
  ['REPUBLIC OF ESTONIA', 'EE'],
  ['REPUBLIC OF FINLAND', 'FI'],
  ['REPUBLIC OF LATVIA', 'LV'],
  ['REPUBLIC OF LITHUANIA', 'LT'],
  ['REPUBLIC OF MALTA', 'MT'],
  ['REPUBLIC OF POLAND', 'PL'],
  ['REPUBLIC OF SLOVENIA', 'SI'],
  ['SLOVAK REPUBLIC', 'SK'],
  ['KINGDOM OF BELGIUM', 'BE'],
  ['KINGDOM OF DENMARK', 'DK'],
  ['KINGDOM OF THE NETHERLANDS', 'NL'],
  ['KINGDOM OF NORWAY', 'NO'],
  ['KINGDOM OF SPAIN', 'ES'],
  ['KINGDOM OF SWEDEN', 'SE'],
  ['FRENCH REPUBLIC', 'FR'],
  ['FEDERAL REPUBLIC OF GERMANY', 'DE'],
  ['ITALIAN REPUBLIC', 'IT'],
  ['PORTUGUESE REPUBLIC', 'PT'],
  ['REPUBLIC OF AUSTRIA', 'AT'],
  ['GRAND DUCHY OF LUXEMBOURG', 'LU'],
  ['PRINCIPALITY OF LIECHTENSTEIN', 'LI'],
  ['PRINCIPALITY OF MONACO', 'MC'],
  ['PRINCIPALITY OF ANDORRA', 'AD'],
  ['REPUBLIC OF SAN MARINO', 'SM'],
  ['HOLY SEE', 'VA'],
  ['STATE OF VATICAN CITY', 'VA'],
]);

/**
 * Map of excluded country names (uppercase) for explicit rejection.
 */
export const EXCLUDED_NAME_TO_CODE: ReadonlyMap<string, string> = new Map([
  ['IRELAND', 'IE'],
  ['REPUBLIC OF IRELAND', 'IE'],
  ['EIRE', 'IE'],
  ['CYPRUS', 'CY'],
  ['REPUBLIC OF CYPRUS', 'CY'],
  ['UNITED KINGDOM', 'GB'],
  ['UK', 'GB'],
  ['GREAT BRITAIN', 'GB'],
  ['ENGLAND', 'GB'],
  ['SCOTLAND', 'GB'],
  ['WALES', 'GB'],
  ['NORTHERN IRELAND', 'GB'], // Part of UK, not Schengen
]);
