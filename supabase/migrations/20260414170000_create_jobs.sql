BEGIN;

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  company_id uuid NOT NULL,
  job_ref text NOT NULL,
  customer text NOT NULL,
  country text NOT NULL,
  entry_date date NOT NULL,
  exit_date date NOT NULL,
  purpose text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT jobs_country_code_length CHECK (char_length(country) = 2),
  CONSTRAINT jobs_exit_after_entry CHECK (exit_date >= entry_date),
  CONSTRAINT jobs_job_ref_not_blank CHECK (btrim(job_ref) <> ''),
  CONSTRAINT jobs_customer_not_blank CHECK (btrim(customer) <> '')
);

ALTER TABLE public.jobs OWNER TO postgres;

COMMENT ON TABLE public.jobs IS 'Saved job records that group employee trips for planning and reporting';
COMMENT ON COLUMN public.jobs.job_ref IS 'Customer-facing job or project reference';
COMMENT ON COLUMN public.jobs.customer IS 'Free-text customer name for v1 job reporting';
COMMENT ON COLUMN public.jobs.country IS 'Default 2-letter ISO country code for linked employee trips';
COMMENT ON COLUMN public.jobs.entry_date IS 'Default job entry date for linked employee trips';
COMMENT ON COLUMN public.jobs.exit_date IS 'Default job exit date for linked employee trips';

ALTER TABLE ONLY public.jobs
  ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.jobs
  ADD CONSTRAINT jobs_company_id_fkey
  FOREIGN KEY (company_id)
  REFERENCES public.companies(id)
  ON DELETE CASCADE;

ALTER TABLE ONLY public.jobs
  ADD CONSTRAINT jobs_id_company_id_key UNIQUE (id, company_id);

CREATE INDEX IF NOT EXISTS idx_jobs_company_dates
  ON public.jobs (company_id, entry_date DESC, exit_date DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_company_customer
  ON public.jobs (company_id, customer);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view jobs in their company" ON public.jobs;
CREATE POLICY "Users can view jobs in their company"
ON public.jobs
FOR SELECT
USING (
  company_id = (SELECT public.get_current_user_company_id())
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can insert jobs in their company" ON public.jobs;
CREATE POLICY "Users can insert jobs in their company"
ON public.jobs
FOR INSERT
WITH CHECK (
  company_id = (SELECT public.get_current_user_company_id())
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can update jobs in their company" ON public.jobs;
CREATE POLICY "Users can update jobs in their company"
ON public.jobs
FOR UPDATE
USING (
  company_id = (SELECT public.get_current_user_company_id())
  AND public.is_current_company_active()
)
WITH CHECK (
  company_id = (SELECT public.get_current_user_company_id())
  AND public.is_current_company_active()
);

DROP POLICY IF EXISTS "Users can delete jobs in their company" ON public.jobs;
CREATE POLICY "Users can delete jobs in their company"
ON public.jobs
FOR DELETE
USING (
  company_id = (SELECT public.get_current_user_company_id())
  AND public.is_current_company_active()
);

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS job_id uuid;

ALTER TABLE ONLY public.trips
  DROP CONSTRAINT IF EXISTS trips_job_id_fkey;

ALTER TABLE ONLY public.trips
  ADD CONSTRAINT trips_job_id_fkey
  FOREIGN KEY (job_id, company_id)
  REFERENCES public.jobs(id, company_id)
  ON DELETE SET NULL (job_id);

CREATE INDEX IF NOT EXISTS idx_trips_job_id
  ON public.trips (job_id)
  WHERE job_id IS NOT NULL;

COMMENT ON COLUMN public.trips.job_id IS 'Optional saved job this trip belongs to';

COMMIT;
