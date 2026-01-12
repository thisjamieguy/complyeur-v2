/**
 * Multi-Format Date Parser with Ambiguity Detection for ComplyEUR Import
 *
 * What it does:
 * - Parses dates in multiple formats (ISO, UK, US, text, Excel serial)
 * - Detects ambiguous dates (e.g., 01/02/2025 could be Jan 2 or Feb 1)
 * - Analyzes batches to infer the most likely format
 * - Provides confidence scores for parsed dates
 *
 * Why it matters:
 * - Users use different date formats based on locale
 * - Incorrect date parsing leads to wrong compliance calculations
 * - Ambiguity detection prevents silent errors
 *
 * IMPORTANT: Uses date-fns as per CLAUDE.md requirements.
 * NEVER use native JS Date constructor for parsing.
 */

import { isValid, format } from 'date-fns';
import { enGB } from 'date-fns/locale';

/**
 * Recognized date format types.
 */
export type DateFormat =
  | 'ISO' // 2025-01-15
  | 'UK_SLASH' // 15/01/2025 (DD/MM/YYYY)
  | 'UK_DASH' // 15-01-2025 (DD-MM-YYYY)
  | 'US_SLASH' // 01/15/2025 (MM/DD/YYYY)
  | 'US_DASH' // 01-15-2025 (MM-DD-YYYY)
  | 'TEXT_DMY' // 15 Jan 2025, 15-Jan-2025
  | 'TEXT_MDY' // Jan 15, 2025
  | 'EXCEL_SERIAL' // 45678 (days since Excel epoch)
  | 'GANTT_HEADER' // Mon 06 Jan, Wed 15
  | 'SHORT_DM' // 06 Jan, 15/01
  | 'ISO_DATETIME' // 2025-01-15T10:30:00
  | 'UNKNOWN';

/**
 * Result of parsing a single date value.
 */
