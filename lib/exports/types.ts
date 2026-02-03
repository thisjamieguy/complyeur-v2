/**
 * @fileoverview Type definitions for exports and reporting module.
 * Phase 12: Exports & Reporting
 *
 * These types define the contract for CSV and PDF export functionality.
 */

import type { RiskLevel } from '@/lib/compliance'
import type { ForecastRiskLevel } from '@/types/forecast'

/**
 * Employee compliance status for export display.
 */
export type ComplianceStatus = 'Compliant' | 'At Risk' | 'Non-Compliant' | 'Breach'

/**
 * Future alert status for export display.
 */
export type FutureAlertStatus = 'Safe' | 'At Risk' | 'Critical'

/**
 * Single employee row for CSV/PDF exports.
 */
export interface EmployeeExportRow {
  /** Employee UUID */
  id: string
  /** Employee full name */
  name: string
  /** Compliance status text */
  status: ComplianceStatus
  /** Days used in current 180-day window */
  daysUsed: number
  /** Days remaining (90 - daysUsed, can be negative) */
  daysRemaining: number
  /** Exit date of most recent trip, or null if no trips */
  lastTripEnd: Date | null
  /** Country name of last trip (not code), or null */
  lastTripCountry: string | null
  /** First date employee can safely enter Schengen, or null if compliant */
  nextSafeEntry: Date | null
  /** Count of trips in 180-day window */
  totalTrips: number
  /** Risk level for color coding */
  riskLevel: RiskLevel
}

/**
 * Trip data for individual employee PDF reports.
 */
export interface TripExportRow {
  /** Trip UUID */
  id: string
  /** Entry date */
  entryDate: Date
  /** Exit date */
  exitDate: Date
  /** Country name (not code) */
  country: string
  /** Number of days */
  days: number
  /** Trip purpose, or null */
  purpose: string | null
  /** Whether this is a private trip */
  isPrivate: boolean
}

/**
 * Employee with full trip history for individual PDF reports.
 */
export interface EmployeeWithTrips extends EmployeeExportRow {
  /** Trip history for the 180-day window */
  trips: TripExportRow[]
}

/**
 * Future job alert row for CSV/PDF exports.
 */
export interface FutureAlertExportRow {
  /** Trip UUID */
  tripId: string
  /** Employee name */
  employeeName: string
  /** Country name (not code) */
  country: string
  /** Trip entry date */
  entryDate: Date
  /** Trip exit date */
  exitDate: Date
  /** Trip duration in days */
  tripDuration: number
  /** Days used before the trip starts */
  daysUsedBefore: number
  /** Days that will be used after the trip */
  daysAfterTrip: number
  /** Days remaining after trip (can be negative) */
  daysRemaining: number
  /** Status: Safe, At Risk, or Critical */
  status: FutureAlertStatus
  /** Risk level for color coding */
  riskLevel: ForecastRiskLevel
  /** Whether the trip is compliant */
  isCompliant: boolean
  /** Date when trip would become compliant (if over limit) */
  compliantFromDate: Date | null
}

/**
 * Summary statistics for future alerts reports.
 */
export interface FutureAlertsSummary {
  /** Total number of future trips */
  totalTrips: number
  /** Count of safe trips (green) */
  safeCount: number
  /** Count of at-risk trips (yellow) */
  atRiskCount: number
  /** Count of critical trips (red) */
  criticalCount: number
}

/**
 * Summary statistics for compliance reports.
 */
export interface ComplianceSummary {
  /** Total number of employees */
  totalEmployees: number
  /** Count of compliant employees (green status) */
  compliantCount: number
  /** Count of at-risk employees (amber status) */
  atRiskCount: number
  /** Count of non-compliant employees (red status) */
  nonCompliantCount: number
  /** Compliance percentage */
  compliancePercentage: number
}

/**
 * PDF document metadata for audit trail.
 */
export interface PdfMetadata {
  /** Unique document ID: RPT-YYYY-XXXXXX */
  documentId: string
  /** ISO 8601 timestamp when generated (UTC) */
  generatedAt: string
  /** Email of user who generated the report */
  generatedBy: string
  /** Company UUID for audit trail */
  companyId: string
  /** Company name for display */
  companyName: string
  /** Type of report */
  reportType: 'individual' | 'summary' | 'future_alerts'
  /** Date range covered by the report */
  dateRange: {
    /** Window start date (ISO string) */
    start: string
    /** Window end/reference date (ISO string) */
    end: string
  }
  /** Number of records in the report */
  recordCount: number
  /** Application version */
  version: string
}

