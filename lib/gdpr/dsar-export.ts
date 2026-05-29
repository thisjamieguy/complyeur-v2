/**
 * @fileoverview DSAR (Data Subject Access Request) Export Tool
 *
 * Implements GDPR Article 15 - Right of Access by generating a comprehensive
 * ZIP archive containing all personal data held for an employee.
 *
 * ZIP Contents:
 * - README.txt: Human-readable explanation of the export
 * - employee_data.json: Full employee record
 * - employee_data.csv: Same data in spreadsheet format
 * - trips.json: All trips for this employee
 * - trips.csv: Same data in spreadsheet format
 * - alerts.json / alerts.csv: Employee-linked compliance alerts
 * - notification_log.json / notification_log.csv: Employee-linked notification events
 * - import_sessions.json: Employee-linked retained import staging/history rows, where present
 * - stored_compliance_snapshots.json: Stored application snapshot rows, where present
 * - current_compliance_calculation.json: Current compliance calculation generated at export time
 * - metadata.json: Export metadata and scope
 */

import JSZip from 'jszip'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { requireAdminAccess } from '@/lib/security/authorization'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import {
  createEmployeeAuditLabel,
  logGdprAction,
  type DsarExportDetails,
} from './audit'
import {
  calculateCompliance,
  getWindowBounds,
  isSchengenCountry,
  parseDateOnlyAsUTC,
  type Trip as ComplianceTrip,
  type RiskLevel,
} from '@/lib/compliance'
import { toUTCMidnight } from '@/lib/compliance/date-utils'
import { getCountryName } from '@/lib/constants/schengen-countries'

/**
 * Employee data structure for export
 */
interface EmployeeExportData {
  id: string
  name: string
  email: string | null
  nationality_type: string | null
  created_at: string
  updated_at: string
  anonymized_at: string | null
  anonymized_by: string | null
  deleted_at: string | null
}

/**
 * Trip data structure for export
 */
interface TripExportData {
  id: string
  country_code: string
  country_name: string
  entry_date: string
  exit_date: string
  travel_days: number
  purpose: string | null
  job_ref: string | null
  is_private: boolean
  is_schengen: boolean
  created_at: string
  updated_at: string
}

interface AlertExportData {
  id: string
  alert_type: string
  risk_level: string
  message: string
  days_used: number | null
  email_sent: boolean
  acknowledged: boolean
  acknowledged_at: string | null
  acknowledged_by: string | null
  resolved: boolean
  resolved_at: string | null
  created_at: string
}

interface NotificationLogExportData {
  id: string
  alert_id: string | null
  notification_type: string
  recipient_email: string
  subject: string
  status: string
  sent_at: string | null
  resend_message_id: string | null
  error_message: string | null
  created_at: string
}

interface StoredComplianceSnapshotExportData {
  id: string
  snapshot_generated_at: string
  days_used: number
  days_remaining: number
  risk_level: string
  is_compliant: boolean
  next_reset_date: string | null
  trips_hash: string | null
  created_at: string
  updated_at: string
}

interface ImportSessionExportData {
  id: string
  format: string
  status: string
  file_name: string
  file_size: number
  total_rows: number | null
  valid_rows: number | null
  error_rows: number | null
  matched_parsed_rows: unknown[]
  matched_validation_errors: unknown[]
  matched_result_errors: unknown[]
  matched_result_warnings: unknown[]
  created_at: string | null
  completed_at: string | null
}

/**
 * Compliance snapshot for export
 */
interface ComplianceSnapshot {
  calculated_at: string
  reference_date: string
  days_used: number
  days_remaining: number
  risk_level: RiskLevel
  window_start: string
  window_end: string
}

/**
 * Export metadata
 */
