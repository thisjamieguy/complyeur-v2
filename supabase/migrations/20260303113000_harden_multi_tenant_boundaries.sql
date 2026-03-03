-- Harden multi-tenant boundaries:
-- 1. Enforce employee/company consistency in child tables
-- 2. Fail closed for suspended companies on core tenant data
-- 3. Remove broad authenticated waitlist reads
-- 4. Tighten nullable ownership columns now that data is clean

BEGIN;

-- Remove broad authenticated read access to waitlist PII.
DROP POLICY IF EXISTS "Allow authenticated read waitlist" ON public.waitlist;

-- Tighten ownership columns after verifying production data is clean.
ALTER TABLE public.company_entitlements
  ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.company_notes
  ALTER COLUMN company_id SET NOT NULL,
  ALTER COLUMN admin_user_id SET NOT NULL;

-- Add the composite uniqueness required for child-table tenant integrity.
ALTER TABLE public.employees
  ADD CONSTRAINT employees_id_company_id_unique UNIQUE (id, company_id);

-- Add composite FKs so trusted/service-role code cannot associate an employee
-- from one company with a row owned by another company.
ALTER TABLE public.trips
  ADD CONSTRAINT trips_employee_company_fkey
  FOREIGN KEY (employee_id, company_id)
  REFERENCES public.employees (id, company_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_employee_company_fkey
  FOREIGN KEY (employee_id, company_id)
  REFERENCES public.employees (id, company_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.employee_compliance_snapshots
  ADD CONSTRAINT employee_compliance_snapshots_employee_company_fkey
  FOREIGN KEY (employee_id, company_id)
  REFERENCES public.employees (id, company_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.trips
  VALIDATE CONSTRAINT trips_employee_company_fkey;

ALTER TABLE public.alerts
  VALIDATE CONSTRAINT alerts_employee_company_fkey;

ALTER TABLE public.employee_compliance_snapshots
  VALIDATE CONSTRAINT employee_compliance_snapshots_employee_company_fkey;

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
  );
$$;

COMMENT ON FUNCTION public.is_current_company_active() IS
  'Returns true when the authenticated user company is not suspended. SECURITY DEFINER with search_path locked.';

GRANT ALL ON FUNCTION public.is_current_company_active() TO authenticated;
GRANT ALL ON FUNCTION public.is_current_company_active() TO service_role;

DROP POLICY IF EXISTS "Users can view alerts in their company" ON public.alerts;
CREATE POLICY "Users can view alerts in their company"
ON public.alerts
FOR SELECT
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can insert alerts in their company" ON public.alerts;
CREATE POLICY "Users can insert alerts in their company"
ON public.alerts
FOR INSERT
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can update alerts in their company" ON public.alerts;
CREATE POLICY "Users can update alerts in their company"
ON public.alerts
FOR UPDATE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
)
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can delete alerts in their company" ON public.alerts;
CREATE POLICY "Users can delete alerts in their company"
ON public.alerts
FOR DELETE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can view background_jobs in their company" ON public.background_jobs;
CREATE POLICY "Users can view background_jobs in their company"
ON public.background_jobs
FOR SELECT
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can insert background_jobs in their company" ON public.background_jobs;
CREATE POLICY "Users can insert background_jobs in their company"
ON public.background_jobs
FOR INSERT
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can update background_jobs in their company" ON public.background_jobs;
CREATE POLICY "Users can update background_jobs in their company"
ON public.background_jobs
FOR UPDATE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
)
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can delete background_jobs in their company" ON public.background_jobs;
CREATE POLICY "Users can delete background_jobs in their company"
ON public.background_jobs
FOR DELETE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can view column_mappings in their company" ON public.column_mappings;
CREATE POLICY "Users can view column_mappings in their company"
ON public.column_mappings
FOR SELECT
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can insert column_mappings in their company" ON public.column_mappings;
CREATE POLICY "Users can insert column_mappings in their company"
ON public.column_mappings
FOR INSERT
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can update column_mappings in their company" ON public.column_mappings;
CREATE POLICY "Users can update column_mappings in their company"
ON public.column_mappings
FOR UPDATE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
)
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can delete column_mappings in their company" ON public.column_mappings;
CREATE POLICY "Users can delete column_mappings in their company"
ON public.column_mappings
FOR DELETE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can view import_sessions in their company" ON public.import_sessions;
CREATE POLICY "Users can view import_sessions in their company"
ON public.import_sessions
FOR SELECT
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can insert import_sessions in their company" ON public.import_sessions;
CREATE POLICY "Users can insert import_sessions in their company"
ON public.import_sessions
FOR INSERT
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can update import_sessions in their company" ON public.import_sessions;
CREATE POLICY "Users can update import_sessions in their company"
ON public.import_sessions
FOR UPDATE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
)
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can delete import_sessions in their company" ON public.import_sessions;
CREATE POLICY "Users can delete import_sessions in their company"
ON public.import_sessions
FOR DELETE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can view notification_log in their company" ON public.notification_log;
CREATE POLICY "Users can view notification_log in their company"
ON public.notification_log
FOR SELECT
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can insert notification_log in their company" ON public.notification_log;
CREATE POLICY "Users can insert notification_log in their company"
ON public.notification_log
FOR INSERT
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can update notification_log in their company" ON public.notification_log;
CREATE POLICY "Users can update notification_log in their company"
ON public.notification_log
FOR UPDATE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
)
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can delete notification_log in their company" ON public.notification_log;
CREATE POLICY "Users can delete notification_log in their company"
ON public.notification_log
FOR DELETE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can view employee_compliance_snapshots in their company" ON public.employee_compliance_snapshots;
CREATE POLICY "Users can view employee_compliance_snapshots in their company"
ON public.employee_compliance_snapshots
FOR SELECT
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can insert employee_compliance_snapshots in their company" ON public.employee_compliance_snapshots;
CREATE POLICY "Users can insert employee_compliance_snapshots in their company"
ON public.employee_compliance_snapshots
FOR INSERT
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can update employee_compliance_snapshots in their company" ON public.employee_compliance_snapshots;
CREATE POLICY "Users can update employee_compliance_snapshots in their company"
ON public.employee_compliance_snapshots
FOR UPDATE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
)
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can delete employee_compliance_snapshots in their company" ON public.employee_compliance_snapshots;
CREATE POLICY "Users can delete employee_compliance_snapshots in their company"
ON public.employee_compliance_snapshots
FOR DELETE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can view active employees in their company" ON public.employees;
CREATE POLICY "Users can view active employees in their company"
ON public.employees
FOR SELECT
USING (
  company_id = public.get_current_user_company_id()
  AND deleted_at IS NULL
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Owners and admins can view deleted employees in their company" ON public.employees;
DROP POLICY IF EXISTS "Admins can view deleted employees in their company" ON public.employees;
CREATE POLICY "Owners and admins can view deleted employees in their company"
ON public.employees
FOR SELECT
USING (
  company_id = public.get_current_user_company_id()
  AND deleted_at IS NOT NULL
  AND public.get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can insert employees in their company" ON public.employees;
CREATE POLICY "Users can insert employees in their company"
ON public.employees
FOR INSERT
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can update employees in their company" ON public.employees;
CREATE POLICY "Users can update employees in their company"
ON public.employees
FOR UPDATE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
)
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can delete employees in their company" ON public.employees;
CREATE POLICY "Users can delete employees in their company"
ON public.employees
FOR DELETE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can view trips in their company" ON public.trips;
CREATE POLICY "Users can view trips in their company"
ON public.trips
FOR SELECT
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can insert trips in their company" ON public.trips;
CREATE POLICY "Users can insert trips in their company"
ON public.trips
FOR INSERT
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can update trips in their company" ON public.trips;
CREATE POLICY "Users can update trips in their company"
ON public.trips
FOR UPDATE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
)
WITH CHECK (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can delete trips in their company" ON public.trips;
CREATE POLICY "Users can delete trips in their company"
ON public.trips
FOR DELETE
USING (
  company_id = public.get_current_user_company_id()
  AND public.is_current_company_active()
);

COMMIT;
