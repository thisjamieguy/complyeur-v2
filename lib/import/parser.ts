import ExcelJS from 'exceljs';
import {
  ImportFormat,
  ParsedEmployeeRow,
  ParsedTripRow,
  ParsedRow,
  EMPLOYEE_COLUMNS,
  TRIP_COLUMNS,
  MAX_ROWS,
  MAX_GANTT_TRIPS,
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

  // ExcelJS rich text objects have a { text: string } shape
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === 'string') {
      return sanitizeValue(obj.text);
    }
    // Formula result
    if (typeof obj.result !== 'undefined') {
      return sanitizeValue(obj.result);
    }
    // Date objects
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return '';
      return value.toISOString().split('T')[0];
    }
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
// CSV DETECTION
// ============================================================

function isCSVFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    name.endsWith('.csv') ||
    type === 'text/csv' ||
    type === 'text/plain' ||
    type === 'application/csv'
  );
}

// ============================================================
// PARSE CSV BUFFER TO ROWS
// Minimal RFC-4180 compliant CSV parser that handles:
//   - quoted fields with embedded commas and newlines
//   - BOM prefix
//   - CRLF and LF line endings
// Returns an array of string arrays (rows × columns).
// ============================================================

function parseCSV(text: string): string[][] {
  // Strip BOM
  const raw = text.startsWith('\uFEFF') ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (raw[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    // Not in quotes
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }

    if (ch === '\r') {
      // CRLF or lone CR
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      if (raw[i + 1] === '\n') {
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // Final field/row
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ============================================================
// CONVERT CSV ROWS TO RECORD ARRAY
// ============================================================

function csvRowsToRecords(rows: string[][]): {
  records: Record<string, unknown>[];
  headers: string[];
} {
  if (rows.length === 0) {
    return { records: [], headers: [] };
  }

  // First row is headers
  const headers = rows[0].map((h) => h.trim());

  const records: Record<string, unknown>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip rows that are entirely empty
    if (row.every((cell) => cell.trim() === '')) {
      continue;
    }
    const record: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = row[j] !== undefined ? row[j] : '';
    }
    records.push(record);
  }

  return { records, headers };
}

// ============================================================
// PARSE XLSX BUFFER WITH EXCELJS
// Returns rows as Record<string, unknown>[] and raw headers.
// ============================================================

async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<{
  records: Record<string, unknown>[];
  headers: string[];
}> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS types declare load(buffer: Buffer) with the pre-TS5.7 non-generic Buffer.
  // @types/node 20+ makes Buffer generic (Buffer<ArrayBufferLike>), causing a type mismatch.
  // The runtime behaviour is identical; suppress the stale type error.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error ExcelJS type definitions predate the generic Buffer introduced in @types/node 20
  await workbook.xlsx.load(Buffer.from(buffer));

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('File contains no worksheets');
  }

  // Row 1 is the header row
  const headerRow = worksheet.getRow(1);
  // headerRow.values is 1-based (index 0 is undefined); slice to get 1-based values
  const rawHeaderValues = (headerRow.values as ExcelJS.CellValue[]).slice(1);
  const headers: string[] = rawHeaderValues.map((v) =>
    v !== null && v !== undefined ? String(v).trim() : ''
  );

  const records: Record<string, unknown>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    // row.values is 1-based; slice to align with headers array (0-based)
    const cellValues = (row.values as ExcelJS.CellValue[]).slice(1);

    // Skip rows that are entirely null/undefined/empty
    const hasContent = cellValues.some(
      (v) => v !== null && v !== undefined && String(v).trim() !== ''
    );
    if (!hasContent) return;

    const record: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const cellValue = cellValues[j];
      // Convert cell value to string (dates, numbers, rich text, etc.)
      record[headers[j]] = cellValue !== undefined && cellValue !== null ? cellValue : '';
    }
    records.push(record);
  });

  return { records, headers };
}

// ============================================================
// PARSE FILE BUFFER
// ============================================================