interface ExportMetadata {
  export_id: string
  export_date: string
  export_format: 'zip'
  data_subject: {
    id: string
    name: string
  }
  company: {
    id: string
    name: string
  }
  exporter: {
    id: string
    email: string
  }
  data_scope: {
    includes_employee_data: boolean
    includes_trips: boolean
    includes_alerts: boolean
    includes_notification_logs: boolean
    includes_import_sessions: boolean
    includes_stored_compliance_snapshots: boolean
    includes_generated_current_compliance_calculation: boolean
    trip_count: number
    alert_count: number
    notification_log_count: number
    import_session_count: number
    stored_compliance_snapshot_count: number
    date_range: {
      earliest_trip: string | null
      latest_trip: string | null
    }
  }
  retention_policy: {
    months: number
    scheduled_deletion: string | null
  }
  gdpr_article: 'Article 15 - Right of Access'
}

/**
 * Converts an array of objects to CSV format
 */
function arrayToCsv<T extends object>(
  data: T[],
  columns: Array<{ key: keyof T; header: string }>
): string {
  if (data.length === 0) {
    return columns.map((c) => `"${c.header}"`).join(',') + '\n'
  }

  const headers = columns.map((c) => `"${c.header}"`).join(',')
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const value = row[c.key]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes for CSV safety
          return `"${value.replace(/"/g, '""')}"`
        }
        if (typeof value === 'boolean') return value ? 'Yes' : 'No'
        return String(value)
      })
      .join(',')
  )

  return [headers, ...rows].join('\n')
}

function normalizeMatchValue(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().trim() : ''
}

function containsNeedle(value: unknown, needles: string[]): boolean {
  const normalizedValue = normalizeMatchValue(value)
  return needles.some((needle) => needle.length > 0 && normalizedValue.includes(needle))
}

function parsedImportRowMatchesEmployee(
  row: unknown,
  employee: Pick<EmployeeExportData, 'name' | 'email'>
): boolean {
  if (!row || typeof row !== 'object') {
    return false
  }

  const record = row as Record<string, unknown>
  const employeeName = normalizeMatchValue(employee.name)
  const employeeEmail = normalizeMatchValue(employee.email)
  const directNeedles = [employeeEmail, employeeName].filter(Boolean)

  const fullName = [record.first_name, record.last_name]
    .map((part) => normalizeMatchValue(part))
    .filter(Boolean)
    .join(' ')

  return (
    containsNeedle(record.email, directNeedles) ||
    containsNeedle(record.employee_email, directNeedles) ||
    containsNeedle(record.employee_name, directNeedles) ||
    (employeeName.length > 0 && fullName === employeeName)
  )
}

function validationErrorMatchesEmployee(
  error: unknown,
  employee: Pick<EmployeeExportData, 'name' | 'email'>
): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const record = error as Record<string, unknown>
  const needles = [
    normalizeMatchValue(employee.name),
    normalizeMatchValue(employee.email),
  ].filter(Boolean)

  return containsNeedle(record.value, needles) || containsNeedle(record.message, needles)
}

function importResultEntries(result: unknown, key: 'errors' | 'warnings'): unknown[] {
  if (!result || typeof result !== 'object') {
    return []
  }

  const entries = (result as Record<string, unknown>)[key]
  return Array.isArray(entries) ? entries : []
}

function importSessionResultMatchesEmployee(
  result: unknown,
  employee: Pick<EmployeeExportData, 'name' | 'email'>
): { errors: unknown[]; warnings: unknown[] } {
  return {
    errors: importResultEntries(result, 'errors').filter((entry) =>
      validationErrorMatchesEmployee(entry, employee)
    ),
    warnings: importResultEntries(result, 'warnings').filter((entry) =>
      validationErrorMatchesEmployee(entry, employee)
    ),
  }
}

/**
 * Generates the README.txt content
 */
