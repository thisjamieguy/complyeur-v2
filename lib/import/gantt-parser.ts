/**
 * Gantt/Schedule Parser for ComplyEUR Import
 *
 * What it does:
 * - Parses schedule/Gantt format files where employees are rows and dates are columns
 * - Detects country codes in cells (e.g., "FR", "Germany", "tr/DE" for travel day)
 * - Aggregates consecutive days into trip records
 * - Handles common non-travel indicators (Holiday, WFH, UK, etc.)
 *
 * Why it matters:
 * - Many companies track travel in schedule/calendar formats
 * - Converting to trip records is tedious and error-prone manually
 * - Smart parsing handles real-world messy data (abbreviations, mixed formats)
 */

import { parseDate, type DateParseResult } from './date-parser';
import { normalizeCountry, isSchengenCountry } from './country-normalizer';
import { normalizeHeader, type CanonicalField } from './header-aliases';

/**
 * Represents a single cell in the Gantt grid.
 */
export interface GanttCell {
  /** Original row index (0-based, excluding header) */
  rowIndex: number;
  /** Original column index */
  colIndex: number;
  /** Raw cell value */
  rawValue: string;
  /** Normalized country code (null if non-travel or unrecognized) */
  countryCode: string | null;
  /** Whether this is a Schengen country */
  isSchengen: boolean;
  /** Whether this is a travel day (TR prefix) */
  isTravelDay: boolean;
  /** Whether this day should count for trip aggregation */
  countsAsDay: boolean;
}

/**
 * Represents a row (employee) in the Gantt format.
 */
export interface GanttRow {
  /** Row index (0-based, excluding header) */
  index: number;
  /** Employee name from first column */
  employeeName: string;
  /** Employee email if found */
  email?: string;
  /** Cells for each date column */
  cells: GanttCell[];
}

/**
 * Represents a date column header in the Gantt format.
 */
export interface GanttDateColumn {
  /** Column index */
  index: number;
  /** Original header text */
  header: string;
  /** Parsed date result */
  date: DateParseResult;
}

/**
 * Result of parsing a Gantt format file.
 */
export interface GanttParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Parsed date columns */
  dateColumns: GanttDateColumn[];
  /** Parsed employee rows */
  rows: GanttRow[];
  /** Reference year used for date parsing */
  referenceYear: number;
  /** Columns that were ignored (not dates or known fields) */
  ignoredColumns: Array<{ index: number; header: string }>;
}

/**
 * A generated trip record from Gantt parsing.
 */
export interface GeneratedTrip {
  /** Employee name */
  employeeName: string;
  /** Employee email if available */
  employeeEmail?: string;
  /** Trip entry date (ISO format) */
  entryDate: string;
  /** Trip exit date (ISO format) */
  exitDate: string;
  /** Country code */
  country: string;
  /** Whether destination is in Schengen zone */
  isSchengen: boolean;
  /** Number of days in this trip */
  dayCount: number;
  /** Source row number in original file (for error reporting) */
  sourceRow: number;
}

/**
 * Cell values that indicate non-travel (don't count as trip days).
 * These are case-insensitive.
 */
const NON_COUNTING_VALUES = new Set([
  'hol',
  'holiday',
  'annual leave',
  'al',
  'wfh',
  'work from home',
  'home',
  'remote',
  'n/w',
  'off',
  'sick',
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
]);

/**
 * Cell values that indicate domestic (UK) work - don't count for Schengen.
 */
const DOMESTIC_VALUES = new Set([
  'uk',
  'gb',
  'office',
  'london',
  'domestic',
  'hq',
  'headquarters',
  'home office',
  'manchester',
  'birmingham',
  'leeds',
  'glasgow',
  'edinburgh',
  'cardiff',
  'belfast',
  'bristol',
  'liverpool',
  'newcastle',
]);

/**
 * Parses a cell value to determine if it represents travel and to which country.
 */
