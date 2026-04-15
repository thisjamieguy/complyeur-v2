-- Complete multi-tenant isolation hardening follow-up.
-- This migration is intentionally defensive for environments where the
-- 20260303113000 remediation has only partially applied or policy names drifted.

BEGIN;

CREATE TABLE IF NOT EXISTS public.tenant_integrity_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  source_row_id uuid NOT NULL,
  company_id uuid,
  employee_id uuid,
  reason text NOT NULL,
  row_data jsonb NOT NULL,
  quarantined_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_integrity_quarantine_source_idx
  ON public.tenant_integrity_quarantine (table_name, source_row_id, reason);

COMMENT ON TABLE public.tenant_integrity_quarantine IS
  'Rows removed before tenant-integrity constraints are enforced. Service-role/admin review only.';

ALTER TABLE public.tenant_integrity_quarantine ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_integrity_quarantine_no_authenticated_access" ON public.tenant_integrity_quarantine;
CREATE POLICY "tenant_integrity_quarantine_no_authenticated_access"
ON public.tenant_integrity_quarantine
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

GRANT ALL ON TABLE public.tenant_integrity_quarantine TO service_role;
REVOKE ALL ON TABLE public.tenant_integrity_quarantine FROM anon, authenticated;

-- Preserve then remove any existing employee-linked rows that would violate the
-- final composite employee/company foreign keys.
INSERT INTO public.tenant_integrity_quarantine (
  table_name,
  source_row_id,
  company_id,
  employee_id,
  reason,
  row_data
)
SELECT
  'trips',
  t.id,
  t.company_id,
  t.employee_id,
  'employee_company_mismatch',
  to_jsonb(t)
FROM public.trips t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employees e
  WHERE e.id = t.employee_id
    AND e.company_id = t.company_id
)
ON CONFLICT DO NOTHING;

DELETE FROM public.trips t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employees e
  WHERE e.id = t.employee_id
    AND e.company_id = t.company_id
);

INSERT INTO public.tenant_integrity_quarantine (
  table_name,
  source_row_id,
  company_id,
  employee_id,
  reason,
  row_data
)
SELECT
  'alerts',
  a.id,
  a.company_id,
  a.employee_id,
  'employee_company_mismatch',
  to_jsonb(a)
FROM public.alerts a
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employees e
  WHERE e.id = a.employee_id
    AND e.company_id = a.company_id
)
ON CONFLICT DO NOTHING;

DELETE FROM public.alerts a
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employees e
  WHERE e.id = a.employee_id
    AND e.company_id = a.company_id
);

INSERT INTO public.tenant_integrity_quarantine (
  table_name,
  source_row_id,
  company_id,
  employee_id,
  reason,
  row_data
)
SELECT
  'employee_compliance_snapshots',
  ecs.id,
  ecs.company_id,
  ecs.employee_id,
  'employee_company_mismatch',
  to_jsonb(ecs)
FROM public.employee_compliance_snapshots ecs
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employees e
  WHERE e.id = ecs.employee_id
    AND e.company_id = ecs.company_id
)
ON CONFLICT DO NOTHING;

DELETE FROM public.employee_compliance_snapshots ecs
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employees e
  WHERE e.id = ecs.employee_id
    AND e.company_id = ecs.company_id
);

-- Preserve then remove orphan tenant-adjacent rows before enforcing ownership.
INSERT INTO public.tenant_integrity_quarantine (
  table_name,
  source_row_id,
  company_id,
  employee_id,
  reason,
  row_data
)
SELECT
  'company_entitlements',
  ce.id,
  ce.company_id,
  NULL,
  'null_company_id',
  to_jsonb(ce)
FROM public.company_entitlements ce
WHERE ce.company_id IS NULL
ON CONFLICT DO NOTHING;

DELETE FROM public.company_entitlements
WHERE company_id IS NULL;

INSERT INTO public.tenant_integrity_quarantine (
  table_name,
  source_row_id,
  company_id,
  employee_id,
  reason,
  row_data
)
SELECT
  'company_notes',
  cn.id,
  cn.company_id,
  NULL,
  CASE
    WHEN cn.company_id IS NULL THEN 'null_company_id'
    ELSE 'null_admin_user_id'
  END,
  to_jsonb(cn)
FROM public.company_notes cn
WHERE cn.company_id IS NULL
   OR cn.admin_user_id IS NULL
ON CONFLICT DO NOTHING;

DELETE FROM public.company_notes
WHERE company_id IS NULL
   OR admin_user_id IS NULL;

