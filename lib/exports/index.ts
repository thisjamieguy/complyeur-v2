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

// Travel audit engine + types
export {
  buildEmployeeTravelAudit,
  buildCompanyTravelAudit,
} from './travel-audit'
export type {
  AuditTripInput,
  AuditEmployeeInput,
  AuditWindow,
  AuditOptions,
  CountryPresence,
  TravelAuditTotals,
  EmployeeTravelAudit,
  CompanyTravelAudit,
} from './travel-audit'

// Travel audit CSV
export {
  generateIndividualAuditCsv,
  generateCompanyAuditCsv,
  getIndividualAuditCsvFilename,
  getCompanyAuditCsvFilename,
} from './travel-audit-csv'

// Travel audit PDF: import directly from '@/lib/exports/travel-audit-pdf'
// to avoid pulling @react-pdf/renderer into unrelated module graphs.

// PDF functions: import directly from '@/lib/exports/pdf-generator'
// to avoid pulling @react-pdf/renderer into unrelated module graphs.
