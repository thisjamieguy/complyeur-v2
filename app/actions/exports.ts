'use server'

/**
 * @fileoverview Server actions for exports and reporting.
 * Phase 12: Exports & Reporting
 *
 * These server actions handle secure export generation with:
 * - Multi-tenant data isolation
 * - CSV injection prevention
 * - Audit logging
 */

import { format, parseISO, subDays } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import {
  calculateCompliance,
  isSchengenCountry,
  presenceDays,
  earliestSafeEntry,
  type Trip as ComplianceTrip,
} from '@/lib/compliance'
import {
  generateComplianceCsv,
  getComplianceCsvFilename,
  generateIndividualPdf,
  generateSummaryPdf,
  getCompliancePdfFilename,
  generateFutureAlertsCsv,
  getFutureAlertsCsvFilename,
  generateFutureAlertsPdf,
  getFutureAlertsPdfFilename,
  riskLevelToStatus,
  forecastRiskToStatus,
  type ExportOptions,
  type ExportResult,
  type EmployeeExportRow,
  type EmployeeWithTrips,
  type TripExportRow,
  type PdfMetadata,
  type FutureAlertExportRow,
} from '@/lib/exports'
import { getCountryName } from '@/lib/constants/schengen-countries'
import { calculateFutureJobCompliance } from '@/lib/services/forecast-service'
import type { ForecastTrip } from '@/types/forecast'

/**
 * Generates an export of compliance data.
 *
 * @param options - Export configuration
 * @returns Export result with file content
 */
