-- Fix: Allow owners (not just admins) to view soft-deleted employees.
-- Without this, owners cannot:
--   1. Soft-delete employees via bulk delete (UPDATE violates RLS)
--   2. See deleted employees on the GDPR recovery page
--
-- The original policy only allowed role = 'admin'. Owners should have
-- the same visibility since they have higher privileges.

DROP POLICY IF EXISTS "Admins can view deleted employees in their company" ON public.employees;

CREATE POLICY "Owners and admins can view deleted employees in their company"
  ON public.employees
  FOR SELECT
  USING (
    company_id = public.get_current_user_company_id()
    AND deleted_at IS NOT NULL
    AND public.get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );
