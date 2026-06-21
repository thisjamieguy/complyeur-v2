import { describe, it, expect } from 'vitest'
import {
  generateIndividualAuditCsv,
  generateCompanyAuditCsv,
  getIndividualAuditCsvFilename,
  getCompanyAuditCsvFilename,
} from '@/lib/exports/travel-audit-csv'
import {
  buildEmployeeTravelAudit,
  buildCompanyTravelAudit,
  type AuditEmployeeInput,
} from '@/lib/exports/travel-audit'

const WINDOW = { start: '2025-01-01', end: '2025-12-31' }

const alice: AuditEmployeeInput = {
  id: 'e1',
  name: 'Alice',
  trips: [
    {
      country: 'FR',
      entryDate: '2025-03-01',
      exitDate: '2025-03-10',
      isPrivate: false,
      ghosted: false,
      nonWorkingDays: 2,
    },
  ],
}

describe('generateIndividualAuditCsv', () => {
  it('starts with a UTF-8 BOM', () => {
    const audit = buildEmployeeTravelAudit(alice, WINDOW)
    const csv = generateIndividualAuditCsv(audit, WINDOW)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('includes the employee, period, and summary figures', () => {
    const audit = buildEmployeeTravelAudit(alice, WINDOW)
    const csv = generateIndividualAuditCsv(audit, WINDOW)
    expect(csv).toContain('Alice')
    expect(csv).toContain('2025-01-01 to 2025-12-31')
    expect(csv).toContain('Working days,8')
    expect(csv).toContain('Rest days,2')
    expect(csv).toContain('France,FR,Yes,10,8,2,1')
  })

  it('sanitises a formula-injection employee name', () => {
    const evil: AuditEmployeeInput = { ...alice, name: '=cmd|calc' }
    const audit = buildEmployeeTravelAudit(evil, WINDOW)
    const csv = generateIndividualAuditCsv(audit, WINDOW)
    expect(csv).toContain("'=cmd|calc")
    expect(csv).not.toContain('\n=cmd')
  })
})

describe('generateCompanyAuditCsv', () => {
  const bob: AuditEmployeeInput = {
    id: 'e2',
    name: 'Bob',
    trips: [
      {
        country: 'DE',
        entryDate: '2025-04-01',
        exitDate: '2025-04-05',
        isPrivate: false,
        ghosted: false,
        nonWorkingDays: 0,
      },
    ],
  }

  it('includes company-wide and per-employee sections', () => {
    const audit = buildCompanyTravelAudit([alice, bob], WINDOW)
    const csv = generateCompanyAuditCsv(audit, WINDOW)
    expect(csv).toContain('Countries (company-wide)')
    expect(csv).toContain('Per-employee breakdown')
    expect(csv).toContain('Alice')
    expect(csv).toContain('Bob')
  })

  it('notes employees with no travel in the period', () => {
    const carol: AuditEmployeeInput = { id: 'e3', name: 'Carol', trips: [] }
    const audit = buildCompanyTravelAudit([alice, carol], WINDOW)
    const csv = generateCompanyAuditCsv(audit, WINDOW)
    expect(csv).toContain('No travel in period')
  })
})

describe('filenames', () => {
  it('builds a safe individual filename', () => {
    expect(getIndividualAuditCsvFilename('Alice Smith', new Date('2025-06-21'))).toBe(
      'complyeur_travel_audit_alice_smith_2025-06-21.csv'
    )
  })

  it('builds a company filename', () => {
    expect(getCompanyAuditCsvFilename(new Date('2025-06-21'))).toBe(
      'complyeur_travel_audit_company_2025-06-21.csv'
    )
  })
})
