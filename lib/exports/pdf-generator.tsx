/**
 * @fileoverview PDF generation for compliance reports.
 * Phase 12: Exports & Reporting - Items #105, #106, #107
 *
 * Uses @react-pdf/renderer to generate professional PDF reports.
 * Supports both individual employee reports and company-wide summaries.
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'
import { format } from 'date-fns'
import type {
  EmployeeExportRow,
  EmployeeWithTrips,
  ComplianceSummary,
  PdfMetadata,
  ComplianceStatus,
  FutureAlertExportRow,
  FutureAlertsSummary,
  FutureAlertStatus,
} from './types'
import { STATUS_COLORS, statusToKey, futureAlertStatusToKey } from './types'

/**
 * PDF color palette for consistent styling.
 */
const COLORS = {
  primary: '#1E40AF', // Blue-800
  secondary: '#64748B', // Slate-500
  border: '#E2E8F0', // Slate-200
  background: '#F8FAFC', // Slate-50
  text: '#1E293B', // Slate-800
  textMuted: '#64748B', // Slate-500
  white: '#FFFFFF',
  green: {
    bg: '#F0FDF4',
    text: '#16A34A',
  },
  amber: {
    bg: '#FFFBEB',
    text: '#D97706',
  },
  red: {
    bg: '#FEF2F2',
    text: '#DC2626',
  },
}

/**
 * Shared PDF styles.
 */
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.text,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  generatedAt: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  summaryBox: {
    flex: 1,
    padding: 10,
    marginRight: 10,
    backgroundColor: COLORS.background,
    borderRadius: 4,
  },
  summaryBoxLast: {
    marginRight: 0,
  },
  summaryLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    backgroundColor: COLORS.background,
  },
  tableCell: {
    fontSize: 9,
  },
  tableCellHeader: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    fontSize: 8,
    color: COLORS.textMuted,
  },
  employeeInfo: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 4,
  },
  employeeName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
  },
})

/**
 * Get status badge colors based on compliance status.
 */
function getStatusColors(status: ComplianceStatus): { bg: string; text: string } {
  const key = statusToKey(status)
  return STATUS_COLORS[key].pdf
}

/**
 * Status badge component.
 */
function StatusBadge({ status }: { status: ComplianceStatus }) {
  const colors = getStatusColors(status)
  return (
    <Text
      style={[
        styles.statusBadge,
        { backgroundColor: colors.bg, color: colors.text },
      ]}
    >
      {status}
    </Text>
  )
}

/**
 * Header component for all PDF reports.
 */
function ReportHeader({
  companyName,
  title,
  generatedAt,
  dateRange,
}: {
  companyName: string
  title: string
  generatedAt: string
  dateRange: { start: string; end: string }
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.companyName}>{companyName}</Text>
      <Text style={styles.reportTitle}>{title}</Text>
      <Text style={styles.generatedAt}>
        Generated: {format(new Date(generatedAt), 'yyyy-MM-dd HH:mm')} UTC
      </Text>
      <Text style={styles.generatedAt}>
        Period: {format(new Date(dateRange.start), 'yyyy-MM-dd')} to{' '}
        {format(new Date(dateRange.end), 'yyyy-MM-dd')}
      </Text>
    </View>
  )
}

/**
 * Footer component with page numbers and document ID.
 */
function ReportFooter({
  documentId,
  pageNumber,
  totalPages,
}: {
  documentId: string
  pageNumber: number
  totalPages: number
}) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        Page {pageNumber} of {totalPages}
      </Text>
      <Text>Document ID: {documentId}</Text>
    </View>
  )
}

/**
 * Summary statistics component.
 */