function parseCell(value: unknown, rowIdx: number, colIdx: number): GanttCell {
  const raw = String(value ?? '').trim();
  const lower = raw.toLowerCase();

  // Empty or non-counting values
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

  // Domestic values (UK-based)
  if (DOMESTIC_VALUES.has(lower)) {
    return {
      rowIndex: rowIdx,
      colIndex: colIdx,
      rawValue: raw,
      countryCode: 'GB',
      isSchengen: false,
      isTravelDay: false,
      countsAsDay: false, // Domestic doesn't count for Schengen
    };
  }

  // Check for travel day prefix: "TR/FR", "tr-DE", "TR DE", etc.
  const travelMatch = raw.match(/^(?:tr[\/\-\s]?)([A-Za-z]{2,})$/i);
  const isTravelDay = !!travelMatch;
  const countryPart = travelMatch ? travelMatch[1] : raw;

  // Normalize the country
  const result = normalizeCountry(countryPart);

  return {
    rowIndex: rowIdx,
    colIndex: colIdx,
    rawValue: raw,
    countryCode: result.code,
    isSchengen: result.isSchengen,
    isTravelDay,
    countsAsDay: result.isSchengen, // Only Schengen countries count for 90/180
  };
}

/**
 * Parses a Gantt format spreadsheet into structured data.
 *
 * @param data - 2D array of cell values (first row is headers)
 * @param options - Parsing options
 * @returns Parse result with rows and date columns
 *
 * @example
 * const data = [
 *   ["Employee", "Mon 06 Jan", "Tue 07 Jan", "Wed 08 Jan"],
 *   ["John Smith", "FR", "FR", "FR"],
 *   ["Jane Doe", "UK", "DE", "DE"],
 * ];
 * const result = parseGanttFormat(data, { referenceYear: 2025 });
 */
export function parseGanttFormat(
  data: unknown[][],
  options: {
    /** Reference year for date parsing (default: current year) */
    referenceYear?: number;
    /** Column index containing employee names (default: 0) */
    nameColumn?: number;
    /** Column index containing email (default: auto-detect) */
    emailColumn?: number;
  } = {}
): GanttParseResult {
  const { referenceYear = new Date().getFullYear(), nameColumn = 0 } = options;

  // Validate input
  if (!data || !Array.isArray(data) || data.length < 2) {
    return {
      success: false,
      error: 'File must have at least a header row and one data row.',
      dateColumns: [],
      rows: [],
      referenceYear,
      ignoredColumns: [],
    };
  }

  const headers = data[0] as unknown[];
  if (!headers || headers.length < 2) {
    return {
      success: false,
      error: 'Header row must have at least employee name and one date column.',
      dateColumns: [],
      rows: [],
      referenceYear,
      ignoredColumns: [],
    };
  }

  // Parse headers to identify date columns
  const dateColumns: GanttDateColumn[] = [];
  const ignoredColumns: Array<{ index: number; header: string }> = [];
  let emailColumn = options.emailColumn;

  for (let i = 0; i < headers.length; i++) {
    // Skip the name column
    if (i === nameColumn) continue;

    const header = String(headers[i] ?? '').trim();
    if (!header) {
      ignoredColumns.push({ index: i, header: '(empty)' });
      continue;
    }

    // Check if this is a known field (email, department, etc.)
    const normalized = normalizeHeader(header);
    if (normalized && !['entry_date', 'exit_date'].includes(normalized)) {
      if (normalized === 'email' && emailColumn === undefined) {
        emailColumn = i;
      }
      ignoredColumns.push({ index: i, header });
      continue;
    }

    // Try to parse as date
    const dateResult = parseDate(header, { referenceYear, isGanttHeader: true });
    if (dateResult.date) {
      dateColumns.push({
        index: i,
        header,
        date: dateResult,
      });
    } else {
      ignoredColumns.push({ index: i, header });
    }
  }

  if (dateColumns.length === 0) {
    return {
      success: false,
      error:
        'No date columns found. Headers should be dates like "Mon 06 Jan", "06/01", or "2025-01-06".',
      dateColumns: [],
      rows: [],
      referenceYear,
      ignoredColumns,
    };
  }

  // Sort date columns chronologically
  dateColumns.sort((a, b) => {
    if (!a.date.date || !b.date.date) return 0;
    return a.date.date.localeCompare(b.date.date);
  });

  // Parse data rows
  const rows: GanttRow[] = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (!row || !Array.isArray(row)) continue;

    const employeeName = String(row[nameColumn] ?? '').trim();
    if (!employeeName) continue; // Skip empty name rows

    const email = emailColumn !== undefined ? String(row[emailColumn] ?? '').trim() : undefined;

    const cells = dateColumns.map((dc) => parseCell(row[dc.index], r - 1, dc.index));

    rows.push({
      index: r - 1,
      employeeName,
      email: email || undefined,
      cells,
    });
  }

  if (rows.length === 0) {
    return {
      success: false,
      error: 'No data rows with employee names found.',
      dateColumns,
      rows: [],
      referenceYear,
      ignoredColumns,
    };
  }

  return {
    success: true,
    dateColumns,
    rows,
    referenceYear,
    ignoredColumns,
  };
}

