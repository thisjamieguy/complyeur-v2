/**
 * @fileoverview CSV generation for compliance exports.
 * Phase 12: Exports & Reporting - Items #102, #103
 *
 * Generates CSV files with employee compliance data.
 * Includes UTF-8 BOM for Excel compatibility.
 *
 * CSV Format:
 * - Encoding: UTF-8 with BOM
 * - Date format: ISO 8601 (YYYY-MM-DD)
 * - All text values are sanitized for CSV injection prevention
 */

import { format } from 'date-fns'
import { sanitizeCsvValue, toCsvRow } from './sanitize'
import type { EmployeeExportRow, FutureAlertExportRow } from './types'

/**
 * UTF-8 Byte Order Mark for Excel compatibility.
 * Without this, Excel may not correctly interpret UTF-8 characters.
 */
const UTF8_BOM = '\uFEFF'

/**
 * CSV column headers in the required order.
 * These match the specification exactly.
 */
const CSV_HEADERS = [
  'Employee Name',
  'Status',
  'Days Used',
  'Days Remaining',
  'Last Trip End',
  'Last Trip Country',
  'Next Safe Entry',
  'Total Trips',
  'Risk Level',
] as const

/**
 * Generates a compliance report CSV from employee data.
 *
 * @param rows - Array of employee export data
 * @returns CSV string with UTF-8 BOM, ready for download
 *
 * @example
 * const csvContent = generateComplianceCsv(employees);
 * // Returns: "\uFEFF" + headers + rows
 */
export function generateComplianceCsv(rows: EmployeeExportRow[]): string {
  // Header row
  const headerRow = CSV_HEADERS.join(',')

  // Data rows
  const dataRows = rows.map((row) => {
    const values = [
      sanitizeCsvValue(row.name),
      sanitizeCsvValue(row.status),
      row.daysUsed.toString(),
      row.daysRemaining.toString(),
      row.lastTripEnd ? format(row.lastTripEnd, 'yyyy-MM-dd') : '',
      sanitizeCsvValue(row.lastTripCountry || ''),
      row.nextSafeEntry ? format(row.nextSafeEntry, 'yyyy-MM-dd') : '',
      row.totalTrips.toString(),
      row.riskLevel,
    ]
    return values.join(',')
  })

  // Combine with BOM, header, and data
  const csvContent = [headerRow, ...dataRows].join('\n')

  return UTF8_BOM + csvContent
}

/**
 * Generates the filename for a compliance CSV export.
 *
 * @param date - Date for the filename (defaults to now)
 * @returns Filename in format: complyeur_compliance_report_YYYY-MM-DD.csv
 */
export function getComplianceCsvFilename(date: Date = new Date()): string {
  return `complyeur_compliance_report_${format(date, 'yyyy-MM-dd')}.csv`
}

/**
 * Generates a detailed trip history CSV for a single employee.
 * This is useful for individual audit requests.
 *
 * @param employeeName - Name of the employee
 * @param trips - Array of trip data
 * @returns CSV string with UTF-8 BOM
 */
export function generateTripHistoryCsv(
  employeeName: string,
  trips: Array<{
    entryDate: Date
    exitDate: Date
    country: string
    days: number
    purpose: string | null
  }>
): string {
  const headers = ['Entry Date', 'Exit Date', 'Country', 'Days', 'Purpose']
  const headerRow = headers.join(',')

  const dataRows = trips.map((trip) =>
    toCsvRow([
      format(trip.entryDate, 'yyyy-MM-dd'),
      format(trip.exitDate, 'yyyy-MM-dd'),
      trip.country,
      trip.days,
      trip.purpose || '',
    ])
  )

  const csvContent = [
    `Employee: ${sanitizeCsvValue(employeeName)}`,
    '', // Empty row for separation
    headerRow,
    ...dataRows,
  ].join('\n')

  return UTF8_BOM + csvContent
}

/**
 * Validates that the CSV content appears well-formed.
 * Basic sanity check before download.
 *
 * @param csv - CSV content to validate
 * @returns True if CSV appears valid
 */
export function validateCsvContent(csv: string): boolean {
  // Must start with BOM
  if (!csv.startsWith(UTF8_BOM)) {
    return false
  }

  // Remove BOM and check for content
  const content = csv.slice(1)
  if (content.length === 0) {
    return false
  }

  // Check for header row
  const lines = content.split('\n')
  if (lines.length === 0) {
    return false
  }

  // Header should contain expected column count
  const headerCols = lines[0].split(',').length
  if (headerCols !== CSV_HEADERS.length) {
    return false
  }

  return true
}

/**
 * CSV column headers for future alerts export.
 */
const FUTURE_ALERTS_CSV_HEADERS = [
  'Employee Name',
  'Country',
  'Entry Date',
  'Exit Date',
  'Trip Duration',
  'Days Used Before',
  'Days After Trip',
  'Days Remaining',
  'Status',
  'Compliant',
  'Safe From Date',
] as const

/**
 * Generates a future job alerts CSV from forecast data.
 *
 * @param rows - Array of future alert export data
 * @returns CSV string with UTF-8 BOM, ready for download
 */
export function generateFutureAlertsCsv(rows: FutureAlertExportRow[]): string {
  // Header row
  const headerRow = FUTURE_ALERTS_CSV_HEADERS.join(',')

  // Data rows
  const dataRows = rows.map((row) => {
    const values = [
      sanitizeCsvValue(row.employeeName),
      sanitizeCsvValue(row.country),
      format(row.entryDate, 'yyyy-MM-dd'),
      format(row.exitDate, 'yyyy-MM-dd'),
      row.tripDuration.toString(),
      row.daysUsedBefore.toString(),
      row.daysAfterTrip.toString(),
      row.daysRemaining.toString(),
      sanitizeCsvValue(row.status),
      row.isCompliant ? 'Yes' : 'No',
      row.compliantFromDate ? format(row.compliantFromDate, 'yyyy-MM-dd') : '',
    ]
    return values.join(',')
  })

  // Combine with BOM, header, and data
  const csvContent = [headerRow, ...dataRows].join('\n')

  return UTF8_BOM + csvContent
}

/**
 * Generates the filename for a future alerts CSV export.
 *
 * @param date - Date for the filename (defaults to now)
 * @returns Filename in format: complyeur_future_alerts_YYYY-MM-DD.csv
 */
export function getFutureAlertsCsvFilename(date: Date = new Date()): string {
  return `complyeur_future_alerts_${format(date, 'yyyy-MM-dd')}.csv`
}
