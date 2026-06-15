ALTER TABLE public.company_settings
  DROP CONSTRAINT IF EXISTS check_future_job_warning;

ALTER TABLE public.company_settings
  ADD CONSTRAINT check_future_job_warning
  CHECK (future_job_warning_threshold >= 50 AND future_job_warning_threshold <= 90);

COMMENT ON COLUMN public.company_settings.future_job_warning_threshold
  IS 'Days threshold for future job warnings (50-90)';
