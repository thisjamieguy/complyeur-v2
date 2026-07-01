/**
 * @fileoverview PDF generation for Travel Audit reports.
 *
 * Audit-grade PDFs for individual and company-wide travel, suitable for
 * third-party requests. Each page carries a document ID, generation
 * timestamp, the generating user, and real page numbers.
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
  EmployeeTravelAudit,
  CompanyTravelAudit,
  AuditWindow,
  CountryPresence,
  TravelAuditTotals,
} from './travel-audit'

const COLORS = {
  primary: '#1E40AF',
  border: '#E2E8F0',
  background: '#F8FAFC',
  text: '#1E293B',
  textMuted: '#64748B',
  white: '#FFFFFF',
  schengen: '#1E40AF',
}

/**
 * Metadata stamped on every audit PDF for traceability.
 */
export interface AuditPdfMeta {
  documentId: string
  /** ISO timestamp */
  generatedAt: string
  /** Email of the user who generated the report */
  generatedBy: string
  companyName: string
  window: AuditWindow
  version: string
}

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 60, fontFamily: 'Helvetica', fontSize: 10, color: COLORS.text },
  header: { marginBottom: 16, borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 10 },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.primary, marginBottom: 4 },
  reportTitle: { fontSize: 13, marginBottom: 6 },
  metaLine: { fontSize: 9, color: COLORS.textMuted, marginBottom: 1 },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 8, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  tile: {
    width: '33.33%', paddingVertical: 8, paddingHorizontal: 6, marginBottom: 6,
  },
  tileInner: { backgroundColor: COLORS.background, borderRadius: 4, padding: 8 },
  tileValue: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  tileLabel: { fontSize: 8, color: COLORS.textMuted, marginTop: 2 },
  table: { width: '100%' },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.primary, color: COLORS.white, paddingVertical: 6, paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 5, paddingHorizontal: 4 },
  tableRowAlt: { backgroundColor: COLORS.background },
  th: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.white },
  td: { fontSize: 9 },
  employeeBlock: { marginBottom: 14 },
  employeeName: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  employeeMeta: { fontSize: 8, color: COLORS.textMuted, marginBottom: 6 },
  footer: {
    position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row',
    justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: 8, fontSize: 8, color: COLORS.textMuted,
  },
  // Column widths for the country table
  colCountry: { width: '34%' },
  colNum: { width: '13%', textAlign: 'right' },
  colSchengen: { width: '14%', textAlign: 'center' },
})

function AuditHeader({ meta, title }: { meta: AuditPdfMeta; title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.companyName}>{meta.companyName}</Text>
      <Text style={styles.reportTitle}>{title}</Text>
      <Text style={styles.metaLine}>
        Period: {meta.window.start} to {meta.window.end}
      </Text>
      <Text style={styles.metaLine}>
        Generated: {format(new Date(meta.generatedAt), 'yyyy-MM-dd HH:mm')} UTC by {meta.generatedBy}
      </Text>
    </View>
  )
}

function AuditFooter({ documentId }: { documentId: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
      <Text>Document ID: {documentId}</Text>
    </View>
  )
}

function Tile({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileInner}>
        <Text style={styles.tileValue}>{value}</Text>
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
    </View>
  )
}

function SummaryTiles({ totals }: { totals: TravelAuditTotals }) {
  return (
    <View style={styles.tilesRow}>
      <Tile value={totals.countryCount} label="Countries visited" />
      <Tile value={totals.totalDays} label="Total days abroad" />
      <Tile value={totals.tripCount} label="Trips" />
      <Tile value={totals.workingDays} label="Working days" />
      <Tile value={totals.restDays} label="Rest days" />
      <Tile value={totals.schengenDays} label="Schengen days (90/180)" />
    </View>
  )
}