function generateReadme(
  employee: EmployeeExportData,
  company: { name: string },
  exporter: { email: string },
  tripCount: number,
  alertCount: number,
  notificationLogCount: number,
  storedComplianceSnapshotCount: number,
  importSessionCount: number,
  retentionMonths: number
): string {
  const exportDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss zzz')

  return `COMPLYEUR DATA EXPORT
=====================

Export Date: ${exportDate}
Requested By: ${exporter.email}
Data Subject: ${employee.name}
Company: ${company.name}

This archive contains the employee-linked personal data categories
currently exported by ${company.name} for the above data subject
under GDPR Article 15 (Right of Access).

FILES INCLUDED:
---------------
- employee_data.json: Employee record fields held by the app in JSON format
- employee_data.csv: Same data in spreadsheet-compatible format
- trips.json: All recorded travel trips (${tripCount} trips) in JSON format
- trips.csv: Same data in spreadsheet-compatible format
- alerts.json: Employee-linked compliance alerts (${alertCount} records)
- alerts.csv: Same data in spreadsheet-compatible format
- notification_log.json: Employee-linked notification events (${notificationLogCount} records)
- notification_log.csv: Same data in spreadsheet-compatible format
- import_sessions.json: Retained import staging/history rows that match this employee (${importSessionCount} records)
- stored_compliance_snapshots.json: Stored snapshot rows generated by the application (${storedComplianceSnapshotCount} records)
- current_compliance_calculation.json: Current compliance calculation generated at export time
- metadata.json: Technical details about this export

DATA DESCRIPTION:
-----------------
Employee Data:
  Contains your identifier, name, email address (if stored),
  nationality classification, and system timestamps/flags.

Trip Data:
  Contains all travel records including destination country,
  entry/exit dates, purpose of travel, and job references.
  Private trips are marked accordingly.

Alert Data:
  Contains employee-linked compliance alerts created by the app,
  including risk level, acknowledgement state, and timestamps.

Notification Log Data:
  Contains employee-linked notification delivery records such as
  recipient email, message subject, delivery status, and errors.

Import Session Data:
  Contains retained import rows, validation errors, and import result errors
  or warnings that could be matched to this employee, where such staging data
  has not yet been purged.

Stored Compliance Snapshots:
  Contains snapshot rows stored by the application database, where present.

Current Compliance Calculation:
  Contains a compliance calculation generated at export time from the
  current trip data. It is not presented as a stored historical record.

DATA RETENTION:
---------------
This data is retained for ${retentionMonths} months from the date of
your last recorded activity, as per company policy and legal
requirements for employment records.

YOUR RIGHTS UNDER GDPR:
-----------------------
- Right to Rectification (Article 16): Request correction of inaccurate data
- Right to Erasure (Article 17): Request deletion of your data
- Right to Data Portability (Article 20): Receive data in machine-readable format
- Right to Object (Article 21): Object to processing of your data

QUESTIONS OR CONCERNS:
----------------------
Contact your company administrator or HR department.

---
Generated by ComplyEur - Schengen Compliance Tracking
https://complyeur.com
`
}

/**
 * Result of DSAR export generation
 */
export interface DsarExportResult {
  success: true
  zipBuffer: Buffer
  fileName: string
  metadata: ExportMetadata
}

export interface DsarExportError {
  success: false
  error: string
  code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'DATABASE_ERROR' | 'EXPORT_ERROR'
}

/**
 * Generates a DSAR export ZIP file for an employee.
 *
 * @param employeeId - The employee to export data for
 * @returns ZIP buffer and metadata, or error
 *
 * @example
 * ```ts
 * const result = await generateDsarExport(employeeId)
 * if (result.success) {
 *   // result.zipBuffer contains the ZIP file
 *   // result.fileName is the suggested filename
 * }
 * ```
 */
