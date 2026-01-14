import * as XLSX from 'xlsx';
import {
  ImportFormat,
  ParsedEmployeeRow,
  ParsedTripRow,
  ParsedRow,
  EMPLOYEE_COLUMNS,
  TRIP_COLUMNS,
  MAX_ROWS,
  ParseResult,
} from '@/types/import';
import {
  parseGanttFormat,
  generateTripsFromGantt,
  type GeneratedTrip,
} from './gantt-parser';

// ============================================================
// RAW PARSE RESULT (for Phase 3 column mapping)
// ============================================================

export interface RawParseResult {
  success: boolean;
  rawData?: Record<string, unknown>[];
  rawHeaders?: string[];
  error?: string;
  totalRows?: number;
}

// ============================================================
// SECURITY: Sanitize Cell Values
// ============================================================

function sanitizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value).trim();

  // CSV injection prevention: prefix dangerous characters
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];
  if (dangerousChars.some((char) => str.startsWith(char))) {
    // Remove the dangerous prefix rather than adding a quote
    // This is safer for our use case since we're just extracting data
    return str.replace(/^[=+\-@\t\r\n]+/, '');
  }

  return str;
}

// ============================================================
// NORMALIZE HEADER NAMES
// ============================================================

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '_') // Replace spaces, hyphens, underscores with single underscore
    .replace(/[^a-z0-9_]/g, ''); // Remove special characters
}

// ============================================================
// PARSE FILE BUFFER
// ============================================================

export async function parseFile(file: File, format: ImportFormat): Promise<ParseResult> {
  try {
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Parse workbook
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      dateNF: 'yyyy-mm-dd',
    });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, error: 'File contains no worksheets' };
    }

    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    // Check for empty file
    if (jsonData.length === 0) {
      return {
        success: false,
        error: 'File appears empty. Add data rows below the header row and try again.',
      };
    }

    // Check row limit
    if (jsonData.length > MAX_ROWS) {
      return {
        success: false,
        error: `Import limited to ${MAX_ROWS} rows for performance. Your file has ${jsonData.length} rows. Please split into smaller files.`,
      };
    }

    // Get headers from first row and normalize them
    const rawHeaders = Object.keys(jsonData[0] || {});
    const headers = rawHeaders.map(normalizeHeader);

    // Validate headers based on format
    const validationResult = validateHeaders(headers, format);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }

    // Parse rows based on format
    let parsedData: ParsedRow[];
    if (format === 'employees') {
      parsedData = parseEmployeeRows(jsonData, rawHeaders);
    } else if (format === 'trips') {
      parsedData = parseTripRows(jsonData, rawHeaders);
    } else if (format === 'gantt') {
      // Gantt format - parse schedule and generate trips
      const ganttResult = parseGanttFromData(buffer);
      if (!ganttResult.success) {
        return {
          success: false,
          error: ganttResult.error || 'Failed to parse Gantt format',
        };
      }
      parsedData = ganttResult.data!;
    } else {
      return {
        success: false,
        error: 'Unknown import format',
      };
    }

    return {
      success: true,
      data: parsedData,
      headers,
      totalRows: parsedData.length,
    };
  } catch (error) {
    console.error('Parse error:', error);
    return {
      success: false,
      error: 'Failed to parse file. Ensure it is a valid Excel or CSV file.',
    };
  }
}

// ============================================================
// PARSE FILE RAW (for Phase 3 column mapping)
// ============================================================

/**
 * Parses a file and returns raw data without strict header validation.
 * Used by Phase 3 column mapping to allow flexible column names.
 *
 * @param file - The file to parse
 * @returns Raw headers and row data
 */
export async function parseFileRaw(file: File): Promise<RawParseResult> {
  try {
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Parse workbook
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      dateNF: 'yyyy-mm-dd',
    });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, error: 'File contains no worksheets' };
    }

    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    // Check for empty file
    if (jsonData.length === 0) {
      return {
        success: false,
        error: 'File appears empty. Add data rows below the header row and try again.',
      };
    }

    // Check row limit
    if (jsonData.length > MAX_ROWS) {
      return {
        success: false,
        error: `Import limited to ${MAX_ROWS} rows for performance. Your file has ${jsonData.length} rows. Please split into smaller files.`,
      };
    }

    // Get raw headers from first row (don't normalize - preserve original names)
    const rawHeaders = Object.keys(jsonData[0] || {});

    // Sanitize all values
    const sanitizedData = jsonData.map((row) => {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        sanitized[key] = sanitizeValue(value);
      }
      return sanitized;
    });

    return {
      success: true,
      rawData: sanitizedData,
      rawHeaders,
      totalRows: sanitizedData.length,
    };
  } catch (error) {
    console.error('Raw parse error:', error);
    return {
      success: false,
      error: 'Failed to parse file. Ensure it is a valid Excel or CSV file.',
    };
  }
}

// ============================================================
// VALIDATE HEADERS (STRICT MODE)
// ============================================================

function validateHeaders(
  headers: string[],
  format: ImportFormat
): { valid: boolean; error?: string } {
  if (format === 'gantt') {
    return { valid: true }; // Gantt has flexible headers
  }

  const expectedColumns = format === 'employees' ? EMPLOYEE_COLUMNS : TRIP_COLUMNS;

  // Check all required columns are present
  const missingColumns = expectedColumns.filter((col) => {
    const normalizedCol = normalizeHeader(col);
    return !headers.some((h) => h === normalizedCol);
  });

  if (missingColumns.length > 0) {
    return {
      valid: false,
      error:
        `Missing required columns: ${missingColumns.join(', ')}. ` +
        `Expected columns: ${expectedColumns.join(', ')}. ` +
        `Download the template for the correct format.`,
    };
  }

  return { valid: true };
}