function CountryTable({ countries }: { countries: CountryPresence[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.colCountry]}>Country</Text>
        <Text style={[styles.th, styles.colSchengen]}>Schengen</Text>
        <Text style={[styles.th, styles.colNum]}>Total</Text>
        <Text style={[styles.th, styles.colNum]}>Working</Text>
        <Text style={[styles.th, styles.colNum]}>Rest</Text>
        <Text style={[styles.th, styles.colNum]}>Trips</Text>
      </View>
      {countries.map((c, i) => (
        <View key={`${c.country}-${c.isSchengen ? 'schengen' : 'non-schengen'}-${i}`} style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]} wrap={false}>
          <Text style={[styles.td, styles.colCountry]}>
            {c.countryName} ({c.country})
          </Text>
          <Text style={[styles.td, styles.colSchengen]}>{c.isSchengen ? 'Yes' : 'No'}</Text>
          <Text style={[styles.td, styles.colNum]}>{c.totalDays}</Text>
          <Text style={[styles.td, styles.colNum]}>{c.workingDays}</Text>
          <Text style={[styles.td, styles.colNum]}>{c.restDays}</Text>
          <Text style={[styles.td, styles.colNum]}>{c.tripCount}</Text>
        </View>
      ))}
      {countries.length === 0 && (
        <View style={styles.tableRow}>
          <Text style={styles.td}>No travel recorded in this period.</Text>
        </View>
      )}
    </View>
  )
}

function IndividualAuditDocument({
  audit,
  meta,
}: {
  audit: EmployeeTravelAudit
  meta: AuditPdfMeta
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <AuditHeader meta={meta} title={`Travel Audit — ${audit.employeeName}`} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <SummaryTiles totals={audit.totals} />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Country breakdown</Text>
          <CountryTable countries={audit.countries} />
        </View>
        <AuditFooter documentId={meta.documentId} />
      </Page>
    </Document>
  )
}

function CompanyAuditDocument({
  audit,
  meta,
}: {
  audit: CompanyTravelAudit
  meta: AuditPdfMeta
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <AuditHeader meta={meta} title="Travel Audit — Company" />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company summary</Text>
          <SummaryTiles totals={audit.totals} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Countries (company-wide)</Text>
          <CountryTable countries={audit.countries} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Per-employee breakdown</Text>
          {audit.employees.map((emp) => (
            <View key={emp.employeeId} style={styles.employeeBlock} wrap={false}>
              <Text style={styles.employeeName}>{emp.employeeName}</Text>
              <Text style={styles.employeeMeta}>
                {emp.totals.countryCount} countries · {emp.totals.totalDays} days
                ({emp.totals.workingDays} working / {emp.totals.restDays} rest) ·{' '}
                {emp.totals.schengenDays} Schengen days
              </Text>
              <CountryTable countries={emp.countries} />
            </View>
          ))}
        </View>

        <AuditFooter documentId={meta.documentId} />
      </Page>
    </Document>
  )
}

/** Generate the individual travel audit PDF. */
export async function generateIndividualAuditPdf(
  audit: EmployeeTravelAudit,
  meta: AuditPdfMeta
): Promise<Uint8Array> {
  const blob = await pdf(<IndividualAuditDocument audit={audit} meta={meta} />).toBlob()
  return new Uint8Array(await blob.arrayBuffer())
}

/** Generate the company travel audit PDF. */
export async function generateCompanyAuditPdf(
  audit: CompanyTravelAudit,
  meta: AuditPdfMeta
): Promise<Uint8Array> {
  const blob = await pdf(<CompanyAuditDocument audit={audit} meta={meta} />).toBlob()
  return new Uint8Array(await blob.arrayBuffer())
}

/** Filename for an individual audit PDF. */
export function getIndividualAuditPdfFilename(
  employeeName: string,
  date: Date = new Date()
): string {
  const safe = employeeName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  return `complyeur_travel_audit_${safe}_${format(date, 'yyyy-MM-dd')}.pdf`
}

/** Filename for a company audit PDF. */
export function getCompanyAuditPdfFilename(date: Date = new Date()): string {
  return `complyeur_travel_audit_company_${format(date, 'yyyy-MM-dd')}.pdf`
}