export async function generateDsarExport(
  employeeId: string
): Promise<DsarExportResult | DsarExportError> {
  const supabase = await createClient()
  const generatedAt = new Date()
  const generatedAtIso = generatedAt.toISOString()

  try {
    const auth = await requireAdminAccess(supabase)
    if (!auth.allowed) {
      return {
        success: false,
        error: auth.error,
        code: 'UNAUTHORIZED',
      }
    }

    const { user, profile } = auth

    if (!profile?.company_id) {
      return {
        success: false,
        error: 'No company associated with user',
        code: 'UNAUTHORIZED',
      }
    }

    // Get employee (RLS ensures company isolation)
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
      return {
        success: false,
        error: 'Employee not found or access denied',
        code: 'NOT_FOUND',
      }
    }

    const employeeCompanyId = (employee as Record<string, unknown>).company_id as string | null
    if (!employeeCompanyId) {
      return {
        success: false,
        error: 'Employee not found or access denied',
        code: 'NOT_FOUND',
      }
    }

    await requireCompanyAccess(supabase, employeeCompanyId)

    // Get company info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', profile.company_id ?? '')
      .single()

    if (companyError || !company) {
      return {
        success: false,
        error: 'Could not find company information',
        code: 'DATABASE_ERROR',
      }
    }

    // Get company settings for retention info
    const { data: settings } = await supabase
      .from('company_settings')
      .select('retention_months')
      .eq('company_id', profile.company_id ?? '')
      .single()

    const retentionMonths = settings?.retention_months ?? 36

    const [
      { data: trips, error: tripsError },
      { data: alerts, error: alertsError },
      { data: notificationLogs, error: notificationLogsError },
      { data: storedComplianceSnapshots, error: complianceSnapshotsError },
      { data: importSessions, error: importSessionsError },
    ] = await Promise.all([
      supabase
        .from('trips')
        .select('*')
        .eq('employee_id', employeeId)
        .order('entry_date', { ascending: false }),
      supabase
        .from('alerts')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false }),
      supabase
        .from('notification_log')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false }),
      supabase
        .from('employee_compliance_snapshots')
        .select('*')
        .eq('employee_id', employeeId)
        .order('snapshot_generated_at', { ascending: false }),
      supabase
        .from('import_sessions')
        .select('id, format, status, file_name, file_size, total_rows, valid_rows, error_rows, parsed_data, validation_errors, result, created_at, completed_at')
        .eq('company_id', employeeCompanyId)
        .order('created_at', { ascending: false }),
    ])

    if (
      tripsError ||
      alertsError ||
      notificationLogsError ||
      complianceSnapshotsError ||
      importSessionsError
    ) {
      const errorMessage =
        tripsError?.message ??
        alertsError?.message ??
        notificationLogsError?.message ??
        complianceSnapshotsError?.message ??
        importSessionsError?.message ??
        'Failed to fetch employee-linked data'

      return {
        success: false,
        error: errorMessage,
        code: 'DATABASE_ERROR',
      }
    }

    const tripList = trips ?? []
    const alertList = alerts ?? []
    const notificationLogList = notificationLogs ?? []
    const storedComplianceSnapshotList = storedComplianceSnapshots ?? []

    // Prepare employee data for export
    const employeeData: EmployeeExportData = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      nationality_type: (employee as Record<string, unknown>).nationality_type as string | null ?? null,
      created_at: employee.created_at,
      updated_at: employee.updated_at,
      anonymized_at: (employee as Record<string, unknown>).anonymized_at as string | null ?? null,
      anonymized_by: (employee as Record<string, unknown>).anonymized_by as string | null ?? null,
      deleted_at: (employee as Record<string, unknown>).deleted_at as string | null ?? null,
    }

    // Prepare trip data for export
    const tripData: TripExportData[] = tripList.map((trip) => ({
      id: trip.id,
      country_code: trip.country,
      country_name: getCountryName(trip.country),
      entry_date: trip.entry_date,
      exit_date: trip.exit_date,
      travel_days: trip.travel_days ?? 0,
      purpose: trip.purpose,
      job_ref: trip.job_ref,
      is_private: trip.is_private ?? false,
      is_schengen: isSchengenCountry(trip.country),
      created_at: trip.created_at,
      updated_at: trip.updated_at,
    }))

    const alertData: AlertExportData[] = alertList.map((alert) => ({
      id: alert.id,
      alert_type: alert.alert_type,
      risk_level: alert.risk_level,
      message: alert.message,
      days_used: alert.days_used,
      email_sent: alert.email_sent ?? false,
      acknowledged: alert.acknowledged ?? false,
      acknowledged_at: alert.acknowledged_at,
      acknowledged_by: alert.acknowledged_by,
      resolved: alert.resolved ?? false,
      resolved_at: alert.resolved_at,
      created_at: alert.created_at,
    }))

    const notificationLogData: NotificationLogExportData[] = notificationLogList.map((log) => ({
      id: log.id,
      alert_id: log.alert_id,
      notification_type: log.notification_type,
      recipient_email: log.recipient_email,
      subject: log.subject,
      status: log.status,
      sent_at: log.sent_at,
      resend_message_id: log.resend_message_id,
      error_message: log.error_message,
      created_at: log.created_at,
    }))

    const storedComplianceSnapshotData: StoredComplianceSnapshotExportData[] =
      storedComplianceSnapshotList.map((snapshot) => ({
        id: snapshot.id,
        snapshot_generated_at: snapshot.snapshot_generated_at,
        days_used: snapshot.days_used,
        days_remaining: snapshot.days_remaining,
        risk_level: snapshot.risk_level,
        is_compliant: snapshot.is_compliant,
        next_reset_date: snapshot.next_reset_date,
        trips_hash: snapshot.trips_hash,
        created_at: snapshot.created_at,
        updated_at: snapshot.updated_at,
      }))

    const importSessionData: ImportSessionExportData[] = (importSessions ?? [])
      .map((session) => {
        const parsedRows = Array.isArray(session.parsed_data) ? session.parsed_data : []
        const validationErrors = Array.isArray(session.validation_errors)
          ? session.validation_errors
          : []
        const matchedParsedRows = parsedRows.filter((row) =>
          parsedImportRowMatchesEmployee(row, employeeData)
        )
        const matchedValidationErrors = validationErrors.filter((error) =>
          validationErrorMatchesEmployee(error, employeeData)
        )
        const matchedResult = importSessionResultMatchesEmployee(session.result, employeeData)

        return {
          id: session.id,
          format: session.format,
          status: session.status,
          file_name: session.file_name,
          file_size: session.file_size,
          total_rows: session.total_rows,
          valid_rows: session.valid_rows,
          error_rows: session.error_rows,
          matched_parsed_rows: matchedParsedRows,
          matched_validation_errors: matchedValidationErrors,
          matched_result_errors: matchedResult.errors,
          matched_result_warnings: matchedResult.warnings,
          created_at: session.created_at,
          completed_at: session.completed_at,
        }
      })
      .filter(
        (session) =>
          session.matched_parsed_rows.length > 0 ||
          session.matched_validation_errors.length > 0 ||
          session.matched_result_errors.length > 0 ||
          session.matched_result_warnings.length > 0
      )

    // Calculate current compliance snapshot
    const complianceReferenceDate = toUTCMidnight(generatedAt)
    const schengenTrips: ComplianceTrip[] = tripList
      .filter((t) => !t.ghosted && isSchengenCountry(t.country))
      .map((t) => ({
        id: t.id,
        country: t.country,
        entryDate: parseDateOnlyAsUTC(t.entry_date),
        exitDate: parseDateOnlyAsUTC(t.exit_date),
      }))

    const compliance = calculateCompliance(schengenTrips, {
      mode: 'audit',
      referenceDate: complianceReferenceDate,
    })

    // Calculate 180-day window for compliance using the core engine logic.
    const { windowStart, windowEnd } = getWindowBounds(complianceReferenceDate)

    const complianceSnapshot: ComplianceSnapshot = {
      calculated_at: generatedAtIso,
      reference_date: complianceReferenceDate.toISOString().slice(0, 10),
      days_used: compliance.daysUsed,
      days_remaining: compliance.daysRemaining,
      risk_level: compliance.riskLevel,
      window_start: windowStart.toISOString().slice(0, 10),
      window_end: windowEnd.toISOString().slice(0, 10),
    }

    // Find date range of trips
    const tripDates = tripList.map((t) => new Date(t.entry_date))
    const earliestTrip =
      tripDates.length > 0
        ? format(new Date(Math.min(...tripDates.map((d) => d.getTime()))), 'yyyy-MM-dd')
        : null
    const latestTrip =
      tripDates.length > 0
        ? format(new Date(Math.max(...tripDates.map((d) => d.getTime()))), 'yyyy-MM-dd')
        : null

    // Generate export ID
    const exportId = `DSAR-${format(generatedAt, 'yyyyMMdd')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

    // Prepare metadata
    const metadata: ExportMetadata = {
      export_id: exportId,
      export_date: generatedAtIso,
      export_format: 'zip',
      data_subject: {
        id: employee.id,
        name: employee.name,
      },
      company: {
        id: company.id,
        name: company.name,
      },
      exporter: {
        id: user.id,
        email: user.email ?? 'unknown',
      },
      data_scope: {
        includes_employee_data: true,
        includes_trips: true,
        includes_alerts: true,
        includes_notification_logs: true,
        includes_import_sessions: true,
        includes_stored_compliance_snapshots: true,
        includes_generated_current_compliance_calculation: true,
        trip_count: tripList.length,
        alert_count: alertList.length,
        notification_log_count: notificationLogList.length,
        import_session_count: importSessionData.length,
        stored_compliance_snapshot_count: storedComplianceSnapshotList.length,
        date_range: {
          earliest_trip: earliestTrip,
          latest_trip: latestTrip,
        },
      },
      retention_policy: {
        months: retentionMonths,
        scheduled_deletion: null, // Would be set if employee is marked for deletion
      },
      gdpr_article: 'Article 15 - Right of Access',
    }

    // Create ZIP file
    const zip = new JSZip()

    // Add README
    zip.file(
      'README.txt',
      generateReadme(
        employeeData,
        company,
        { email: user.email ?? 'unknown' },
        tripList.length,
        alertList.length,
        notificationLogList.length,
        storedComplianceSnapshotList.length,
        importSessionData.length,
        retentionMonths
      )
    )

    // Add employee data
    zip.file('employee_data.json', JSON.stringify(employeeData, null, 2))
    zip.file(
      'employee_data.csv',
      arrayToCsv([employeeData], [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'nationality_type', header: 'Nationality Type' },
        { key: 'created_at', header: 'Created At' },
        { key: 'updated_at', header: 'Updated At' },
        { key: 'anonymized_at', header: 'Anonymized At' },
        { key: 'anonymized_by', header: 'Anonymized By' },
        { key: 'deleted_at', header: 'Deleted At' },
      ])
    )

    // Add trips
    zip.file('trips.json', JSON.stringify(tripData, null, 2))
    zip.file(
      'trips.csv',
      arrayToCsv(tripData, [
        { key: 'id', header: 'Trip ID' },
        { key: 'country_code', header: 'Country Code' },
        { key: 'country_name', header: 'Country' },
        { key: 'entry_date', header: 'Entry Date' },
        { key: 'exit_date', header: 'Exit Date' },
        { key: 'travel_days', header: 'Days' },
        { key: 'purpose', header: 'Purpose' },
        { key: 'job_ref', header: 'Job Reference' },
        { key: 'is_private', header: 'Private Trip' },
        { key: 'is_schengen', header: 'Schengen Country' },
        { key: 'created_at', header: 'Recorded At' },
        { key: 'updated_at', header: 'Updated At' },
      ])
    )

    // Add alerts
    zip.file('alerts.json', JSON.stringify(alertData, null, 2))
    zip.file(
      'alerts.csv',
      arrayToCsv(alertData, [
        { key: 'id', header: 'Alert ID' },
        { key: 'alert_type', header: 'Alert Type' },
        { key: 'risk_level', header: 'Risk Level' },
        { key: 'message', header: 'Message' },
        { key: 'days_used', header: 'Days Used' },
        { key: 'email_sent', header: 'Email Sent' },
        { key: 'acknowledged', header: 'Acknowledged' },
        { key: 'acknowledged_at', header: 'Acknowledged At' },
        { key: 'acknowledged_by', header: 'Acknowledged By' },
        { key: 'resolved', header: 'Resolved' },
        { key: 'resolved_at', header: 'Resolved At' },
        { key: 'created_at', header: 'Created At' },
      ])
    )

    // Add notification logs
    zip.file('notification_log.json', JSON.stringify(notificationLogData, null, 2))
    zip.file(
      'notification_log.csv',
      arrayToCsv(notificationLogData, [
        { key: 'id', header: 'Notification ID' },
        { key: 'alert_id', header: 'Alert ID' },
        { key: 'notification_type', header: 'Notification Type' },
        { key: 'recipient_email', header: 'Recipient Email' },
        { key: 'subject', header: 'Subject' },
        { key: 'status', header: 'Status' },
        { key: 'sent_at', header: 'Sent At' },
        { key: 'resend_message_id', header: 'Resend Message ID' },
        { key: 'error_message', header: 'Error Message' },
        { key: 'created_at', header: 'Created At' },
      ])
    )

    // Add retained import staging/history rows that match the employee
    zip.file('import_sessions.json', JSON.stringify(importSessionData, null, 2))

    // Add stored application snapshots
    zip.file(
      'stored_compliance_snapshots.json',
      JSON.stringify(storedComplianceSnapshotData, null, 2)
    )

    // Add current compliance calculation generated at export time
    zip.file('current_compliance_calculation.json', JSON.stringify(complianceSnapshot, null, 2))

    // Add metadata
    zip.file('metadata.json', JSON.stringify(metadata, null, 2))

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    })

    // Generate filename
    const safeName = employee.name.replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `DSAR_Export_${safeName}_${format(generatedAt, 'yyyy-MM-dd')}.zip`

    // Log the DSAR export to audit trail (non-blocking, don't fail export if logging fails)
    try {
      const auditDetails: DsarExportDetails = {
        employee_id: employee.id,
        employee_label: createEmployeeAuditLabel(employee.id),
        affected_trips_count: tripList.length,
        affected_alerts_count: alertList.length,
        affected_notification_logs_count: notificationLogList.length,
        affected_import_sessions_count: importSessionData.length,
        affected_stored_compliance_snapshots_count: storedComplianceSnapshotList.length,
        export_format: 'zip',
        files_included: [
          'README.txt',
          'employee_data.json',
          'employee_data.csv',
          'trips.json',
          'trips.csv',
          'alerts.json',
          'alerts.csv',
          'notification_log.json',
          'notification_log.csv',
          'import_sessions.json',
          'stored_compliance_snapshots.json',
          'current_compliance_calculation.json',
          'metadata.json',
        ],
        export_size_bytes: zipBuffer.length,
      }

      await logGdprAction({
        companyId: profile.company_id ?? '',
        userId: user.id,
        action: 'DSAR_EXPORT',
        entityType: 'employee',
        entityId: employee.id,
        details: auditDetails,
      })
    } catch (auditError) {
      // Log warning but don't fail the export - audit tables may not exist yet
      console.warn('[DSAR Export] Audit logging failed (GDPR migration may not be applied):', auditError)
    }

    return {
      success: true,
      zipBuffer: Buffer.from(zipBuffer),
      fileName,
      metadata,
    }
  } catch (error) {
    console.error('[DSAR Export] Error generating export:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate export',
      code: 'EXPORT_ERROR',
    }
  }
}
