/**
 * @fileoverview CSV generation for Travel Audit reports.
 *
 * Produces spreadsheet-friendly CSVs (UTF-8 BOM, injection-safe) for the
 * individual-employee and company-wide travel audits.
 */

import { format } from 'date-fns'
import { sanitizeCsvValue } from './sanitize'
import type {
  EmployeeTravelAudit,
  CompanyTravelAudit,
  AuditWindow,
  CountryPresence,
} from './travel-audit'

const UTF8_BOM = '﻿'

/** Join already-sanitised/scalar values into a CSV line. */
function row(values: (string | number)[]): string {
  return values
    .map((v) => (typeof v === 'number' ? v.toString() : sanitizeCsvValue(v)))
    .join(',')
}

function countryTableRows(countries: CountryPresence[]): string[] {
  return countries.map((c) =>
    row([
      c.countryName,
      c.country,
      c.isSchengen ? 'Yes' : 'No',
      c.totalDays,
      c.workingDays,
      c.restDays,
      c.tripCount,
    ])
  )
}

const COUNTRY_HEADERS = [
  'Country',
  'ISO Code',
  'Schengen',
  'Total Days',
  'Working Days',
  'Rest Days',
  'Trips',
]

/**
 * Individual employee travel audit CSV.
 */
export function generateIndividualAuditCsv(
  audit: EmployeeTravelAudit,
  window: AuditWindow
): string {
  const lines: string[] = []

  lines.push(row(['ComplyEur Travel Audit — Individual']))
  lines.push(row(['Employee', audit.employeeName]))
  lines.push(row(['Period', `${window.start} to ${window.end}`]))
  lines.push('')
  lines.push(row(['Summary']))
  lines.push(row(['Countries visited', audit.totals.countryCount]))
  lines.push(row(['Total days abroad', audit.totals.totalDays]))
  lines.push(row(['Working days', audit.totals.workingDays]))
  lines.push(row(['Rest days', audit.totals.restDays]))
  lines.push(row(['Schengen days (90/180)', audit.totals.schengenDays]))
  lines.push(row(['Total trips', audit.totals.tripCount]))
  lines.push('')
  lines.push(row(['Country breakdown']))
  lines.push(row(COUNTRY_HEADERS))
  lines.push(...countryTableRows(audit.countries))

  return UTF8_BOM + lines.join('\n')
}

/**
 * Company-wide travel audit CSV, including a per-employee breakdown.
 */
export function generateCompanyAuditCsv(
  audit: CompanyTravelAudit,
  window: AuditWindow
): string {
  const lines: string[] = []

  lines.push(row(['ComplyEur Travel Audit — Company']))
  lines.push(row(['Period', `${window.start} to ${window.end}`]))
  lines.push('')
  lines.push(row(['Company summary']))
  lines.push(row(['Employees with travel', audit.employees.filter((e) => e.totals.totalDays > 0).length]))
  lines.push(row(['Countries visited', audit.totals.countryCount]))
  lines.push(row(['Total days abroad', audit.totals.totalDays]))
  lines.push(row(['Working days', audit.totals.workingDays]))
  lines.push(row(['Rest days', audit.totals.restDays]))
  lines.push(row(['Schengen days (90/180)', audit.totals.schengenDays]))
  lines.push(row(['Total trips', audit.totals.tripCount]))
  lines.push('')

  lines.push(row(['Countries (company-wide)']))
  lines.push(row(COUNTRY_HEADERS))
  lines.push(...countryTableRows(audit.countries))
  lines.push('')

  lines.push(row(['Per-employee breakdown']))
  lines.push(
    row([
      'Employee',
      'Country',
      'ISO Code',
      'Schengen',
      'Total Days',
      'Working Days',
      'Rest Days',
      'Trips',
    ])
  )
  for (const emp of audit.employees) {
    if (emp.countries.length === 0) {
      lines.push(row([emp.employeeName, 'No travel in period', '', '', 0, 0, 0, 0]))
      continue
    }
    for (const c of emp.countries) {
      lines.push(
        row([
          emp.employeeName,
          c.countryName,
          c.country,
          c.isSchengen ? 'Yes' : 'No',
          c.totalDays,
          c.workingDays,
          c.restDays,
          c.tripCount,
        ])
      )
    }
  }

  return UTF8_BOM + lines.join('\n')
}

/** Filename for an individual audit CSV. */
export function getIndividualAuditCsvFilename(
  employeeName: string,
  date: Date = new Date()
): string {
  const safe = employeeName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  return `complyeur_travel_audit_${safe}_${format(date, 'yyyy-MM-dd')}.csv`
}

/** Filename for a company audit CSV. */
export function getCompanyAuditCsvFilename(date: Date = new Date()): string {
  return `complyeur_travel_audit_company_${format(date, 'yyyy-MM-dd')}.csv`
}
