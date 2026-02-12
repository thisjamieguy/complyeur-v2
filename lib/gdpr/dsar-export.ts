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
 * - compliance_history.json: Compliance calculation snapshots
 * - metadata.json: Export metadata and scope
 */

import JSZip from 'jszip'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { requireAdminAccess } from '@/lib/security/authorization'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import { logGdprAction, type DsarExportDetails } from './audit'
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
  created_at: string
  updated_at: string
  anonymized_at: string | null
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
    includes_compliance_history: boolean
    trip_count: number
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

/**
 * Generates the README.txt content
 */
function generateReadme(
  employee: EmployeeExportData,
  company: { name: string },
  exporter: { email: string },
  tripCount: number,
  retentionMonths: number
): string {
  const exportDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss zzz')

  return `COMPLYEUR DATA EXPORT
=====================

Export Date: ${exportDate}
Requested By: ${exporter.email}
Data Subject: ${employee.name}
Company: ${company.name}

This archive contains all personal data held by ${company.name}
for the above data subject, as required under GDPR Article 15
(Right of Access).

FILES INCLUDED:
---------------
- employee_data.json: Basic employee information in JSON format
- employee_data.csv: Same data in spreadsheet-compatible format
- trips.json: All recorded travel trips (${tripCount} trips) in JSON format
- trips.csv: Same data in spreadsheet-compatible format
- compliance_history.json: Compliance calculation snapshots
- metadata.json: Technical details about this export

DATA DESCRIPTION:
-----------------
Employee Data:
  Contains your name and system timestamps for when your record
  was created and last updated.

Trip Data:
  Contains all travel records including destination country,
  entry/exit dates, purpose of travel, and job references.
  Private trips are marked accordingly.

Compliance History:
  Contains calculated compliance status based on Schengen
  90/180-day visa rules at the time of export.

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

    // Get all trips for this employee
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('employee_id', employeeId)
      .order('entry_date', { ascending: false })

    if (tripsError) {
      return {
        success: false,
        error: 'Failed to fetch trip data',
        code: 'DATABASE_ERROR',
      }
    }

    const tripList = trips ?? []

    // Prepare employee data for export
    const employeeData: EmployeeExportData = {
      id: employee.id,
      name: employee.name,
      created_at: employee.created_at,
      updated_at: employee.updated_at,
      anonymized_at: (employee as Record<string, unknown>).anonymized_at as string | null ?? null,
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

    // Calculate current compliance snapshot
    const now = toUTCMidnight(new Date())
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
      referenceDate: now,
    })

    // Calculate 180-day window for compliance using the core engine logic.
    const { windowStart, windowEnd } = getWindowBounds(now)

    const complianceSnapshot: ComplianceSnapshot = {
      calculated_at: now.toISOString(),
      reference_date: now.toISOString().slice(0, 10),
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
    const exportId = `DSAR-${format(now, 'yyyyMMdd')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

    // Prepare metadata
    const metadata: ExportMetadata = {
      export_id: exportId,
      export_date: now.toISOString(),
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
        includes_compliance_history: true,
        trip_count: tripList.length,
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
      generateReadme(employeeData, company, { email: user.email ?? 'unknown' }, tripList.length, retentionMonths)
    )

    // Add employee data
    zip.file('employee_data.json', JSON.stringify(employeeData, null, 2))
    zip.file(
      'employee_data.csv',
      arrayToCsv([employeeData], [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'created_at', header: 'Created At' },
        { key: 'updated_at', header: 'Updated At' },
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
      ])
    )

    // Add compliance history
    zip.file('compliance_history.json', JSON.stringify([complianceSnapshot], null, 2))

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
    const fileName = `DSAR_Export_${safeName}_${format(now, 'yyyy-MM-dd')}.zip`

    // Log the DSAR export to audit trail (non-blocking, don't fail export if logging fails)
    try {
      const auditDetails: DsarExportDetails = {
        employee_name: employee.name,
        employee_id: employee.id,
        affected_trips_count: tripList.length,
        requester_email: user.email ?? 'unknown',
        export_format: 'zip',
        files_included: [
          'README.txt',
          'employee_data.json',
          'employee_data.csv',
          'trips.json',
          'trips.csv',
          'compliance_history.json',
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
