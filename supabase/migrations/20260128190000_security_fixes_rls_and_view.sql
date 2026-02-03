-- Migration: Fix critical security issues flagged by Supabase
-- 1. Enable RLS on schengen_countries table (reference data, public read)
-- 2. Change employee_compliance_summary view from SECURITY DEFINER to SECURITY INVOKER

-- =============================================================================
-- 1. Enable RLS on schengen_countries table
-- =============================================================================

-- Enable RLS (idempotent - safe to run multiple times)
ALTER TABLE public.schengen_countries ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or anonymous) to read reference data
-- This is a read-only reference table with no sensitive information
DROP POLICY IF EXISTS "schengen_countries_public_read" ON public.schengen_countries;
CREATE POLICY "schengen_countries_public_read"
  ON public.schengen_countries
  FOR SELECT
  USING (true);

-- =============================================================================
-- 2. Fix SECURITY DEFINER view: employee_compliance_summary
-- =============================================================================

-- Drop and recreate the view with SECURITY INVOKER
-- This ensures the view respects RLS policies on underlying tables (employees, trips)
DROP VIEW IF EXISTS public.employee_compliance_summary;

CREATE VIEW public.employee_compliance_summary
WITH (security_invoker = true)
AS
SELECT
  e.id AS employee_id,
  e.name AS employee_name,
  e.company_id,
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(CASE WHEN t.ghosted = false THEN t.travel_days ELSE 0 END), 0) AS total_travel_days,
  MAX(t.exit_date) AS last_trip_end
FROM employees e
LEFT JOIN trips t ON t.employee_id = e.id
GROUP BY e.id, e.name, e.company_id;

-- Restore permissions on the view
GRANT SELECT ON public.employee_compliance_summary TO authenticated;

-- Add comment documenting the security fix
COMMENT ON VIEW public.employee_compliance_summary IS
  'Summary view for employee compliance dashboards. Uses SECURITY INVOKER to respect RLS policies on employees and trips tables.';
