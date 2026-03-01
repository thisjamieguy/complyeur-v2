BEGIN;

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS calendar_load_mode text;

UPDATE public.company_settings
SET calendar_load_mode = COALESCE(calendar_load_mode, 'all_employees');

ALTER TABLE public.company_settings
  ALTER COLUMN calendar_load_mode SET DEFAULT 'all_employees',
  ALTER COLUMN calendar_load_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_settings_calendar_load_mode_check'
  ) THEN
    ALTER TABLE public.company_settings
      ADD CONSTRAINT company_settings_calendar_load_mode_check
      CHECK (calendar_load_mode IN ('all_employees', 'employees_with_trips'));
  END IF;
END $$;

COMMENT ON COLUMN public.company_settings.calendar_load_mode IS
  'Calendar loading scope: all employees or only employees with trips in range';

COMMIT;
