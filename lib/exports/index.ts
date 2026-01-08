/**
 * @fileoverview Exports & Reporting module public API.
 * Phase 12: Exports & Reporting
 *
 * This module provides CSV and PDF export functionality for compliance data.
 */

// Types
export type {
  ComplianceStatus,
  FutureAlertStatus,
  EmployeeExportRow,
  TripExportRow,
  EmployeeWithTrips,
  FutureAlertExportRow,
  FutureAlertsSummary,
  ComplianceSummary,
  PdfMetadata,
  ExportOptions,
  ExportResult,
  ExportAuditEntry,
  DatePreset,
} from './types'

export {
  DATE_PRESETS,
  STATUS_COLORS,
  riskLevelToStatus,
  statusToKey,
  forecastRiskToStatus,
  futureAlertStatusToKey,
} from './types'

// CSV functionality
export {
  generateComplianceCsv,
  getComplianceCsvFilename,
  generateTripHistoryCsv,
  validateCsvContent,
  generateFutureAlertsCsv,
  getFutureAlertsCsvFilename,
} from './csv-generator'

// CSV security
export {
  sanitizeCsvValue,
  sanitizeCsvRow,
  toCsvRow,
  isPotentialCsvInjection,
} from './sanitize'

// PDF functionality
export {
  generateIndividualPdf,
  generateSummaryPdf,
  getCompliancePdfFilename,
  generateFutureAlertsPdf,
  getFutureAlertsPdfFilename,
} from './pdf-generator'
