BEGIN;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS anonymized_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.employees.anonymized_by IS
  'User who performed GDPR anonymization. Kept as accountability metadata for privacy actions.';

COMMIT;
