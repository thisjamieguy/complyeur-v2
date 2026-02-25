-- Update default status thresholds to align with remaining-days policy:
-- - At Risk starts at 21 days remaining (69 days used)
-- - High Risk starts at 7 days remaining (83 days used)
-- - Breach remains fixed at 90+ days used

-- Update existing company rows only when they are still using the previous defaults.
-- This preserves custom thresholds that customers have explicitly configured.
UPDATE public.company_settings
SET
  status_green_max = 68,
  status_amber_max = 82,
  status_red_max = 89
WHERE
  status_green_max = 60
  AND status_amber_max = 75
  AND status_red_max = 89;

-- Set new defaults for newly created company settings rows.
ALTER TABLE public.company_settings
  ALTER COLUMN status_green_max SET DEFAULT 68,
  ALTER COLUMN status_amber_max SET DEFAULT 82,
  ALTER COLUMN status_red_max SET DEFAULT 89;
