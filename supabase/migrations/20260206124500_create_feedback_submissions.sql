BEGIN;

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('bug', 'feature_request', 'confusing_ux', 'other')),
  message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 10 AND 2000),
  page_path text NOT NULL CHECK (left(page_path, 1) = '/' AND char_length(page_path) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_submissions_company_created_idx
  ON public.feedback_submissions (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_submissions_user_created_idx
  ON public.feedback_submissions (user_id, created_at DESC);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert feedback in their company"
  ON public.feedback_submissions
  FOR INSERT
  WITH CHECK (
    company_id = public.get_current_user_company_id()
    AND user_id = public.get_current_user_id()
  );

CREATE POLICY "Owners/admins and superadmins can view feedback"
  ON public.feedback_submissions
  FOR SELECT
  USING (
    (
      company_id = public.get_current_user_company_id()
      AND public.get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = public.get_current_user_id()
      AND is_superadmin = true
    )
  );

COMMIT;
