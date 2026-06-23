-- Value-first onboarding: new owner workspaces enter the app on a usable Pro trial.

BEGIN;

ALTER TABLE public.company_entitlements
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

CREATE OR REPLACE FUNCTION public.create_default_company_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  pro_tier public.tiers%ROWTYPE;
  trial_end timestamptz := NOW() + INTERVAL '14 days';
BEGIN
  SELECT *
  INTO pro_tier
  FROM public.tiers
  WHERE slug = 'starter'
  LIMIT 1;

  INSERT INTO public.company_entitlements (
    company_id,
    tier_slug,
    max_employees,
    max_users,
    can_export_csv,
    can_export_pdf,
    can_forecast,
    can_calendar,
    can_bulk_import,
    can_api_access,
    can_sso,
    can_audit_logs,
    is_trial,
    trial_ends_at,
    subscription_status,
    current_period_end
  )
  VALUES (
    NEW.id,
    'starter',
    COALESCE(pro_tier.max_employees, 50),
    COALESCE(pro_tier.max_users, 5),
    COALESCE(pro_tier.can_export_csv, true),
    COALESCE(pro_tier.can_export_pdf, true),
    COALESCE(pro_tier.can_forecast, true),
    COALESCE(pro_tier.can_calendar, true),
    true,
    COALESCE(pro_tier.can_api_access, false),
    COALESCE(pro_tier.can_sso, false),
    COALESCE(pro_tier.can_audit_logs, false),
    true,
    trial_end,
    'trialing',
    trial_end
  )
  ON CONFLICT (company_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_default_company_entitlements() IS
  'Trigger: creates a value-first 14-day Pro trial entitlement for new companies. SECURITY DEFINER with search_path locked.';

CREATE OR REPLACE FUNCTION app_private.create_company_and_profile(
  user_id uuid,
  user_email text,
  company_name text,
  user_terms_accepted_at timestamptz DEFAULT NULL,
  user_auth_provider text DEFAULT 'email',
  user_first_name text DEFAULT NULL,
  user_last_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_company_id uuid;
  company_slug text;
  normalized_email text;
  caller_user_id uuid;
  caller_auth_email text;
  trusted_internal_roles constant text[] := ARRAY['postgres', 'supabase_auth_admin'];
BEGIN
  caller_user_id := auth.uid();
  normalized_email := lower(trim(COALESCE(user_email, '')));

  IF caller_user_id IS NOT NULL THEN
    IF caller_user_id IS DISTINCT FROM user_id THEN
      RAISE EXCEPTION 'Company provisioning user mismatch'
        USING ERRCODE = '42501';
    END IF;

    SELECT lower(trim(COALESCE(au.email, '')))
    INTO caller_auth_email
    FROM auth.users au
    WHERE au.id = caller_user_id
    LIMIT 1;

    IF caller_auth_email = '' OR caller_auth_email IS DISTINCT FROM normalized_email THEN
      RAISE EXCEPTION 'Company provisioning email mismatch'
        USING ERRCODE = '42501';
    END IF;
  ELSIF session_user <> ALL (trusted_internal_roles) THEN
    RAISE EXCEPTION 'Company provisioning requires an authenticated user or auth trigger context'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id) THEN
    SELECT p.company_id
    INTO new_company_id
    FROM public.profiles p
    WHERE p.id = user_id;

    RETURN new_company_id;
  END IF;

  company_slug := lower(regexp_replace(COALESCE(company_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  company_slug := regexp_replace(company_slug, '^-|-$', '', 'g');

  IF company_slug = '' OR company_slug IS NULL THEN
    company_slug := 'company';
  END IF;

  WHILE EXISTS (SELECT 1 FROM public.companies c WHERE c.slug = company_slug) LOOP
    company_slug := company_slug || '-' || substr(extensions.gen_random_uuid()::text, 1, 8);
  END LOOP;

  INSERT INTO public.companies (name, slug)
  VALUES (NULLIF(trim(COALESCE(company_name, '')), ''), company_slug)
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (
    id,
    company_id,
    email,
    role,
    terms_accepted_at,
    auth_provider,
    first_name,
    last_name,
    onboarding_completed_at
  )
  VALUES (
    user_id,
    new_company_id,
    normalized_email,
    'owner',
    COALESCE(user_terms_accepted_at, NOW()),
    COALESCE(user_auth_provider, 'email'),
    user_first_name,
    user_last_name,
    NOW()
  );

  RETURN new_company_id;
END;
$$;

UPDATE public.company_entitlements ce
SET
  tier_slug = 'starter',
  max_employees = COALESCE(t.max_employees, ce.max_employees, 50),
  max_users = COALESCE(t.max_users, ce.max_users, 5),
  can_export_csv = COALESCE(t.can_export_csv, ce.can_export_csv, true),
  can_export_pdf = COALESCE(t.can_export_pdf, ce.can_export_pdf, true),
  can_forecast = COALESCE(t.can_forecast, ce.can_forecast, true),
  can_calendar = COALESCE(t.can_calendar, ce.can_calendar, true),
  can_bulk_import = true,
  can_api_access = COALESCE(t.can_api_access, ce.can_api_access, false),
  can_sso = COALESCE(t.can_sso, ce.can_sso, false),
  can_audit_logs = COALESCE(t.can_audit_logs, ce.can_audit_logs, false),
  is_trial = true,
  trial_ends_at = COALESCE(ce.trial_ends_at, NOW() + INTERVAL '14 days'),
  subscription_status = 'trialing',
  current_period_end = COALESCE(ce.current_period_end, ce.trial_ends_at, NOW() + INTERVAL '14 days'),
  updated_at = NOW()
FROM public.tiers t
WHERE t.slug = 'starter'
  AND ce.stripe_subscription_id IS NULL
  AND COALESCE(ce.is_trial, false) = true
  AND COALESCE(ce.subscription_status, 'none') = 'none';

COMMIT;