function SummaryStats({ summary }: { summary: ComplianceSummary }) {
  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Total Employees</Text>
        <Text style={[styles.summaryValue, { color: COLORS.text }]}>
          {summary.totalEmployees}
        </Text>
      </View>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Compliant</Text>
        <Text style={[styles.summaryValue, { color: COLORS.green.text }]}>
          {summary.compliantCount} ({summary.compliancePercentage}%)
        </Text>
      </View>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>At Risk</Text>
        <Text style={[styles.summaryValue, { color: COLORS.amber.text }]}>
          {summary.atRiskCount}
        </Text>
      </View>
      <View style={[styles.summaryBox, styles.summaryBoxLast]}>
        <Text style={styles.summaryLabel}>Non-Compliant</Text>
        <Text style={[styles.summaryValue, { color: COLORS.red.text }]}>
          {summary.nonCompliantCount}
        </Text>
      </View>
    </View>
  )
}

/**
 * Employee table for summary reports.
 */
function EmployeeTable({ employees }: { employees: EmployeeExportRow[] }) {
  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCellHeader, { width: '25%' }]}>Name</Text>
        <Text style={[styles.tableCellHeader, { width: '15%' }]}>Status</Text>
        <Text style={[styles.tableCellHeader, { width: '12%', textAlign: 'right' }]}>
          Used
        </Text>
        <Text style={[styles.tableCellHeader, { width: '12%', textAlign: 'right' }]}>
          Remaining
        </Text>
        <Text style={[styles.tableCellHeader, { width: '18%' }]}>Last Trip</Text>
        <Text style={[styles.tableCellHeader, { width: '18%' }]}>Safe Entry</Text>
      </View>

      {/* Data rows */}
      {employees.map((employee, index) => (
        <View
          key={employee.id}
          style={[
            styles.tableRow,
            ...(index % 2 === 1 ? [styles.tableRowAlt] : []),
          ]}
        >
          <Text style={[styles.tableCell, { width: '25%' }]}>
            {truncateName(employee.name, 25)}
          </Text>
          <View style={{ width: '15%' }}>
            <StatusBadge status={employee.status} />
          </View>
          <Text style={[styles.tableCell, { width: '12%', textAlign: 'right' }]}>
            {employee.daysUsed}
          </Text>
          <Text
            style={[
              styles.tableCell,
              { width: '12%', textAlign: 'right' },
              ...(employee.daysRemaining < 0 ? [{ color: COLORS.red.text }] : []),
            ]}
          >
            {employee.daysRemaining < 0
              ? `Over by ${Math.abs(employee.daysRemaining)}`
              : employee.daysRemaining}
          </Text>
          <Text style={[styles.tableCell, { width: '18%' }]}>
            {employee.lastTripEnd
              ? format(employee.lastTripEnd, 'yyyy-MM-dd')
              : 'N/A'}
          </Text>
          <Text style={[styles.tableCell, { width: '18%' }]}>
            {employee.nextSafeEntry
              ? format(employee.nextSafeEntry, 'yyyy-MM-dd')
              : 'N/A'}
          </Text>
        </View>
      ))}
    </View>
  )
}

/**
 * Trip history table for individual reports.
 */
function TripTable({
  trips,
}: {
  trips: EmployeeWithTrips['trips']
}) {
  if (trips.length === 0) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ color: COLORS.textMuted }}>
          No trips recorded in this period
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCellHeader, { width: '18%' }]}>Entry</Text>
        <Text style={[styles.tableCellHeader, { width: '18%' }]}>Exit</Text>
        <Text style={[styles.tableCellHeader, { width: '24%' }]}>Country</Text>
        <Text style={[styles.tableCellHeader, { width: '10%', textAlign: 'right' }]}>
          Days
        </Text>
        <Text style={[styles.tableCellHeader, { width: '30%' }]}>Purpose</Text>
      </View>

      {/* Data rows */}
      {trips.map((trip, index) => (
        <View
          key={trip.id}
          style={[
            styles.tableRow,
            ...(index % 2 === 1 ? [styles.tableRowAlt] : []),
          ]}
        >
          <Text style={[styles.tableCell, { width: '18%' }]}>
            {format(trip.entryDate, 'yyyy-MM-dd')}
          </Text>
          <Text style={[styles.tableCell, { width: '18%' }]}>
            {format(trip.exitDate, 'yyyy-MM-dd')}
          </Text>
          <Text style={[styles.tableCell, { width: '24%' }]}>
            {trip.isPrivate ? 'Private' : trip.country}
          </Text>
          <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' }]}>
            {trip.days}
          </Text>
          <Text style={[styles.tableCell, { width: '30%' }]}>
            {trip.isPrivate ? 'Private trip' : trip.purpose || '-'}
          </Text>
        </View>
      ))}
    </View>
  )
}