/**
 * Generates trip records from parsed Gantt data by aggregating consecutive days.
 *
 * @param result - Parsed Gantt result
 * @param options - Generation options
 * @returns Array of generated trips
 *
 * @example
 * // Employee in France Mon-Wed, Germany Thu-Fri
 * // Generates: [{ country: "FR", days: 3 }, { country: "DE", days: 2 }]
 */
export function generateTripsFromGantt(
  result: GanttParseResult,
  options: {
    /** Only generate trips for Schengen countries (default: false) */
    schengenOnly?: boolean;
    /** Minimum days to create a trip (default: 1) */
    minDays?: number;
  } = {}
): GeneratedTrip[] {
  if (!result.success || result.rows.length === 0) {
    return [];
  }

  const { schengenOnly = false, minDays = 1 } = options;
  const trips: GeneratedTrip[] = [];

  for (const row of result.rows) {
    let currentTrip: {
      country: string;
      startIdx: number;
      endIdx: number;
      isSchengen: boolean;
    } | null = null;

    for (let i = 0; i < row.cells.length; i++) {
      const cell = row.cells[i];

      // Determine if this cell should contribute to a trip
      const shouldCount = cell.countryCode && (!schengenOnly || cell.isSchengen);

      if (!shouldCount) {
        // End current trip if exists
        if (currentTrip) {
          const trip = createTrip(row, currentTrip, result.dateColumns);
          if (trip.dayCount >= minDays) {
            trips.push(trip);
          }
          currentTrip = null;
        }
        continue;
      }

      // Check if this extends current trip or starts new one
      if (currentTrip && currentTrip.country === cell.countryCode) {
        // Extend current trip
        currentTrip.endIdx = i;
      } else {
        // End previous trip and start new one
        if (currentTrip) {
          const trip = createTrip(row, currentTrip, result.dateColumns);
          if (trip.dayCount >= minDays) {
            trips.push(trip);
          }
        }
        currentTrip = {
          country: cell.countryCode!,
          startIdx: i,
          endIdx: i,
          isSchengen: cell.isSchengen,
        };
      }
    }

    // Don't forget the last trip
    if (currentTrip) {
      const trip = createTrip(row, currentTrip, result.dateColumns);
      if (trip.dayCount >= minDays) {
        trips.push(trip);
      }
    }
  }

  return trips;
}

/**
 * Helper to create a trip record from aggregated data.
 */
function createTrip(
  row: GanttRow,
  tripData: { country: string; startIdx: number; endIdx: number; isSchengen: boolean },
  dateColumns: GanttDateColumn[]
): GeneratedTrip {
  const startDate = dateColumns[tripData.startIdx].date.date!;
  const endDate = dateColumns[tripData.endIdx].date.date!;

  return {
    employeeName: row.employeeName,
    employeeEmail: row.email,
    entryDate: startDate,
    exitDate: endDate,
    country: tripData.country,
    isSchengen: tripData.isSchengen,
    dayCount: tripData.endIdx - tripData.startIdx + 1,
    sourceRow: row.index + 2, // +2 for 1-based and header row
  };
}

/**
 * Summary of generated trips for display.
 */
export interface TripGenerationSummary {
  /** Total days with travel recorded */
  totalDays: number;
  /** Days in Schengen countries */
  schengenDays: number;
  /** Number of trips created */
  tripsCreated: number;
  /** Number of employee rows processed */
  rowsProcessed: number;
  /** Days by country for breakdown */
  daysByCountry: Map<string, number>;
  /** Trips by employee for breakdown */
  tripsByEmployee: Map<string, number>;
}

