-- Clean up orphaned companies that have no linked profiles (no real users).
-- These are leftover from testing/failed signups where the auth user was
-- deleted but the company record remained.
-- All foreign keys to companies use ON DELETE CASCADE, so related records
-- (entitlements, employees, trips, settings, etc.) are cleaned up automatically.

DELETE FROM public.companies
WHERE id NOT IN (
  SELECT DISTINCT company_id
  FROM public.profiles
  WHERE company_id IS NOT NULL
);