export async function exportComplianceData(
  options: ExportOptions
): Promise<ExportResult> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get user's company
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { success: false, error: 'No company associated with user' }
  }

  // Handle future alerts export separately
  if (options.scope === 'future-alerts') {
    return exportFutureAlerts(
      supabase,
      user,
      profile.company_id,
      options
    )
  }

  try {
    // Fetch employees with trips
    let query = supabase
      .from('employees')
      .select(
        `
        id,
        name,
        trips (
          id,
          country,
          entry_date,
          exit_date,
          purpose,
          is_private,
          ghosted
        )
      `
      )
      .eq('company_id', profile.company_id)
      .order('name')

    if (options.scope === 'single' && options.employeeId) {
      query = query.eq('id', options.employeeId)
    }

    const { data: employees, error: fetchError } = await query

    if (fetchError) {
      console.error('[Export] Database error:', fetchError)
      return { success: false, error: 'Failed to fetch employee data' }
    }

    if (!employees || employees.length === 0) {
      return { success: false, error: 'No employees found' }
    }

    // Calculate compliance for each employee
    const referenceDate = parseISO(options.dateRange.end)
    const windowStart = parseISO(options.dateRange.start)
    const today = new Date()

    const exportData: EmployeeExportRow[] = employees.map((employee) => {
      // Filter trips: not ghosted and Schengen countries
      const activeTrips = (employee.trips || []).filter(
        (t) => !t.ghosted && isSchengenCountry(t.country)
      )

      // Convert to compliance format
      const complianceTrips: ComplianceTrip[] = activeTrips.map((t) => ({
        id: t.id,
        country: t.country,
        entryDate: parseISO(t.entry_date),
        exitDate: parseISO(t.exit_date),
      }))

      // Calculate compliance
      const compliance = calculateCompliance(complianceTrips, {
        mode: 'audit',
        referenceDate: referenceDate,
      })

      // Calculate next safe entry
      const presence = presenceDays(complianceTrips, {
        mode: 'audit',
        referenceDate: today,
      })
      const nextSafe = earliestSafeEntry(presence, today)

      // Get last trip info
      const sortedTrips = [...activeTrips].sort(
        (a, b) =>
          new Date(b.exit_date).getTime() - new Date(a.exit_date).getTime()
      )
      const lastTrip = sortedTrips[0]

      // Count trips in window
      const tripsInWindow = activeTrips.filter(
        (t) =>
          new Date(t.exit_date) >= windowStart &&
          new Date(t.entry_date) <= referenceDate
      )

      return {
        id: employee.id,
        name: employee.name,
        status: riskLevelToStatus(compliance.riskLevel),
        daysUsed: compliance.daysUsed,
        daysRemaining: compliance.daysRemaining,
        lastTripEnd: lastTrip ? parseISO(lastTrip.exit_date) : null,
        lastTripCountry: lastTrip ? getCountryName(lastTrip.country) : null,
        nextSafeEntry: nextSafe,
        totalTrips: tripsInWindow.length,
        riskLevel: compliance.riskLevel,
      }
    })

    // Apply status filter if specified
    let filteredData = exportData
    if (options.scope === 'filtered' && options.statusFilter) {
      const statusMap = {
        compliant: 'Compliant',
        'at-risk': 'At Risk',
        'non-compliant': 'Non-Compliant',
      } as const
      filteredData = exportData.filter(
        (e) => e.status === statusMap[options.statusFilter!]
      )
    }

    if (filteredData.length === 0) {
      return {
        success: false,
        error: 'No employees match the selected filters',
      }
    }

    // Generate document ID
    const documentId = `RPT-${new Date().getFullYear()}-${crypto
      .randomUUID()
      .slice(0, 6)
      .toUpperCase()}`

    // Get company name for PDF
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', profile.company_id)
      .single()

    // Generate export
    let fileContent: string
    let fileName: string
    let mimeType: string

    if (options.format === 'csv') {
      fileContent = generateComplianceCsv(filteredData)
      fileName = getComplianceCsvFilename()
      mimeType = 'text/csv;charset=utf-8'
    } else {
      // PDF generation
      const metadata: PdfMetadata = {
        documentId,
        generatedAt: new Date().toISOString(),
        generatedBy: user.email || 'Unknown',
        companyId: profile.company_id,
        companyName: company?.name || 'Company',
        reportType: options.scope === 'single' ? 'individual' : 'summary',
        dateRange: options.dateRange,
        recordCount: filteredData.length,
        version: '2.0.0',
      }

      let pdfBuffer: Uint8Array

      if (options.scope === 'single' && employees.length === 1) {
        // Individual employee report with trip details
        const emp = employees[0]
        const empData = filteredData[0]
        const trips = (emp.trips || [])
          .filter((t) => !t.ghosted)
          .filter(
            (t) =>
              new Date(t.exit_date) >= windowStart &&
              new Date(t.entry_date) <= referenceDate
          )
          .sort(
            (a, b) =>
              new Date(b.exit_date).getTime() - new Date(a.exit_date).getTime()
          )

        const tripRows: TripExportRow[] = trips.map((t) => ({
          id: t.id,
          entryDate: parseISO(t.entry_date),
          exitDate: parseISO(t.exit_date),
          country: t.is_private ? 'Private' : getCountryName(t.country),
          days:
            Math.floor(
              (new Date(t.exit_date).getTime() -
                new Date(t.entry_date).getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1,
          purpose: t.purpose,
          isPrivate: t.is_private ?? false,
        }))

        const employeeWithTrips: EmployeeWithTrips = {
          ...empData,
          trips: tripRows,
        }

        pdfBuffer = await generateIndividualPdf(employeeWithTrips, metadata)
        fileName = getCompliancePdfFilename('individual', new Date(), emp.name)
      } else {
        // Summary report
        pdfBuffer = await generateSummaryPdf(filteredData, metadata)
        fileName = getCompliancePdfFilename('summary')
      }

      // Convert to base64 for transport
      fileContent = Buffer.from(pdfBuffer).toString('base64')
      mimeType = 'application/pdf'
    }

    // Log the export
    await logExport(supabase, user.id, profile.company_id, options.format, {
      reportType:
        options.scope === 'single'
          ? 'individual_employee'
          : 'compliance_summary',
      employeeId: options.employeeId,
      recordCount: filteredData.length,
      dateRange: options.dateRange,
      documentId,
    })

    return {
      success: true,
      fileName,
      mimeType,
      content: fileContent,
      documentId,
    }
  } catch (error) {
    console.error('[Export] Error generating export:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to generate export',
    }
  }
}

/**
 * Log export to audit_log table.
 */
async function logExport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  companyId: string,
  exportType: 'csv' | 'pdf',
  metadata: {
    reportType: 'compliance_summary' | 'individual_employee' | 'future_alerts'
    employeeId?: string
    recordCount: number
    dateRange: { start: string; end: string }
    documentId: string
  }
): Promise<void> {
  try {
    // Try to insert into audit_log if it exists
    await supabase.from('audit_log').insert({
      company_id: companyId,
      user_id: userId,
      action: 'export_generated',
      entity_type: 'export',
      entity_id: null, // No specific entity
      details: {
        export_type: exportType,
        ...metadata,
        generated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    // Audit log is optional - don't fail the export if logging fails
    console.warn('[Export] Failed to log export:', error)
  }
}

/**
 * Get list of employees for export form dropdown.
 */
export async function getEmployeesForExport(): Promise<
  { id: string; name: string }[]
> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return []
  }

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .eq('company_id', profile.company_id)
    .order('name')

  return employees || []
}

/**
 * Export future job alerts data.
 */
async function exportFutureAlerts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null },
  companyId: string,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    // Fetch all employees with trips
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select(
        `
        id,
        name,
        trips (
          id,
          country,
          entry_date,
          exit_date,
          purpose,
          job_ref,
          is_private,
          ghosted,
          travel_days
        )
      `
      )
      .eq('company_id', companyId)
      .order('name')

    if (fetchError) {
      console.error('[Export] Database error:', fetchError)
      return { success: false, error: 'Failed to fetch employee data' }
    }

    if (!employees || employees.length === 0) {
      return { success: false, error: 'No employees found' }
    }

    // Calculate forecasts for all future trips
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const allAlerts: FutureAlertExportRow[] = []

    for (const employee of employees) {
      // Convert trips to ForecastTrip format
      const forecastTrips: ForecastTrip[] = (employee.trips || []).map((trip) => ({
        id: trip.id,
        employeeId: employee.id,
        companyId: companyId,
        country: trip.country,
        entryDate: trip.entry_date,
        exitDate: trip.exit_date,
        purpose: trip.purpose,
        jobRef: trip.job_ref,
        isPrivate: trip.is_private ?? false,
        ghosted: trip.ghosted ?? false,
        travelDays: trip.travel_days ?? 0,
      }))

      // Filter to future trips only
      const futureTrips = forecastTrips.filter((trip) => {
        if (trip.ghosted) return false
        const entryDate = new Date(trip.entryDate)
        return entryDate >= today
      })

      // Calculate forecast for each future trip
      for (const futureTrip of futureTrips) {
        const forecast = calculateFutureJobCompliance(
          futureTrip,
          forecastTrips,
          employee.name
        )

        allAlerts.push({
          tripId: forecast.tripId,
          employeeName: forecast.employeeName,
          country: forecast.countryName,
          entryDate: forecast.entryDate,
          exitDate: forecast.exitDate,
          tripDuration: forecast.tripDuration,
          daysUsedBefore: forecast.daysUsedBeforeTrip,
          daysAfterTrip: forecast.daysAfterTrip,
          daysRemaining: forecast.daysRemainingAfterTrip,
          status: forecastRiskToStatus(forecast.riskLevel),
          riskLevel: forecast.riskLevel,
          isCompliant: forecast.isCompliant,
          compliantFromDate: forecast.compliantFromDate,
        })
      }
    }

    // Apply filter if specified
    let filteredAlerts = allAlerts
    if (options.alertsFilter && options.alertsFilter !== 'all') {
      if (options.alertsFilter === 'at-risk') {
        filteredAlerts = allAlerts.filter((a) => a.riskLevel !== 'green')
      } else if (options.alertsFilter === 'critical') {
        filteredAlerts = allAlerts.filter((a) => a.riskLevel === 'red')
      }
    }

    // Sort by entry date
    filteredAlerts.sort(
      (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
    )

    if (filteredAlerts.length === 0) {
      return {
        success: false,
        error: 'No future trips found matching the filter',
      }
    }

    // Generate document ID
    const documentId = `RPT-${new Date().getFullYear()}-${crypto
      .randomUUID()
      .slice(0, 6)
      .toUpperCase()}`

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    // Generate export
    let fileContent: string
    let fileName: string
    let mimeType: string

    if (options.format === 'csv') {
      fileContent = generateFutureAlertsCsv(filteredAlerts)
      fileName = getFutureAlertsCsvFilename()
      mimeType = 'text/csv;charset=utf-8'
    } else {
      // PDF generation
      const metadata: PdfMetadata = {
        documentId,
        generatedAt: new Date().toISOString(),
        generatedBy: user.email || 'Unknown',
        companyId: companyId,
        companyName: company?.name || 'Company',
        reportType: 'future_alerts',
        dateRange: options.dateRange,
        recordCount: filteredAlerts.length,
        version: '2.0.0',
      }

      const pdfBuffer = await generateFutureAlertsPdf(filteredAlerts, metadata)
      fileContent = Buffer.from(pdfBuffer).toString('base64')
      fileName = getFutureAlertsPdfFilename()
      mimeType = 'application/pdf'
    }

    // Log the export
    await logExport(supabase, user.id, companyId, options.format, {
      reportType: 'future_alerts',
      recordCount: filteredAlerts.length,
      dateRange: options.dateRange,
      documentId,
    })

    return {
      success: true,
      fileName,
      mimeType,
      content: fileContent,
      documentId,
    }
  } catch (error) {
    console.error('[Export] Error generating future alerts export:', error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate future alerts export',
    }
  }
}
