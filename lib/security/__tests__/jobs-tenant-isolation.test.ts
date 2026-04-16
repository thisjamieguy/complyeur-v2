import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/20260414170000_create_jobs.sql'
)

describe('Jobs Tenant Isolation Migration', () => {
  it('creates jobs with RLS enabled', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.jobs')
    expect(sql).toContain('ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('CREATE POLICY "Users can view jobs in their company"')
    expect(sql).toContain('CREATE POLICY "Users can insert jobs in their company"')
    expect(sql).toContain('CREATE POLICY "Users can update jobs in their company"')
    expect(sql).toContain('CREATE POLICY "Users can delete jobs in their company"')
  })

  it('links trips to jobs with company-scoped integrity', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS job_id uuid')
    expect(sql).toContain('ADD CONSTRAINT jobs_id_company_id_key UNIQUE (id, company_id)')
    expect(sql).toContain('FOREIGN KEY (job_id, company_id)')
    expect(sql).toContain('REFERENCES public.jobs(id, company_id)')
    expect(sql).toContain('ON DELETE SET NULL (job_id)')
  })
})