export async function parseFile(file: File, format: ImportFormat): Promise<ParseResult> {
  try {
    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();

    let records: Record<string, unknown>[];
    let rawHeaders: string[];

    if (isCSVFile(file)) {
      const text = new TextDecoder('utf-8').decode(buffer);
      const csvRows = parseCSV(text);
      const result = csvRowsToRecords(csvRows);
      records = result.records;
      rawHeaders = result.headers;
    } else {
      // Excel
      const result = await parseXlsxBuffer(buffer);
      records = result.records;
      rawHeaders = result.headers;
    }

    // Check for empty file
    if (records.length === 0) {
      return {
        success: false,
        error: 'File appears empty. Add data rows below the header row and try again.',
      };
    }

    // Check row limit
    if (records.length > MAX_ROWS) {
      return {
        success: false,
        error: `Import limited to ${MAX_ROWS} rows for performance. Your file has ${records.length} rows. Please split into smaller files.`,
      };
    }

    // Get normalized headers
    const headers = rawHeaders.map(normalizeHeader);

    // Validate headers based on format
    const validationResult = validateHeaders(headers, format);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error };
    }

    // Parse rows based on format
    let parsedData: ParsedRow[];
    if (format === 'employees') {
      parsedData = parseEmployeeRows(records, rawHeaders);
    } else if (format === 'trips') {
      parsedData = parseTripRows(records, rawHeaders);
    } else if (format === 'gantt') {
      // Gantt format - parse schedule and generate trips
      const ganttResult = await parseGanttFromData(buffer, isCSVFile(file));
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

    let records: Record<string, unknown>[];
    let rawHeaders: string[];

    if (isCSVFile(file)) {
      const text = new TextDecoder('utf-8').decode(buffer);
      const csvRows = parseCSV(text);
      const result = csvRowsToRecords(csvRows);
      records = result.records;
      rawHeaders = result.headers;
    } else {
      // Excel
      const result = await parseXlsxBuffer(buffer);
      records = result.records;
      rawHeaders = result.headers;
    }

    // Check for empty file
    if (records.length === 0) {
      return {
        success: false,
        error: 'File appears empty. Add data rows below the header row and try again.',
      };
    }

    // Check row limit
    if (records.length > MAX_ROWS) {
      return {
        success: false,
        error: `Import limited to ${MAX_ROWS} rows for performance. Your file has ${records.length} rows. Please split into smaller files.`,
      };
    }

    // Sanitize all values
    const sanitizedData = records.map((row) => {
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

async function parseGanttFromData(buffer: ArrayBuffer, isCsv = false): Promise<ParseResult> {
  try {
    let data: unknown[][];

    if (isCsv) {
      const text = new TextDecoder('utf-8').decode(buffer);
      data = parseCSV(text);
    } else {
      // Parse Excel to 2D array using ExcelJS
      const workbook = new ExcelJS.Workbook();
      // See parseXlsxBuffer for explanation of the @ts-expect-error below
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error ExcelJS type definitions predate the generic Buffer introduced in @types/node 20
      await workbook.xlsx.load(Buffer.from(buffer));

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return { success: false, error: 'File contains no worksheets' };
      }

      data = [];
      worksheet.eachRow((row) => {
        // row.values is 1-based; slice(1) to get 0-based array
        const rowValues = (row.values as ExcelJS.CellValue[]).slice(1);
        // Convert each cell to a raw primitive (string/number/null) keeping dates as-is
        const rowData = rowValues.map((v) => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object' && v instanceof Date) return v;
          if (typeof v === 'object') {
            const obj = v as unknown as Record<string, unknown>;
            if (typeof obj.result !== 'undefined') return obj.result;
            if (typeof obj.text === 'string') return obj.text;
          }
          return v;
        });
        data.push(rowData);
      });
    }

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
    if (trips.length > MAX_GANTT_TRIPS) {
      return {
        success: false,
        error: `Generated ${trips.length} trips, which exceeds the limit of ${MAX_GANTT_TRIPS}. Please use a smaller date range.`,
      };
    }

    // Convert generated trips to ParsedTripRow format
    const parsedData: ParsedTripRow[] = trips.map((trip) => ({
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

export { sanitizeValue, normalizeHeader, formatDateValue, parseGanttFromData, isCSVFile };
