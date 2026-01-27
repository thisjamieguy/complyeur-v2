import { parseDate } from '../date-parser';
import { MAX_GANTT_COLUMNS } from './constants';
import type { GanttDateColumn } from './types';

/**
 * Finds the row containing date headers in the data.
 * Handles files where dates are not in the first row (e.g., week numbers, day names first).
 * Prioritizes Excel serial date numbers over parsed date strings.
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
    }

    // If we found at least 5 Excel serial dates, use this row
    if (dateColumns.length >= 5) {
      return { rowIndex: rowIdx, dateColumns };
    }
  }

  // Second pass: Look for formatted date strings (e.g., "Mon 06 Jan")
  for (let rowIdx = 0; rowIdx < Math.min(5, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row || !Array.isArray(row)) continue;

    const dateColumns: GanttDateColumn[] = [];
    const maxCol = Math.min(row.length, MAX_GANTT_COLUMNS);

    for (let colIdx = 1; colIdx < maxCol; colIdx++) {
      const cell = row[colIdx];

      if (typeof cell === 'string') {
        const header = cell.trim();
        // Must contain month name to be considered a date header
        if (header && /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(header)) {
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
