-- Add compatibility columns expected by the current app code.
-- This is idempotent and safe to run multiple times.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text;

-- Backfill profile display names from first/last name where available.
UPDATE public.profiles
SET full_name = NULLIF(BTRIM(CONCAT_WS(' ', first_name, last_name)), '')
WHERE full_name IS NULL;

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS status_green_max integer,
  ADD COLUMN IF NOT EXISTS status_amber_max integer,
  ADD COLUMN IF NOT EXISTS status_red_max integer,
  ADD COLUMN IF NOT EXISTS future_job_warning_threshold integer,
  ADD COLUMN IF NOT EXISTS notify_70_days boolean,
  ADD COLUMN IF NOT EXISTS notify_85_days boolean,
  ADD COLUMN IF NOT EXISTS notify_90_days boolean,
  ADD COLUMN IF NOT EXISTS weekly_digest boolean;

-- Backfill defaults for existing rows.
UPDATE public.company_settings
SET
  status_green_max = COALESCE(status_green_max, 60),
  status_amber_max = COALESCE(status_amber_max, 75),
  status_red_max = COALESCE(status_red_max, 89),
  future_job_warning_threshold = COALESCE(future_job_warning_threshold, 80),
  notify_70_days = COALESCE(notify_70_days, true),
  notify_85_days = COALESCE(notify_85_days, true),
  notify_90_days = COALESCE(notify_90_days, true),
  weekly_digest = COALESCE(weekly_digest, false);

ALTER TABLE public.company_settings
  ALTER COLUMN status_green_max SET DEFAULT 60,
  ALTER COLUMN status_amber_max SET DEFAULT 75,
  ALTER COLUMN status_red_max SET DEFAULT 89,
  ALTER COLUMN future_job_warning_threshold SET DEFAULT 80,
  ALTER COLUMN notify_70_days SET DEFAULT true,
  ALTER COLUMN notify_85_days SET DEFAULT true,
  ALTER COLUMN notify_90_days SET DEFAULT true,
  ALTER COLUMN weekly_digest SET DEFAULT false;

ALTER TABLE public.company_settings
  ALTER COLUMN status_green_max SET NOT NULL,
  ALTER COLUMN status_amber_max SET NOT NULL,
  ALTER COLUMN status_red_max SET NOT NULL,
  ALTER COLUMN future_job_warning_threshold SET NOT NULL,
  ALTER COLUMN notify_70_days SET NOT NULL,
  ALTER COLUMN notify_85_days SET NOT NULL,
  ALTER COLUMN notify_90_days SET NOT NULL,
  ALTER COLUMN weekly_digest SET NOT NULL;
