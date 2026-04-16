import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/20260303113000_harden_multi_tenant_boundaries.sql'
)
const completionMigrationPath = path.join(
  process.cwd(),
  'supabase/migrations/20260414220000_complete_tenant_isolation_hardening.sql'
)

describe('Tenant Isolation Migration', () => {
  it('adds composite employee/company foreign keys for child tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('ADD CONSTRAINT trips_employee_company_fkey')
    expect(sql).toContain('ADD CONSTRAINT alerts_employee_company_fkey')
    expect(sql).toContain('ADD CONSTRAINT employee_compliance_snapshots_employee_company_fkey')
    expect(sql).toContain('REFERENCES public.employees (id, company_id)')
  })

  it('adds a suspension-aware RLS helper and applies it to core tenant tables', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.is_current_company_active()')
    expect(sql).toContain('public.is_current_company_active()')
    expect(sql).toContain('ON public.employees')
    expect(sql).toContain('ON public.trips')
    expect(sql).toContain('ON public.import_sessions')
  })

  it('removes authenticated waitlist reads and tightens nullable ownership columns', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('DROP POLICY IF EXISTS "Allow authenticated read waitlist" ON public.waitlist;')
    expect(sql).toContain('ALTER TABLE public.company_entitlements')
    expect(sql).toContain('ALTER COLUMN company_id SET NOT NULL')
    expect(sql).toContain('ALTER TABLE public.company_notes')
    expect(sql).toContain('ALTER COLUMN admin_user_id SET NOT NULL')
  })

  it('makes audit_log append-only with restrictive policies, trigger hardening, and revoked write privileges', () => {
    const sql = fs.readFileSync(completionMigrationPath, 'utf8')

    expect(sql).toContain('DROP POLICY IF EXISTS "Users can update audit_log in their company"')
    expect(sql).toContain('DROP POLICY IF EXISTS "Users can delete audit_log in their company"')
    expect(sql).toContain('CREATE POLICY "audit_log_append_only_no_update"')
    expect(sql).toContain('AS RESTRICTIVE')
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('CREATE POLICY "audit_log_append_only_no_delete"')
    expect(sql).toContain('FOR DELETE')
    expect(sql).toContain('CREATE TRIGGER prevent_audit_log_modifications')
    expect(sql).toContain('REVOKE ALL ON TABLE public.audit_log FROM anon, authenticated;')
    expect(sql).toContain('GRANT SELECT, INSERT ON TABLE public.audit_log TO authenticated;')
  })

  it('quarantines mismatched employee-linked rows before validating composite foreign keys', () => {
    const sql = fs.readFileSync(completionMigrationPath, 'utf8')

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.tenant_integrity_quarantine')
    expect(sql).toContain("'trips'")
    expect(sql).toContain("'alerts'")
    expect(sql).toContain("'employee_compliance_snapshots'")
    expect(sql).toContain('employee_company_mismatch')
    expect(sql).toContain('VALIDATE CONSTRAINT trips_employee_company_fkey')
    expect(sql).toContain('VALIDATE CONSTRAINT alerts_employee_company_fkey')
    expect(sql).toContain('VALIDATE CONSTRAINT employee_compliance_snapshots_employee_company_fkey')
  })

  it('uses restrictive tenant-active RLS guards across tenant-sensitive tables', () => {
    const sql = fs.readFileSync(completionMigrationPath, 'utf8')

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.is_current_company_active()')
    expect(sql).toContain('Fail-closed tenant data boundary helper')
    expect(sql).toContain('CREATE POLICY tenant_active_guard')
    expect(sql).toContain('AS RESTRICTIVE')
    expect(sql).toContain('FOR ALL')
    expect(sql).toContain("'public.company_settings'::regclass")
    expect(sql).toContain("'public.company_user_invites'::regclass")
    expect(sql).toContain("'public.notification_preferences'::regclass")
    expect(sql).toContain("'public.profiles'::regclass")
  })

  it('keeps waitlist inserts available while removing authenticated read privileges', () => {
    const sql = fs.readFileSync(completionMigrationPath, 'utf8')

    expect(sql).toContain('DROP POLICY IF EXISTS "Allow authenticated read waitlist" ON public.waitlist;')
    expect(sql).toContain('CREATE POLICY "waitlist_no_authenticated_read"')
    expect(sql).toContain('FOR SELECT')
    expect(sql).toContain('USING (false)')
    expect(sql).toContain('REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
    expect(sql).toContain('GRANT INSERT ON TABLE public.waitlist TO anon, authenticated;')
  })
})
