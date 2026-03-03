import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/20260303113000_harden_multi_tenant_boundaries.sql'
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
})
