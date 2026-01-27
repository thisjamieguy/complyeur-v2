import type { DateParseResult } from '../date-parser';

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
 * Validates Gantt data before processing.
 */
export interface GanttValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