ALTER TABLE public.company_entitlements
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.company_notes
  ALTER COLUMN company_id SET NOT NULL,
  ALTER COLUMN admin_user_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_id_company_id_unique_idx
  ON public.employees (id, company_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.trips'::regclass
      AND conname = 'trips_employee_company_fkey'
  ) THEN
    ALTER TABLE public.trips
      ADD CONSTRAINT trips_employee_company_fkey
      FOREIGN KEY (employee_id, company_id)
      REFERENCES public.employees (id, company_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.alerts'::regclass
      AND conname = 'alerts_employee_company_fkey'
  ) THEN
    ALTER TABLE public.alerts
      ADD CONSTRAINT alerts_employee_company_fkey
      FOREIGN KEY (employee_id, company_id)
      REFERENCES public.employees (id, company_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.employee_compliance_snapshots'::regclass
      AND conname = 'employee_compliance_snapshots_employee_company_fkey'
  ) THEN
    ALTER TABLE public.employee_compliance_snapshots
      ADD CONSTRAINT employee_compliance_snapshots_employee_company_fkey
      FOREIGN KEY (employee_id, company_id)
      REFERENCES public.employees (id, company_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$$;

ALTER TABLE public.trips
  VALIDATE CONSTRAINT trips_employee_company_fkey;

ALTER TABLE public.alerts
  VALIDATE CONSTRAINT alerts_employee_company_fkey;

ALTER TABLE public.employee_compliance_snapshots
  VALIDATE CONSTRAINT employee_compliance_snapshots_employee_company_fkey;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_modifications()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS prevent_audit_log_modifications ON public.audit_log;
CREATE TRIGGER prevent_audit_log_modifications
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modifications();

DROP POLICY IF EXISTS "Users can update audit_log in their company" ON public.audit_log;
DROP POLICY IF EXISTS "Users can delete audit_log in their company" ON public.audit_log;
DROP POLICY IF EXISTS "Deny update on audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Deny delete on audit log" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_append_only_no_update" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_append_only_no_delete" ON public.audit_log;

CREATE POLICY "audit_log_append_only_no_update"
ON public.audit_log
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "audit_log_append_only_no_delete"
ON public.audit_log
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

REVOKE ALL ON TABLE public.audit_log FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_log TO authenticated;
GRANT ALL ON TABLE public.audit_log TO service_role;

CREATE OR REPLACE FUNCTION public.is_current_company_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_entitlements ce
    WHERE ce.company_id = public.get_current_user_company_id()
      AND COALESCE(ce.is_suspended, false) = false
      AND COALESCE(ce.subscription_status, 'none') <> ALL (
        ARRAY[
          'canceled'::text,
          'unpaid'::text,
          'paused'::text,
          'incomplete_expired'::text
        ]
      )
  );
$$;

COMMENT ON FUNCTION public.is_current_company_active() IS
  'Fail-closed tenant data boundary helper. Returns true only when the authenticated user company has entitlements and is not suspended or terminally inactive.';

GRANT EXECUTE ON FUNCTION public.is_current_company_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_company_active() TO service_role;

DO $$
DECLARE
  guarded_table regclass;
BEGIN
  FOREACH guarded_table IN ARRAY ARRAY[
    'public.alerts'::regclass,
    'public.audit_log'::regclass,
    'public.background_jobs'::regclass,
    'public.column_mappings'::regclass,
    'public.companies'::regclass,
    'public.company_entitlements'::regclass,
    'public.company_settings'::regclass,
    'public.company_user_invites'::regclass,
    'public.employee_compliance_snapshots'::regclass,
    'public.employees'::regclass,
    'public.feedback_submissions'::regclass,
    'public.import_sessions'::regclass,
    'public.notification_log'::regclass,
    'public.notification_preferences'::regclass,
    'public.profiles'::regclass,
    'public.trips'::regclass
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_active_guard ON %s',
      guarded_table
    );
    EXECUTE format(
      'CREATE POLICY tenant_active_guard ON %s AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_current_company_active()) WITH CHECK (public.is_current_company_active())',
      guarded_table
    );
  END LOOP;

  IF to_regclass('public.jobs') IS NOT NULL THEN
    DROP POLICY IF EXISTS tenant_active_guard ON public.jobs;
    CREATE POLICY tenant_active_guard
    ON public.jobs
    AS RESTRICTIVE
    FOR ALL
    TO authenticated
    USING (public.is_current_company_active())
    WITH CHECK (public.is_current_company_active());
  END IF;
END
$$;

-- Waitlist contains PII/encrypted PII. Public signup inserts remain available,
-- but authenticated users no longer receive broad read access.
DROP POLICY IF EXISTS "Allow authenticated read waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_no_authenticated_read" ON public.waitlist;

CREATE POLICY "waitlist_no_authenticated_read"
ON public.waitlist
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (false);

REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.waitlist
  FROM authenticated;
GRANT INSERT ON TABLE public.waitlist TO anon, authenticated;
GRANT ALL ON TABLE public.waitlist TO service_role;

COMMIT;