/**
 * Truncate long names for table display.
 */
function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name
  return name.slice(0, maxLength - 3) + '...'
}

/**
 * Individual Employee PDF Report Document.
 */
function IndividualReportDocument({
  employee,
  metadata,
}: {
  employee: EmployeeWithTrips
  metadata: PdfMetadata
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader
          companyName={metadata.companyName}
          title="Employee Compliance Report"
          generatedAt={metadata.generatedAt}
          dateRange={metadata.dateRange}
        />

        {/* Employee Info Section */}
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <StatusBadge status={employee.status} />
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Days Used</Text>
              <Text style={styles.infoValue}>
                {employee.daysUsed} of 90
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Days Remaining</Text>
              <Text
                style={[
                  styles.infoValue,
                  ...(employee.daysRemaining < 0 ? [{ color: COLORS.red.text }] : []),
                ]}
              >
                {employee.daysRemaining < 0
                  ? `Over by ${Math.abs(employee.daysRemaining)} days`
                  : employee.daysRemaining}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Next Safe Entry</Text>
              <Text style={styles.infoValue}>
                {employee.nextSafeEntry
                  ? format(employee.nextSafeEntry, 'yyyy-MM-dd')
                  : 'Currently compliant'}
              </Text>
            </View>
          </View>
        </View>

        {/* Trip History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Trip History (Last 180 Days)
          </Text>
          <TripTable trips={employee.trips} />
        </View>

        <ReportFooter
          documentId={metadata.documentId}
          pageNumber={1}
          totalPages={1}
        />
      </Page>
    </Document>
  )
}

/**
 * Summary Report PDF Document (all employees).
 */
function SummaryReportDocument({
  employees,
  summary,
  metadata,
}: {
  employees: EmployeeExportRow[]
  summary: ComplianceSummary
  metadata: PdfMetadata
}) {
  // Calculate how many employees fit per page (approximately 20 rows)
  const ROWS_PER_PAGE = 20
  const pageCount = Math.ceil(employees.length / ROWS_PER_PAGE)

  return (
    <Document>
      {Array.from({ length: pageCount }).map((_, pageIndex) => {
        const startIndex = pageIndex * ROWS_PER_PAGE
        const pageEmployees = employees.slice(
          startIndex,
          startIndex + ROWS_PER_PAGE
        )

        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {pageIndex === 0 && (
              <>
                <ReportHeader
                  companyName={metadata.companyName}
                  title="Compliance Summary Report"
                  generatedAt={metadata.generatedAt}
                  dateRange={metadata.dateRange}
                />

                {/* Summary Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Summary</Text>
                  <SummaryStats summary={summary} />
                </View>
              </>
            )}

            {/* Employee Status Section */}
            <View style={styles.section}>
              {pageIndex === 0 && (
                <Text style={styles.sectionTitle}>Employee Status</Text>
              )}
              <EmployeeTable employees={pageEmployees} />
            </View>

            <ReportFooter
              documentId={metadata.documentId}
              pageNumber={pageIndex + 1}
              totalPages={pageCount}
            />
          </Page>
        )
      })}
    </Document>
  )
}

/**
 * Generate PDF for a single employee report.
 *
 * @param employee - Employee data with trip history
 * @param metadata - Report metadata
 * @returns PDF as Uint8Array buffer
 */
export async function generateIndividualPdf(
  employee: EmployeeWithTrips,
  metadata: PdfMetadata
): Promise<Uint8Array> {
  const doc = <IndividualReportDocument employee={employee} metadata={metadata} />
  const pdfBlob = await pdf(doc).toBlob()
  const arrayBuffer = await pdfBlob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Generate PDF for company-wide compliance summary.
 *
 * @param employees - Array of employee compliance data
 * @param metadata - Report metadata
 * @returns PDF as Uint8Array buffer
 */
export async function generateSummaryPdf(
  employees: EmployeeExportRow[],
  metadata: PdfMetadata
): Promise<Uint8Array> {
  // Calculate summary statistics
  const summary: ComplianceSummary = {
    totalEmployees: employees.length,
    compliantCount: employees.filter((e) => e.status === 'Compliant').length,
    atRiskCount: employees.filter((e) => e.status === 'At Risk').length,
    nonCompliantCount: employees.filter((e) => e.status === 'Non-Compliant').length,
    compliancePercentage:
      employees.length > 0
        ? Math.round(
            (employees.filter((e) => e.status === 'Compliant').length /
              employees.length) *
              100
          )
        : 0,
  }

  const doc = (
    <SummaryReportDocument
      employees={employees}
      summary={summary}
      metadata={metadata}
    />
  )
  const pdfBlob = await pdf(doc).toBlob()
  const arrayBuffer = await pdfBlob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Generates the filename for a compliance PDF export.
 *
 * @param reportType - Type of report
 * @param date - Date for the filename (defaults to now)
 * @param employeeName - Employee name (for individual reports)
 * @returns Filename
 */
export function getCompliancePdfFilename(
  reportType: 'summary' | 'individual',
  date: Date = new Date(),
  employeeName?: string
): string {
  const dateStr = format(date, 'yyyy-MM-dd')
  if (reportType === 'individual' && employeeName) {
    const safeName = employeeName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    return `complyeur_employee_report_${safeName}_${dateStr}.pdf`
  }
  return `complyeur_compliance_report_${dateStr}.pdf`
}

/**
 * Get status badge colors based on future alert status.
 */
function getFutureAlertStatusColors(status: FutureAlertStatus): { bg: string; text: string } {
  const key = futureAlertStatusToKey(status)
  return STATUS_COLORS[key].pdf
}

/**
 * Status badge for future alerts.
 */
function FutureAlertStatusBadge({ status }: { status: FutureAlertStatus }) {
  const colors = getFutureAlertStatusColors(status)
  return (
    <Text
      style={[
        styles.statusBadge,
        { backgroundColor: colors.bg, color: colors.text },
      ]}
    >
      {status}
    </Text>
  )
}

/**
 * Summary statistics component for future alerts.
 */
function FutureAlertsSummaryStats({ summary }: { summary: FutureAlertsSummary }) {
  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Total Future Trips</Text>
        <Text style={[styles.summaryValue, { color: COLORS.text }]}>
          {summary.totalTrips}
        </Text>
      </View>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Safe</Text>
        <Text style={[styles.summaryValue, { color: COLORS.green.text }]}>
          {summary.safeCount}
        </Text>
      </View>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>At Risk</Text>
        <Text style={[styles.summaryValue, { color: COLORS.amber.text }]}>
          {summary.atRiskCount}
        </Text>
      </View>
      <View style={[styles.summaryBox, styles.summaryBoxLast]}>
        <Text style={styles.summaryLabel}>Critical</Text>
        <Text style={[styles.summaryValue, { color: COLORS.red.text }]}>
          {summary.criticalCount}
        </Text>
      </View>
    </View>
  )
}

/**
 * Future alerts table for PDF reports.
 */
function FutureAlertsTable({ alerts }: { alerts: FutureAlertExportRow[] }) {
  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCellHeader, { width: '18%' }]}>Employee</Text>
        <Text style={[styles.tableCellHeader, { width: '14%' }]}>Country</Text>
        <Text style={[styles.tableCellHeader, { width: '14%' }]}>Entry</Text>
        <Text style={[styles.tableCellHeader, { width: '14%' }]}>Exit</Text>
        <Text style={[styles.tableCellHeader, { width: '10%', textAlign: 'right' }]}>
          Days
        </Text>
        <Text style={[styles.tableCellHeader, { width: '12%', textAlign: 'right' }]}>
          After
        </Text>
        <Text style={[styles.tableCellHeader, { width: '18%' }]}>Status</Text>
      </View>

      {/* Data rows */}
      {alerts.map((alert, index) => (
        <View
          key={alert.tripId}
          style={[
            styles.tableRow,
            ...(index % 2 === 1 ? [styles.tableRowAlt] : []),
          ]}
        >
          <Text style={[styles.tableCell, { width: '18%' }]}>
            {truncateName(alert.employeeName, 18)}
          </Text>
          <Text style={[styles.tableCell, { width: '14%' }]}>
            {truncateName(alert.country, 12)}
          </Text>
          <Text style={[styles.tableCell, { width: '14%' }]}>
            {format(alert.entryDate, 'yyyy-MM-dd')}
          </Text>
          <Text style={[styles.tableCell, { width: '14%' }]}>
            {format(alert.exitDate, 'yyyy-MM-dd')}
          </Text>
          <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' }]}>
            {alert.tripDuration}
          </Text>
          <Text
            style={[
              styles.tableCell,
              { width: '12%', textAlign: 'right' },
              ...(alert.daysAfterTrip > 90 ? [{ color: COLORS.red.text }] : []),
            ]}
          >
            {alert.daysAfterTrip}
          </Text>
          <View style={{ width: '18%' }}>
            <FutureAlertStatusBadge status={alert.status} />
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * Future Alerts PDF Report Document.
 */
function FutureAlertsReportDocument({
  alerts,
  summary,
  metadata,
}: {
  alerts: FutureAlertExportRow[]
  summary: FutureAlertsSummary
  metadata: PdfMetadata
}) {
  // Calculate how many alerts fit per page (approximately 20 rows)
  const ROWS_PER_PAGE = 20
  const pageCount = Math.ceil(alerts.length / ROWS_PER_PAGE)

  return (
    <Document>
      {Array.from({ length: pageCount }).map((_, pageIndex) => {
        const startIndex = pageIndex * ROWS_PER_PAGE
        const pageAlerts = alerts.slice(
          startIndex,
          startIndex + ROWS_PER_PAGE
        )

        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {pageIndex === 0 && (
              <>
                <ReportHeader
                  companyName={metadata.companyName}
                  title="Future Job Alerts Report"
                  generatedAt={metadata.generatedAt}
                  dateRange={metadata.dateRange}
                />

                {/* Summary Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Summary</Text>
                  <FutureAlertsSummaryStats summary={summary} />
                </View>
              </>
            )}

            {/* Alerts Table Section */}
            <View style={styles.section}>
              {pageIndex === 0 && (
                <Text style={styles.sectionTitle}>Future Trips</Text>
              )}
              <FutureAlertsTable alerts={pageAlerts} />
            </View>

            <ReportFooter
              documentId={metadata.documentId}
              pageNumber={pageIndex + 1}
              totalPages={pageCount}
            />
          </Page>
        )
      })}
    </Document>
  )
}

/**
 * Generate PDF for future job alerts report.
 *
 * @param alerts - Array of future alert export data
 * @param metadata - Report metadata
 * @returns PDF as Uint8Array buffer
 */
export async function generateFutureAlertsPdf(
  alerts: FutureAlertExportRow[],
  metadata: PdfMetadata
): Promise<Uint8Array> {
  // Calculate summary statistics
  const summary: FutureAlertsSummary = {
    totalTrips: alerts.length,
    safeCount: alerts.filter((a) => a.status === 'Safe').length,
    atRiskCount: alerts.filter((a) => a.status === 'At Risk').length,
    criticalCount: alerts.filter((a) => a.status === 'Critical').length,
  }

  const doc = (
    <FutureAlertsReportDocument
      alerts={alerts}
      summary={summary}
      metadata={metadata}
    />
  )
  const pdfBlob = await pdf(doc).toBlob()
  const arrayBuffer = await pdfBlob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Generates the filename for a future alerts PDF export.
 *
 * @param date - Date for the filename (defaults to now)
 * @returns Filename
 */
export function getFutureAlertsPdfFilename(date: Date = new Date()): string {
  return `complyeur_future_alerts_${format(date, 'yyyy-MM-dd')}.pdf`
}