export interface DateParseResult {
  /** Parsed date in ISO format (YYYY-MM-DD), or null if failed */
  date: string | null;
  /** Original input value */
  original: string;
  /** Detected format type */
  format: DateFormat;
  /** Whether this date is ambiguous (e.g., 01/02/2025) */
  isAmbiguous: boolean;
  /** If ambiguous, which interpretation was assumed */
  assumedInterpretation?: 'DD/MM' | 'MM/DD';
  /** Warning message if applicable */
  warning?: string;
  /** Confidence level in the parsing result */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Summary of date format ambiguity analysis for a batch.
 */
export interface AmbiguityReport {
  /** Total dates analyzed */
  totalDates: number;
  /** Count of dates that are ambiguous */
  ambiguousCount: number;
  /** Count of dates that clearly indicate a format */
  unambiguousCount: number;
  /** Examples of ambiguous dates (up to 5) */
  ambiguousExamples: string[];
  /** Detected format based on unambiguous dates */
  detectedFormat: 'DD/MM' | 'MM/DD' | 'MIXED' | 'UNKNOWN';
  /** Confidence in the detected format */
  confidence: 'high' | 'medium' | 'low';
  /** Human-readable explanation */
  explanation: string;
  /** Whether user confirmation is required */
  requiresConfirmation: boolean;
}

/**
 * Options for date parsing.
 */
export interface DateParseOptions {
  /** Preferred format when ambiguous (default: 'DD/MM' for UK context) */
  preferredFormat?: 'DD/MM' | 'MM/DD';
  /** Reference year for incomplete dates (default: current year) */
  referenceYear?: number;
  /** Whether this is a Gantt header (more lenient parsing) */
  isGanttHeader?: boolean;
}

// Excel epoch: December 30, 1899 (accounting for Excel's leap year bug)
const EXCEL_EPOCH = new Date(1899, 11, 30);

/**
 * Converts an Excel serial date to a JavaScript Date.
 * Excel serial dates are days since January 1, 1900.
 */
function excelSerialToDate(serial: number): Date {
  // Subtract 1 because Excel incorrectly treats 1900 as a leap year
  return new Date(EXCEL_EPOCH.getTime() + (serial - 1) * 86400000);
}

/**
 * Month name abbreviations for parsing.
 */
const MONTH_NAMES: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/**
 * Day name abbreviations for Gantt headers.
 */
const DAY_NAMES = new Set([
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

/**
 * Attempts to parse a month name from a string.
 */
function parseMonthName(str: string): number | null {
  const cleaned = str.toLowerCase().trim();
  return MONTH_NAMES[cleaned] ?? null;
}

/**
 * Checks if a string is a day name.
 */
function isDayName(str: string): boolean {
  return DAY_NAMES.has(str.toLowerCase().trim());
}

/**
 * Parses a date value in any supported format.
 *
 * @param input - Date string or Excel serial number
 * @param options - Parsing options
 * @returns Parse result with date, format, and confidence
 *
 * @example
 * parseDate("2025-01-15")           // ISO, high confidence
 * parseDate("15/01/2025")           // UK format
 * parseDate("01/02/2025")           // Ambiguous - user pref or analysis needed
 * parseDate(45678)                  // Excel serial
 * parseDate("Mon 06 Jan", { referenceYear: 2025 }) // Gantt header
 */
export function parseDate(
  input: string | number,
  options: DateParseOptions = {}
): DateParseResult {
  const { preferredFormat = 'DD/MM', referenceYear = new Date().getFullYear() } = options;

  // Handle Excel serial dates (numbers in reasonable range)
  if (typeof input === 'number') {
    // Excel dates: 1 = Jan 1, 1900, valid range roughly 1900-2100
    if (input >= 1 && input <= 73000) {
      const d = excelSerialToDate(input);
      if (isValid(d)) {
        return {
          date: format(d, 'yyyy-MM-dd'),
          original: String(input),
          format: 'EXCEL_SERIAL',
          isAmbiguous: false,
          confidence: 'high',
        };
      }
    }
    return {
      date: null,
      original: String(input),
      format: 'UNKNOWN',
      isAmbiguous: false,
      confidence: 'low',
      warning: `Number ${input} is not a valid Excel serial date`,
    };
  }

  const trimmed = String(input).trim();
  if (!trimmed) {
    return {
      date: null,
      original: trimmed,
      format: 'UNKNOWN',
      isAmbiguous: false,
      confidence: 'low',
      warning: 'Empty date value',
    };
  }

  // Try ISO format first (YYYY-MM-DD) - unambiguous
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const d = new Date(+year, +month - 1, +day);
    if (isValid(d) && d.getMonth() === +month - 1) {
      return {
        date: format(d, 'yyyy-MM-dd'),
        original: trimmed,
        format: 'ISO',
        isAmbiguous: false,
        confidence: 'high',
      };
    }
  }

  // ISO datetime format (2025-01-15T10:30:00)
  const isoDatetimeMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T/);
  if (isoDatetimeMatch) {
    const [, year, month, day] = isoDatetimeMatch;
    const d = new Date(+year, +month - 1, +day);
    if (isValid(d)) {
      return {
        date: format(d, 'yyyy-MM-dd'),
        original: trimmed,
        format: 'ISO_DATETIME',
        isAmbiguous: false,
        confidence: 'high',
      };
    }
  }

  // Text format with month name: "15 Jan 2025", "15-Jan-2025", "Jan 15, 2025"
  const textDMYMatch = trimmed.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-](\d{4})$/);
  if (textDMYMatch) {
    const [, day, monthStr, year] = textDMYMatch;
    const month = parseMonthName(monthStr);
    if (month !== null) {
      const d = new Date(+year, month, +day);
      if (isValid(d) && d.getMonth() === month) {
        return {
          date: format(d, 'yyyy-MM-dd'),
          original: trimmed,
          format: 'TEXT_DMY',
          isAmbiguous: false,
          confidence: 'high',
        };
      }
    }
  }

  // Text format MDY: "Jan 15, 2025", "January 15 2025"
  const textMDYMatch = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (textMDYMatch) {
    const [, monthStr, day, year] = textMDYMatch;
    const month = parseMonthName(monthStr);
    if (month !== null) {
      const d = new Date(+year, month, +day);
      if (isValid(d) && d.getMonth() === month) {
        return {
          date: format(d, 'yyyy-MM-dd'),
          original: trimmed,
          format: 'TEXT_MDY',
          isAmbiguous: false,
          confidence: 'high',
        };
      }
    }
  }

  // Gantt header format: "Mon 06 Jan", "Wed 15", "06 Jan"
  if (options.isGanttHeader) {
    const ganttResult = parseGanttDate(trimmed, referenceYear);
    if (ganttResult.date) {
      return ganttResult;
    }
  }

  // Numeric formats with separators: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, etc.
  const numericMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (numericMatch) {
    const [, first, second, year] = numericMatch;
    const separator = trimmed.includes('/') ? '/' : trimmed.includes('-') ? '-' : '.';
    const firstNum = +first;
    const secondNum = +second;

    // Determine if ambiguous (both values could be day or month)
    const isAmbiguous = firstNum <= 12 && secondNum <= 12;

    // Determine format based on values or preference
    let day: number, month: number;
    let detectedFormat: DateFormat;
    let interpretation: 'DD/MM' | 'MM/DD' | undefined;

    if (firstNum > 12) {
      // First value > 12, must be day (DD/MM format)
      day = firstNum;
      month = secondNum;
      detectedFormat = separator === '/' ? 'UK_SLASH' : 'UK_DASH';
    } else if (secondNum > 12) {
      // Second value > 12, must be day (MM/DD format)
      month = firstNum;
      day = secondNum;
      detectedFormat = separator === '/' ? 'US_SLASH' : 'US_DASH';
    } else {
      // Ambiguous - use preference
      if (preferredFormat === 'MM/DD') {
        month = firstNum;
        day = secondNum;
        detectedFormat = separator === '/' ? 'US_SLASH' : 'US_DASH';
        interpretation = 'MM/DD';
      } else {
        day = firstNum;
        month = secondNum;
        detectedFormat = separator === '/' ? 'UK_SLASH' : 'UK_DASH';
        interpretation = 'DD/MM';
      }
    }

    const d = new Date(+year, month - 1, day);
    if (isValid(d) && d.getMonth() === month - 1 && d.getDate() === day) {
      return {
        date: format(d, 'yyyy-MM-dd'),
        original: trimmed,
        format: detectedFormat,
        isAmbiguous,
        assumedInterpretation: isAmbiguous ? interpretation : undefined,
        confidence: isAmbiguous ? 'medium' : 'high',
      };
    }
  }

  // Short format with month name: "06 Jan", "Jan 06"
  const shortDMMatch = trimmed.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3,9})$/);
  if (shortDMMatch) {
    const [, day, monthStr] = shortDMMatch;
    const month = parseMonthName(monthStr);
    if (month !== null) {
      const d = new Date(referenceYear, month, +day);
      if (isValid(d)) {
        return {
          date: format(d, 'yyyy-MM-dd'),
          original: trimmed,
          format: 'SHORT_DM',
          isAmbiguous: false,
          confidence: 'medium',
          warning: `Year not specified - assumed ${referenceYear}`,
        };
      }
    }
  }

  const shortMDMatch = trimmed.match(/^([A-Za-z]{3,9})[\s\-\/](\d{1,2})$/);
  if (shortMDMatch) {
    const [, monthStr, day] = shortMDMatch;
    const month = parseMonthName(monthStr);
    if (month !== null) {
      const d = new Date(referenceYear, month, +day);
      if (isValid(d)) {
        return {
          date: format(d, 'yyyy-MM-dd'),
          original: trimmed,
          format: 'SHORT_DM',
          isAmbiguous: false,
          confidence: 'medium',
          warning: `Year not specified - assumed ${referenceYear}`,
        };
      }
    }
  }

  // Could not parse
  return {
    date: null,
    original: trimmed,
    format: 'UNKNOWN',
    isAmbiguous: false,
    confidence: 'low',
    warning: `Could not parse date: "${trimmed}"`,
  };
}