// ============================================================
// FIND COLUMN INDEX BY NORMALIZED NAME
// ============================================================

function findColumnValue(
  row: Record<string, unknown>,
  rawHeaders: string[],
  targetColumn: string
): string {
  const normalizedTarget = normalizeHeader(targetColumn);

  for (const header of rawHeaders) {
    if (normalizeHeader(header) === normalizedTarget) {
      return sanitizeValue(row[header]);
    }
  }

  return '';
}

// ============================================================
// PARSE EMPLOYEE ROWS
// ============================================================

function parseEmployeeRows(
  rows: Record<string, unknown>[],
  rawHeaders: string[]
): ParsedEmployeeRow[] {
  return rows.map((row, index) => ({
    row_number: index + 2, // +2 because row 1 is header, and we're 0-indexed
    first_name: findColumnValue(row, rawHeaders, 'first_name'),
    last_name: findColumnValue(row, rawHeaders, 'last_name'),
    email: findColumnValue(row, rawHeaders, 'email'),
    nationality: findColumnValue(row, rawHeaders, 'nationality') || undefined,
    passport_number: findColumnValue(row, rawHeaders, 'passport_number') || undefined,
  }));
}

// ============================================================
// PARSE TRIP ROWS
// ============================================================

function parseTripRows(rows: Record<string, unknown>[], rawHeaders: string[]): ParsedTripRow[] {
  return rows.map((row, index) => ({
    row_number: index + 2,
    employee_email: findColumnValue(row, rawHeaders, 'email'),
    employee_name: findColumnValue(row, rawHeaders, 'employee_name') || undefined,
    entry_date: formatDateValue(findColumnValue(row, rawHeaders, 'entry_date')),
    exit_date: formatDateValue(findColumnValue(row, rawHeaders, 'exit_date')),
    country: findColumnValue(row, rawHeaders, 'country'),
    purpose: findColumnValue(row, rawHeaders, 'purpose') || undefined,
  }));
}

// ============================================================
// DATE FORMATTING HELPER
// Using date-fns as per CLAUDE.md requirements
// ============================================================

function formatDateValue(value: string): string {
  if (!value) return '';

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // Excel serial date number (days since 1900-01-01, with Excel's leap year bug)
  const numValue = Number(value);
  if (!isNaN(numValue) && numValue > 0 && numValue < 100000) {
    // Convert Excel serial date to JS date
    // Excel's epoch is January 1, 1900, but it incorrectly counts 1900 as a leap year
    // So we subtract 25569 to get Unix timestamp in days, then convert to milliseconds
    const date = new Date((numValue - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Try parsing various date formats
  // DD/MM/YYYY
  const ddmmyyyy = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mmddyyyy = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (mmddyyyy) {
    // Ambiguous - assume DD/MM/YYYY for UK/EU context
    const [, day, month, year] = mmddyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // ISO datetime format
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Fallback: try native Date parsing (not recommended but catches edge cases)
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Fall through
  }

  // Return original value if we can't parse it - validation will catch invalid dates
  return value;
}

// ============================================================
// PARSE GANTT FORMAT
// ============================================================

function parseGanttFromData(buffer: ArrayBuffer): ParseResult {
  try {
    // Parse workbook to get raw 2D array
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: false, // Keep dates as strings for Gantt parsing
      raw: true,
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, error: 'File contains no worksheets' };
    }

    const sheet = workbook.Sheets[sheetName];

    // Convert to 2D array (including headers)
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: true,
    });

    if (data.length < 2) {
      return {
        success: false,
        error: 'File must have at least a header row and one data row.',
      };
    }

    // Parse using the Gantt parser
    const ganttResult = parseGanttFormat(data, {
      referenceYear: new Date().getFullYear(),
    });

    if (!ganttResult.success) {
      return {
        success: false,
        error: ganttResult.error || 'Failed to parse schedule format',
      };
    }

    // Generate trips from the parsed Gantt data
    const trips = generateTripsFromGantt(ganttResult, {
      schengenOnly: false, // Include all trips, validation will filter
      minDays: 1,
    });

    if (trips.length === 0) {
      return {
        success: false,
        error: 'No trips could be generated from the schedule. Check that cells contain valid country codes.',
      };
    }

    // Check row limit
    if (trips.length > MAX_ROWS) {
      return {
        success: false,
        error: `Generated ${trips.length} trips, which exceeds the limit of ${MAX_ROWS}. Please use a smaller date range.`,
      };
    }

    // Convert generated trips to ParsedTripRow format
    const parsedData: ParsedTripRow[] = trips.map((trip, index) => ({
      row_number: trip.sourceRow, // Use original row number for error reporting
      employee_email: trip.employeeEmail ?? '', // Gantt may not have email, validation will catch it
      employee_name: trip.employeeName,
      entry_date: trip.entryDate,
      exit_date: trip.exitDate,
      country: trip.country,
      purpose: undefined, // Gantt doesn't include purpose
      // Additional fields for UI display
      _generated: true,
      _dayCount: trip.dayCount,
      _isSchengen: trip.isSchengen,
    }));

    return {
      success: true,
      data: parsedData,
      headers: ['employee_name', 'entry_date', 'exit_date', 'country'],
      totalRows: parsedData.length,
    };
  } catch (error) {
    console.error('Gantt parse error:', error);
    return {
      success: false,
      error: 'Failed to parse schedule file. Ensure headers are dates (e.g., "Mon 06 Jan").',
    };
  }
}

// ============================================================
// EXPORT FOR TESTING
// ============================================================

export { sanitizeValue, normalizeHeader, formatDateValue, parseGanttFromData };
