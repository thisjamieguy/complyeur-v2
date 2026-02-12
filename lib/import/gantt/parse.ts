/**
 * Gantt/Schedule Parser for ComplyEur Import
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

import { parseCell } from './cell-parser';
import { findDataStartRow, findDateHeaderRow, shouldSkipRow } from './header-detection';
import type { GanttParseResult, GanttRow } from './types';

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

  // Find the row containing date headers (handles multi-row headers)
  const dateHeaderResult = findDateHeaderRow(data, referenceYear);

  if (!dateHeaderResult) {
    return {
      success: false,
      error:
        'No date columns found. Headers should be dates like "Mon 06 Jan", "06/01", "2025-01-06", or Excel serial numbers.',
      dateColumns: [],
      rows: [],
      referenceYear,
      ignoredColumns: [],
    };
  }

  const { rowIndex: dateHeaderRowIndex, dateColumns } = dateHeaderResult;

  // Sort date columns chronologically
  dateColumns.sort((a, b) => {
    if (!a.date.date || !b.date.date) return 0;
    return a.date.date.localeCompare(b.date.date);
  });

  // Find ignored columns (columns that aren't dates)
  const dateColIndices = new Set(dateColumns.map((dc) => dc.index));
  const ignoredColumns: Array<{ index: number; header: string }> = [];
  const headerRow = data[dateHeaderRowIndex] as unknown[];

  for (let i = 0; i < headerRow.length; i++) {
    if (i === nameColumn) continue;
    if (!dateColIndices.has(i)) {
      ignoredColumns.push({ index: i, header: String(headerRow[i] ?? '(empty)') });
    }
  }

  // Find where employee data starts
  const dataStartRow = findDataStartRow(data, dateHeaderRowIndex, nameColumn);

  // Auto-detect email column if not specified
  let emailColumn = options.emailColumn;
  if (emailColumn === undefined) {
    // Check all header rows for email column
    for (let r = 0; r <= dateHeaderRowIndex; r++) {
      const row = data[r] as unknown[];
      for (let c = 0; c < row.length; c++) {
        const header = String(row[c] ?? '').toLowerCase();
        if (header === 'email' || header === 'e-mail') {
          emailColumn = c;
          break;
        }
      }
      if (emailColumn !== undefined) break;
    }
  }

  // Parse data rows
  const rows: GanttRow[] = [];

  for (let r = dataStartRow; r < data.length; r++) {
    const row = data[r];
    if (!row || !Array.isArray(row)) continue;

    const employeeName = String(row[nameColumn] ?? '').trim();

    // Skip non-employee rows
    if (shouldSkipRow(employeeName)) continue;

    const email = emailColumn !== undefined ? String(row[emailColumn] ?? '').trim() : undefined;

    const cells = dateColumns.map((dc) => parseCell(row[dc.index], r, dc.index));

    rows.push({
      index: r,
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