/**
 * Parses a Gantt-style date header like "Mon 06 Jan" or "Wed 15".
 */
function parseGanttDate(input: string, referenceYear: number): DateParseResult {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);

  // Skip day name if present
  let startIdx = 0;
  if (parts.length > 1 && isDayName(parts[0])) {
    startIdx = 1;
  }

  const remaining = parts.slice(startIdx);

  // "06 Jan" or "Jan 06"
  if (remaining.length === 2) {
    const [first, second] = remaining;
    const firstMonth = parseMonthName(first);
    const secondMonth = parseMonthName(second);

    let day: number | null = null;
    let month: number | null = null;

    if (firstMonth !== null && /^\d{1,2}$/.test(second)) {
      month = firstMonth;
      day = +second;
    } else if (secondMonth !== null && /^\d{1,2}$/.test(first)) {
      day = +first;
      month = secondMonth;
    }

    if (day !== null && month !== null) {
      const d = new Date(referenceYear, month, day);
      if (isValid(d) && d.getMonth() === month) {
        return {
          date: format(d, 'yyyy-MM-dd'),
          original: input,
          format: 'GANTT_HEADER',
          isAmbiguous: false,
          confidence: 'medium',
          warning: `Year not specified - assumed ${referenceYear}`,
        };
      }
    }
  }

  // Just a number (day of current or next month)
  if (remaining.length === 1 && /^\d{1,2}$/.test(remaining[0])) {
    const day = +remaining[0];
    // Assume current month
    const now = new Date();
    const d = new Date(referenceYear, now.getMonth(), day);
    if (isValid(d)) {
      return {
        date: format(d, 'yyyy-MM-dd'),
        original: input,
        format: 'GANTT_HEADER',
        isAmbiguous: true,
        confidence: 'low',
        warning: `Only day number provided - assumed ${format(d, 'MMMM yyyy', { locale: enGB })}`,
      };
    }
  }

  return {
    date: null,
    original: input,
    format: 'UNKNOWN',
    isAmbiguous: false,
    confidence: 'low',
    warning: `Could not parse Gantt header: "${input}"`,
  };
}

