import { parseDate } from '../date-parser';
import { MAX_GANTT_COLUMNS } from './constants';
import type { GanttDateColumn } from './types';

/** ISO date pattern: YYYY-MM-DD */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Numeric date pattern: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (and MM/DD variants) */
const NUMERIC_DATE_RE = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/;

/** Short numeric date: DD/MM or MM/DD (no year) */
const SHORT_NUMERIC_DATE_RE = /^\d{1,2}[\/\-\.]\d{1,2}$/;

/** Month name abbreviation */
const MONTH_NAME_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;

/**
 * Finds the row containing date headers in the data.
 * Handles files where dates are not in the first row (e.g., week numbers, day names first).
 * Prioritizes Excel serial date numbers, then Date objects, then formatted strings.
 */
export function findDateHeaderRow(
  data: unknown[][],
  referenceYear: number
): { rowIndex: number; dateColumns: GanttDateColumn[] } | null {
  // First pass: Look specifically for Excel serial dates (most reliable)
  for (let rowIdx = 0; rowIdx < Math.min(10, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row || !Array.isArray(row)) continue;

    const dateColumns: GanttDateColumn[] = [];

    // Limit columns to avoid garbage data at the end, but allow wide schedules
    const maxCol = Math.min(row.length, MAX_GANTT_COLUMNS);

    for (let colIdx = 1; colIdx < maxCol; colIdx++) {
      const cell = row[colIdx];

      // Check for Excel serial date numbers (numbers between ~40000 and ~50000 for 2010-2035)
      if (typeof cell === 'number' && cell >= 40000 && cell <= 50000) {
        const dateResult = parseDate(cell, { referenceYear, isGanttHeader: true });
        if (dateResult.date) {
          dateColumns.push({
            index: colIdx,
            header: String(cell),
            date: dateResult,
          });
        }
      }

      // Check for JavaScript Date objects (ExcelJS converts date-formatted cells to Date)
      if (cell instanceof Date && !isNaN(cell.getTime())) {
        const isoStr = cell.toISOString().split('T')[0];
        const dateResult = parseDate(isoStr, { referenceYear, isGanttHeader: true });
        if (dateResult.date) {
          dateColumns.push({
            index: colIdx,
            header: isoStr,
            date: dateResult,
          });
        }
      }
    }

    // If we found at least 5 serial/Date-object dates, use this row
    if (dateColumns.length >= 5) {
      return { rowIndex: rowIdx, dateColumns };
    }
  }

  // Second pass: Look for formatted date strings (month names, ISO, numeric)
  for (let rowIdx = 0; rowIdx < Math.min(5, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row || !Array.isArray(row)) continue;

    const dateColumns: GanttDateColumn[] = [];
    const maxCol = Math.min(row.length, MAX_GANTT_COLUMNS);

    for (let colIdx = 1; colIdx < maxCol; colIdx++) {
      const cell = row[colIdx];

      if (typeof cell === 'string') {
        const header = cell.trim();
        if (!header) continue;

        // Match: month name strings, ISO dates, numeric dates (DD/MM/YYYY), short dates (DD/MM)
        const looksLikeDate =
          MONTH_NAME_RE.test(header) ||
          ISO_DATE_RE.test(header) ||
          NUMERIC_DATE_RE.test(header) ||
          SHORT_NUMERIC_DATE_RE.test(header);

        if (looksLikeDate) {
          const dateResult = parseDate(header, { referenceYear, isGanttHeader: true });
          if (dateResult.date) {
            dateColumns.push({
              index: colIdx,
              header,
              date: dateResult,
            });
          }
        }
      }
    }

    // If we found at least 3 formatted dates, use this row
    if (dateColumns.length >= 3) {
      return { rowIndex: rowIdx, dateColumns };
    }
  }

  return null;
}

/**
 * Finds the first row after the date header that contains employee data.
 * Skips empty rows and rows that look like sub-headers.
 */
export function findDataStartRow(
  data: unknown[][],
  dateHeaderRow: number,
  nameColumn: number
): number {
  for (let rowIdx = dateHeaderRow + 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || !Array.isArray(row)) continue;

    const name = String(row[nameColumn] ?? '').trim();

    // Skip empty rows
    if (!name) continue;

    // Skip known header-like values
    const lower = name.toLowerCase();
    if (lower === 'employee' || lower === 'name' || lower === 'unallocated') continue;

    // Found first data row
    return rowIdx;
  }

  return dateHeaderRow + 1;
}

/**
 * Checks if a row should be skipped (not an employee row).
 */
export function shouldSkipRow(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return (
    !name ||
    lower === 'unallocated' ||
    lower === '' ||
    lower === 'employee' ||
    lower === 'name' ||
    // Skip rows that are just numbers (week numbers, etc.)
    /^\d+$/.test(name)
  );
}
