import JSZip from 'jszip'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  requireAdminAccessMock,
  requireCompanyAccessMock,
  logGdprActionMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  requireAdminAccessMock: vi.fn(),
  requireCompanyAccessMock: vi.fn(),
  logGdprActionMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/security/authorization', () => ({
  requireAdminAccess: requireAdminAccessMock,
}))

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: requireCompanyAccessMock,
}))

vi.mock('@/lib/gdpr/audit', () => ({
  createEmployeeAuditLabel: vi.fn(() => 'EMP_EMPLOYEE'),
  logGdprAction: logGdprActionMock,
}))

vi.mock('@/lib/compliance', () => ({
  calculateCompliance: vi.fn(() => ({
    daysUsed: 18,
    daysRemaining: 72,
    riskLevel: 'compliant',
  })),
  getWindowBounds: vi.fn(() => ({
    windowStart: new Date('2025-11-20T00:00:00.000Z'),
    windowEnd: new Date('2026-05-18T00:00:00.000Z'),
  })),
  isSchengenCountry: vi.fn(() => true),
  parseDateOnlyAsUTC: vi.fn((value: string) => new Date(`${value}T00:00:00.000Z`)),
}))

vi.mock('@/lib/compliance/date-utils', () => ({
  toUTCMidnight: vi.fn(() => new Date('2026-05-18T00:00:00.000Z')),
}))

vi.mock('@/lib/constants/schengen-countries', () => ({
  getCountryName: vi.fn(() => 'France'),
}))

function createSingleQuery(data: Record<string, unknown>) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data,
          error: null,
        }),
      })),
    })),
  }
}

function createOrderedListQuery(data: Array<Record<string, unknown>>) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({
          data,
          error: null,
        }),
      })),
    })),
  }
}

describe('generateDsarExport content coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    requireAdminAccessMock.mockResolvedValue({
      allowed: true,
      user: {
        id: 'user-1',
        email: 'admin@complyeur.test',
      },
      profile: {
        company_id: 'company-1',
      },
    })

    requireCompanyAccessMock.mockResolvedValue(undefined)

    const employee = {
      id: 'employee-1',
      company_id: 'company-1',
      name: 'Alice Example',
      email: 'alice@example.com',
      nationality_type: 'uk_citizen',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
      anonymized_at: null,
      anonymized_by: null,
      deleted_at: null,
    }

    const company = {
      id: 'company-1',
      name: 'Acme Travel Ltd',
    }

    const settings = {
      retention_months: 36,
    }

    const trips = [
      {
        id: 'trip-1',
        country: 'FR',
        entry_date: '2026-04-01',
        exit_date: '2026-04-10',
        travel_days: 10,
        purpose: 'Client meeting',
        job_ref: 'JOB-1',
        is_private: false,
        ghosted: false,
        created_at: '2026-03-20T00:00:00.000Z',
        updated_at: '2026-03-21T00:00:00.000Z',
      },
    ]

    const alerts = [
      {
        id: 'alert-1',
        alert_type: 'warning',
        risk_level: 'warning',
        message: 'Approaching Schengen limit',
        days_used: 88,
        email_sent: true,
        acknowledged: false,
        acknowledged_at: null,
        acknowledged_by: null,
        resolved: false,
        resolved_at: null,
        created_at: '2026-05-10T00:00:00.000Z',
      },
    ]

    const notificationLog = [
      {
        id: 'notification-1',
        alert_id: 'alert-1',
        notification_type: 'email',
        recipient_email: 'alice@example.com',
        subject: 'Compliance warning',
        status: 'sent',
        sent_at: '2026-05-10T00:01:00.000Z',
        resend_message_id: 're_123',
        error_message: null,
        created_at: '2026-05-10T00:01:00.000Z',
      },
    ]

    const storedComplianceSnapshots = [
      {
        id: 'snapshot-1',
        snapshot_generated_at: '2026-05-01T00:00:00.000Z',
        days_used: 70,
        days_remaining: 20,
        risk_level: 'warning',
        is_compliant: true,
        next_reset_date: '2026-06-01',
        trips_hash: 'hash-1',
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-01T00:00:00.000Z',
      },
    ]

    createClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        switch (table) {
          case 'employees':
            return createSingleQuery(employee)
          case 'companies':
            return createSingleQuery(company)
          case 'company_settings':
            return createSingleQuery(settings)
          case 'trips':
            return createOrderedListQuery(trips)
          case 'alerts':
            return createOrderedListQuery(alerts)
          case 'notification_log':
            return createOrderedListQuery(notificationLog)
          case 'employee_compliance_snapshots':
            return createOrderedListQuery(storedComplianceSnapshots)
          default:
            throw new Error(`Unexpected table query: ${table}`)
        }
      }),
    })
  })

  it('includes employee-linked data categories and minimized DSAR audit metadata', async () => {
    const { generateDsarExport } = await import('@/lib/gdpr/dsar-export')
    const result = await generateDsarExport('employee-1')

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('Expected successful DSAR export')
    }

    const zip = await JSZip.loadAsync(result.zipBuffer)
    const employeeData = JSON.parse(await zip.file('employee_data.json')!.async('string'))
    const alertData = JSON.parse(await zip.file('alerts.json')!.async('string'))
    const notificationLogData = JSON.parse(await zip.file('notification_log.json')!.async('string'))
    const storedSnapshots = JSON.parse(
      await zip.file('stored_compliance_snapshots.json')!.async('string')
    )
    const currentCalculation = JSON.parse(
      await zip.file('current_compliance_calculation.json')!.async('string')
    )
    const metadata = JSON.parse(await zip.file('metadata.json')!.async('string'))
    const readme = await zip.file('README.txt')!.async('string')

    expect(employeeData).toMatchObject({
      id: 'employee-1',
      name: 'Alice Example',
      email: 'alice@example.com',
      nationality_type: 'uk_citizen',
    })
    expect(alertData).toEqual([
      expect.objectContaining({
        id: 'alert-1',
        message: 'Approaching Schengen limit',
      }),
    ])
    expect(notificationLogData).toEqual([
      expect.objectContaining({
        id: 'notification-1',
        recipient_email: 'alice@example.com',
      }),
    ])
    expect(storedSnapshots).toEqual([
      expect.objectContaining({
        id: 'snapshot-1',
        days_used: 70,
      }),
    ])
    expect(currentCalculation).toMatchObject({
      days_used: 18,
      days_remaining: 72,
    })
    expect(currentCalculation.calculated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(metadata.data_scope).toMatchObject({
      includes_alerts: true,
      includes_notification_logs: true,
      includes_stored_compliance_snapshots: true,
      includes_generated_current_compliance_calculation: true,
      alert_count: 1,
      notification_log_count: 1,
      stored_compliance_snapshot_count: 1,
    })
    expect(readme).toContain('currently exported by Acme Travel Ltd')
    expect(readme).toContain('generated at export time')

    expect(logGdprActionMock).toHaveBeenCalledTimes(1)
    const [auditEntry] = logGdprActionMock.mock.calls[0]
    expect(auditEntry.details).toMatchObject({
      employee_id: 'employee-1',
      employee_label: 'EMP_EMPLOYEE',
      affected_alerts_count: 1,
      affected_notification_logs_count: 1,
      affected_stored_compliance_snapshots_count: 1,
    })
    expect(auditEntry.details).not.toHaveProperty('employee_name')
    expect(auditEntry.details).not.toHaveProperty('requester_email')
  })
})