/**
 * Analyzes a batch of date strings to detect the predominant format.
 * Uses unambiguous dates to infer format for ambiguous ones.
 *
 * @param dateStrings - Array of date strings to analyze
 * @returns Ambiguity report with detected format and confidence
 *
 * @example
 * analyzeAmbiguity(["15/01/2025", "20/01/2025", "25/01/2025"])
 * // → { detectedFormat: "DD/MM", confidence: "high", requiresConfirmation: false }
 *
 * analyzeAmbiguity(["01/02/2025", "03/04/2025", "05/06/2025"])
 * // → { detectedFormat: "UNKNOWN", confidence: "low", requiresConfirmation: true }
 */
export function analyzeAmbiguity(dateStrings: string[]): AmbiguityReport {
  const valid = dateStrings.filter((d) => d?.trim());

  if (!valid.length) {
    return {
      totalDates: 0,
      ambiguousCount: 0,
      unambiguousCount: 0,
      ambiguousExamples: [],
      detectedFormat: 'UNKNOWN',
      confidence: 'low',
      explanation: 'No dates found to analyze.',
      requiresConfirmation: false,
    };
  }

  let ddmmEvidence = 0; // Dates that can only be DD/MM
  let mmddEvidence = 0; // Dates that can only be MM/DD
  let ambiguous = 0;
  const examples: string[] = [];

  for (const s of valid) {
    const trimmed = s.trim();

    // Check for numeric date patterns
    const match = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (!match) continue;

    const [, first, second] = match.map(Number);

    if (first > 12 && second <= 12) {
      // First > 12, must be day (DD/MM)
      ddmmEvidence++;
    } else if (second > 12 && first <= 12) {
      // Second > 12, must be day (MM/DD)
      mmddEvidence++;
    } else if (first <= 12 && second <= 12) {
      // Both could be month - ambiguous
      ambiguous++;
      if (examples.length < 5) {
        examples.push(trimmed);
      }
    }
  }

  const total = valid.length;
  const unambiguous = ddmmEvidence + mmddEvidence;

  // Determine detected format
  if (ddmmEvidence > 0 && mmddEvidence > 0) {
    // Mixed formats - problem!
    return {
      totalDates: total,
      ambiguousCount: ambiguous,
      unambiguousCount: unambiguous,
      ambiguousExamples: examples,
      detectedFormat: 'MIXED',
      confidence: 'low',
      explanation: `Found ${ddmmEvidence} DD/MM dates and ${mmddEvidence} MM/DD dates. Your file contains mixed date formats.`,
      requiresConfirmation: true,
    };
  }

  if (ddmmEvidence > 0) {
    const confidence = ambiguous > ddmmEvidence ? 'medium' : 'high';
    return {
      totalDates: total,
      ambiguousCount: ambiguous,
      unambiguousCount: ddmmEvidence,
      ambiguousExamples: examples,
      detectedFormat: 'DD/MM',
      confidence,
      explanation: `Detected DD/MM/YYYY format based on ${ddmmEvidence} unambiguous date${ddmmEvidence > 1 ? 's' : ''} (day > 12).`,
      requiresConfirmation: confidence !== 'high' && ambiguous > 0,
    };
  }

  if (mmddEvidence > 0) {
    const confidence = ambiguous > mmddEvidence ? 'medium' : 'high';
    return {
      totalDates: total,
      ambiguousCount: ambiguous,
      unambiguousCount: mmddEvidence,
      ambiguousExamples: examples,
      detectedFormat: 'MM/DD',
      confidence,
      explanation: `Detected MM/DD/YYYY format based on ${mmddEvidence} unambiguous date${mmddEvidence > 1 ? 's' : ''} (day > 12).`,
      requiresConfirmation: confidence !== 'high' && ambiguous > 0,
    };
  }

  // All dates are ambiguous
  if (ambiguous > 0) {
    return {
      totalDates: total,
      ambiguousCount: ambiguous,
      unambiguousCount: 0,
      ambiguousExamples: examples,
      detectedFormat: 'UNKNOWN',
      confidence: 'low',
      explanation: `All ${ambiguous} dates are ambiguous (could be DD/MM or MM/DD). Please confirm the format.`,
      requiresConfirmation: true,
    };
  }

  // No numeric date patterns found (might be text dates or ISO)
  return {
    totalDates: total,
    ambiguousCount: 0,
    unambiguousCount: 0,
    ambiguousExamples: [],
    detectedFormat: 'UNKNOWN',
    confidence: 'medium',
    explanation:
      'Dates appear to be in text or ISO format (e.g., "15 Jan 2025" or "2025-01-15").',
    requiresConfirmation: false,
  };
}