/**
 * Export configuration options from the UI.
 */
export interface ExportOptions {
  /** Export scope */
  scope: 'all' | 'single' | 'filtered' | 'future-alerts'
  /** Single employee ID (when scope is 'single') */
  employeeId?: string
  /** Status filter (when scope is 'filtered') */
  statusFilter?: 'compliant' | 'at-risk' | 'non-compliant'
  /** Future alerts filter (when scope is 'future-alerts') */
  alertsFilter?: 'all' | 'at-risk' | 'critical'
  /** Date range for the report */
  dateRange: {
    /** Start date (ISO string) */
    start: string
    /** End date / reference date (ISO string) */
    end: string
  }
  /** Export format */
  format: 'csv' | 'pdf'
}

/**
 * Result of an export operation.
 */
export interface ExportResult {
  /** Whether the export succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Generated file name */
  fileName?: string
  /** MIME type of the file */
  mimeType?: string
  /** File content (string for CSV, base64 for PDF) */
  content?: string
  /** Document ID for audit reference */
  documentId?: string
}

/**
 * Audit log entry for export operations.
 */
export interface ExportAuditEntry {
  /** Export format */
  exportType: 'csv' | 'pdf'
  /** Type of report */
  reportType: 'compliance_summary' | 'individual_employee' | 'future_alerts'
  /** Employee ID if individual report */
  employeeId?: string
  /** Number of records exported */
  recordCount: number
  /** Date range of the export */
  dateRange: {
    start: string
    end: string
  }
  /** Document ID */
  documentId: string
  /** Timestamp when generated */
  generatedAt: string
}

/**
 * Date range preset configuration.
 */
export interface DatePreset {
  /** Display label */
  label: string
  /** Number of days to look back (for simple presets) */
  days?: number
  /** Preset type for complex calculations */
  type?: 'quarter' | 'last-quarter' | 'ytd' | 'custom'
}

/**
 * Date range presets for the export UI.
 */
export const DATE_PRESETS: DatePreset[] = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 180 days', days: 180 },
  { label: 'This quarter', type: 'quarter' },
  { label: 'Last quarter', type: 'last-quarter' },
  { label: 'Year to date', type: 'ytd' },
  { label: 'Custom range', type: 'custom' },
]

/**
 * Status display configuration for consistent styling.
 */
export const STATUS_COLORS = {
  compliant: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    pdf: {
      bg: '#F0FDF4',
      text: '#16A34A',
    },
  },
  'at-risk': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    pdf: {
      bg: '#FFFBEB',
      text: '#D97706',
    },
  },
  'non-compliant': {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    pdf: {
      bg: '#FEF2F2',
      text: '#DC2626',
    },
  },
  breach: {
    bg: 'bg-slate-900',
    text: 'text-white',
    border: 'border-slate-900',
    pdf: {
      bg: '#0F172A',
      text: '#FFFFFF',
    },
  },
} as const

/**
 * Map risk level to status for display.
 */
export function riskLevelToStatus(riskLevel: RiskLevel): ComplianceStatus {
  switch (riskLevel) {
    case 'green':
      return 'Compliant'
    case 'amber':
      return 'At Risk'
    case 'red':
      return 'Non-Compliant'
    case 'breach':
      return 'Breach'
  }
}

/**
 * Map status to status key for color lookup.
 */
export function statusToKey(
  status: ComplianceStatus
): 'compliant' | 'at-risk' | 'non-compliant' | 'breach' {
  switch (status) {
    case 'Compliant':
      return 'compliant'
    case 'At Risk':
      return 'at-risk'
    case 'Non-Compliant':
      return 'non-compliant'
    case 'Breach':
      return 'breach'
  }
}

/**
 * Map forecast risk level to future alert status.
 */
export function forecastRiskToStatus(riskLevel: ForecastRiskLevel): FutureAlertStatus {
  switch (riskLevel) {
    case 'green':
      return 'Safe'
    case 'yellow':
      return 'At Risk'
    case 'red':
      return 'Critical'
  }
}

/**
 * Map future alert status to color key.
 */
export function futureAlertStatusToKey(
  status: FutureAlertStatus
): 'compliant' | 'at-risk' | 'non-compliant' {
  switch (status) {
    case 'Safe':
      return 'compliant'
    case 'At Risk':
      return 'at-risk'
    case 'Critical':
      return 'non-compliant'
  }
}