/**
 * Generates trips with a detailed summary.
 *
 * @param result - Parsed Gantt result
 * @param options - Generation options
 * @returns Object with trips array and summary statistics
 */
export function generateTripsWithSummary(
  result: GanttParseResult,
  options: {
    schengenOnly?: boolean;
    minDays?: number;
  } = {}
): {
  trips: GeneratedTrip[];
  summary: TripGenerationSummary;
} {
  const trips = generateTripsFromGantt(result, options);

  // Calculate summary
  const daysByCountry = new Map<string, number>();
  const tripsByEmployee = new Map<string, number>();
  let schengenDays = 0;
  let totalDays = 0;

  for (const trip of trips) {
    totalDays += trip.dayCount;
    if (trip.isSchengen) {
      schengenDays += trip.dayCount;
    }

    daysByCountry.set(trip.country, (daysByCountry.get(trip.country) ?? 0) + trip.dayCount);

    tripsByEmployee.set(
      trip.employeeName,
      (tripsByEmployee.get(trip.employeeName) ?? 0) + 1
    );
  }

  return {
    trips,
    summary: {
      totalDays,
      schengenDays,
      tripsCreated: trips.length,
      rowsProcessed: result.rows.length,
      daysByCountry,
      tripsByEmployee,
    },
  };
}

/**
 * Validates Gantt data before processing.
 */
export interface GanttValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates parsed Gantt data for common issues.
 */
export function validateGanttData(result: GanttParseResult): GanttValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result.success) {
    errors.push(result.error || 'Unknown parsing error');
    return { isValid: false, errors, warnings };
  }

  // Check date column gaps
  const dates = result.dateColumns.map((dc) => dc.date.date).filter((d): d is string => !!d);
  if (dates.length > 1) {
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const dayDiff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (dayDiff > 1) {
        warnings.push(
          `Gap detected: ${dayDiff - 1} day(s) missing between ${dates[i - 1]} and ${dates[i]}`
        );
      }
    }
  }

  // Check for unrecognized countries
  const unrecognized = new Set<string>();
  for (const row of result.rows) {
    for (const cell of row.cells) {
      if (cell.rawValue && !cell.countryCode && cell.rawValue !== '-') {
        const lower = cell.rawValue.toLowerCase();
        if (!NON_COUNTING_VALUES.has(lower) && !DOMESTIC_VALUES.has(lower)) {
          unrecognized.add(cell.rawValue);
        }
      }
    }
  }
  if (unrecognized.size > 0) {
    warnings.push(
      `Unrecognized values: ${Array.from(unrecognized).slice(0, 5).join(', ')}${unrecognized.size > 5 ? ` (and ${unrecognized.size - 5} more)` : ''}`
    );
  }

  // Check ignored columns
  if (result.ignoredColumns.length > 0) {
    const ignored = result.ignoredColumns.map((c) => c.header).slice(0, 3);
    warnings.push(
      `${result.ignoredColumns.length} column(s) ignored: ${ignored.join(', ')}${result.ignoredColumns.length > 3 ? '...' : ''}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Previews what the parser sees for debugging.
 */
export function previewGanttParse(
  data: unknown[][],
  options: { referenceYear?: number } = {}
): {
  headers: Array<{ index: number; value: string; type: 'name' | 'date' | 'ignored' }>;
  sampleRows: Array<{ name: string; cells: Array<{ value: string; country: string | null }> }>;
} {
  const result = parseGanttFormat(data, options);
  const dateIndices = new Set(result.dateColumns.map((dc) => dc.index));
  const ignoredIndices = new Set(result.ignoredColumns.map((ic) => ic.index));

  const headers = (data[0] as unknown[]).map((h, i) => ({
    index: i,
    value: String(h ?? ''),
    type: (i === 0 ? 'name' : dateIndices.has(i) ? 'date' : 'ignored') as 'name' | 'date' | 'ignored',
  }));

  const sampleRows = result.rows.slice(0, 5).map((row) => ({
    name: row.employeeName,
    cells: row.cells.map((cell) => ({
      value: cell.rawValue,
      country: cell.countryCode,
    })),
  }));

  return { headers, sampleRows };
}