/**
 * Parses multiple dates with a consistent format preference.
 *
 * @param dateStrings - Array of date strings
 * @param preferredFormat - Format to use for ambiguous dates
 * @param referenceYear - Year to assume for dates without year
 * @returns Array of parse results
 */
export function parseDates(
  dateStrings: string[],
  preferredFormat: 'DD/MM' | 'MM/DD' = 'DD/MM',
  referenceYear?: number
): DateParseResult[] {
  return dateStrings.map((s) => parseDate(s, { preferredFormat, referenceYear }));
}

/**
 * Extracts date strings from a column for ambiguity analysis.
 * Filters out empty/null values and obvious non-dates.
 */
export function extractDateColumn(
  rows: Record<string, unknown>[],
  columnKey: string
): string[] {
  return rows
    .map((row) => row[columnKey])
    .filter((v): v is string | number => v !== null && v !== undefined && v !== '')
    .map((v) => String(v).trim())
    .filter((s) => s.length > 0);
}

/**
 * Validates that a parsed date is within reasonable bounds.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @param options - Validation options
 * @returns Validation result
 */
export function validateDateRange(
  dateStr: string,
  options: {
    minYear?: number;
    maxYear?: number;
    allowFuture?: boolean;
    maxFutureDays?: number;
  } = {}
): { valid: boolean; warning?: string } {
  const { minYear = 2000, maxYear = 2100, allowFuture = true, maxFutureDays = 365 } = options;

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return { valid: false, warning: 'Invalid date format' };
  }

  const year = +match[1];
  if (year < minYear) {
    return { valid: false, warning: `Year ${year} is before ${minYear}` };
  }
  if (year > maxYear) {
    return { valid: false, warning: `Year ${year} is after ${maxYear}` };
  }

  const date = new Date(year, +match[2] - 1, +match[3]);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (!allowFuture && date > now) {
    return { valid: false, warning: 'Date is in the future' };
  }

  if (allowFuture && maxFutureDays > 0) {
    const maxFuture = new Date(now.getTime() + maxFutureDays * 86400000);
    if (date > maxFuture) {
      return {
        valid: true,
        warning: `Date is more than ${maxFutureDays} days in the future`,
      };
    }
  }

  return { valid: true };
}
