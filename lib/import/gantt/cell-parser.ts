import { normalizeCountry } from '../country-normalizer';
import { KNOWN_COUNTRY_CODES, NON_COUNTING_VALUES } from './constants';
import type { GanttCell } from './types';

/**
 * Extracts a country code from job/project descriptions.
 *
 * Pattern: "string-COUNTRYCODE-string" → take element AFTER first hyphen
 * Examples:
 * - "HP-DE-DP38 Install" → DE
 * - "Axc-BE-GSD & Purion" → BE
 * - "ST-FR-Crolles-6x Implanters" → FR
 * - "tr-DE" → DE (travel day)
 * - "n/w-BE" → BE (night/weekend)
 *
 * Everything after the second hyphen is client info - ignored.
 */
function extractCountryFromText(text: string): { code: string | null; isTravelDay: boolean } {
  const trimmed = text.trim();

  // Check for travel day prefix (tr-XX)
  const isTravelDay = /^tr[\-\/\s]/i.test(trimmed);

  // Check for n/w (not working but still abroad) prefix - e.g., "n/w-DE" or "n/w-DE-client"
  // This is NOT a non-counting value - person is still in that country
  // Requires hyphen and exactly 2 letters followed by end, hyphen, or space
  const nwMatch = trimmed.match(/^n\/w-([A-Z]{2})(?:$|[-\s])/i);
  if (nwMatch) {
    const code = nwMatch[1].toUpperCase();
    if (KNOWN_COUNTRY_CODES.has(code)) {
      return { code: code === 'UK' ? 'GB' : code, isTravelDay: false };
    }
  }

  // Split by hyphen and look for country code in second position
  const parts = trimmed.split('-');

  if (parts.length >= 2) {
    // Get the second part (after first hyphen)
    const potentialCode = parts[1].trim().toUpperCase();

    // Check if it's a valid 2-letter country code
    // IMPORTANT: Only accept EXACTLY 2 letters to avoid false matches like "IES" → "IE"
    if (potentialCode.length === 2 && KNOWN_COUNTRY_CODES.has(potentialCode)) {
      return {
        code: potentialCode === 'UK' ? 'GB' : potentialCode,
        isTravelDay,
      };
    }

    // Do NOT try to extract 2 letters from longer strings like "IES"
    // This caused false positives: "PAC-IES-Client" was incorrectly parsed as Ireland (IE)
  }

  // Fallback: Just a 2-letter code by itself (e.g., "FR", "DE")
  if (/^[A-Z]{2}$/i.test(trimmed)) {
    const upper = trimmed.toUpperCase();
    if (KNOWN_COUNTRY_CODES.has(upper)) {
      return { code: upper === 'UK' ? 'GB' : upper, isTravelDay: false };
    }
  }

  return { code: null, isTravelDay: false };
}

/**
 * Parses a cell value to determine if it represents travel and to which country.
 * Simple logic: Look for country code after first hyphen. That's it.
 */
export function parseCell(value: unknown, rowIdx: number, colIdx: number): GanttCell {
  const raw = String(value ?? '').trim();
  const lower = raw.toLowerCase();

  // Empty or non-counting values (hol, sick, n/a, etc.)
  if (NON_COUNTING_VALUES.has(lower)) {
    return {
      rowIndex: rowIdx,
      colIndex: colIdx,
      rawValue: raw,
      countryCode: null,
      isSchengen: false,
      isTravelDay: false,
      countsAsDay: false,
    };
  }

  // Try to extract country code from text
  // Pattern: anything-COUNTRYCODE-anything → take COUNTRYCODE
  const extracted = extractCountryFromText(raw);

  if (extracted.code) {
    const result = normalizeCountry(extracted.code);
    return {
      rowIndex: rowIdx,
      colIndex: colIdx,
      rawValue: raw,
      countryCode: result.code,
      isSchengen: result.isSchengen,
      isTravelDay: extracted.isTravelDay,
      countsAsDay: result.isSchengen, // Only Schengen countries count for 90/180
    };
  }

  // No country code found - doesn't count
  return {
    rowIndex: rowIdx,
    colIndex: colIdx,
    rawValue: raw,
    countryCode: null,
    isSchengen: false,
    isTravelDay: false,
    countsAsDay: false,
  };
}
