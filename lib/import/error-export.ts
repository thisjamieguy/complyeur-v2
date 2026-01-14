/**
 * Error CSV Export for Import Validation
 *
 * Generates a CSV file containing validation errors from an import session.
 * Uses the same sanitization patterns as other CSV exports.
 */

import { format } from 'date-fns';
import { sanitizeCsvValue, toCsvRow } from '../exports/sanitize';
import type { ValidationError } from '@/types/import';

/**
 * UTF-8 Byte Order Mark for Excel compatibility.
 */
const UTF8_BOM = '\uFEFF';

/**
 * CSV column headers for error export.
 */
const ERROR_CSV_HEADERS = ['Row', 'Field', 'Value', 'Message', 'Severity'] as const;

/**
 * Generates a CSV containing validation errors.
 *
 * @param errors - Array of validation errors
 * @returns CSV string with UTF-8 BOM, ready for download
 */
export function generateErrorCsv(errors: ValidationError[]): string {
  const headerRow = ERROR_CSV_HEADERS.join(',');

  const dataRows = errors.map((error) =>
    toCsvRow([
      error.row,
      error.column,
      error.value ?? '',
      error.message,
      error.severity,
    ])
  );

  const csvContent = [headerRow, ...dataRows].join('\n');

  return UTF8_BOM + csvContent;
}

/**
 * Generates a filename for the error CSV export.
 *
 * @param originalFileName - Original import file name (for context)
 * @returns Filename in format: import_errors_FILENAME_YYYY-MM-DD_HH-mm.csv
 */
export function getErrorCsvFilename(originalFileName: string): string {
  // Extract base name without extension
  const baseName = originalFileName.replace(/\.[^/.]+$/, '');
  // Sanitize for use in filename
  const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');

  return `import_errors_${safeName}_${timestamp}.csv`;
}

/**
 * Triggers a browser download of CSV content.
 *
 * @param content - CSV content string
 * @param fileName - Name for the downloaded file
 */
export function downloadCsv(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
