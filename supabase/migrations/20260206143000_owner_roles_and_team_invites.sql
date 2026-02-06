-- Owner role, team invites, seat limits, and profile hardening

-- 1) Expand role constraint to include owner
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'viewer'::text]));

-- 2) Backfill existing companies: promote exactly one existing admin to owner when needed
WITH ranked_admins AS (
  SELECT
    p.id,
    p.company_id,
    row_number() OVER (
      PARTITION BY p.company_id
      ORDER BY p.created_at NULLS LAST, p.id
    ) AS rank_in_company
  FROM public.profiles p
  WHERE p.role = 'admin'
),
to_promote AS (
  SELECT ra.id
  FROM ranked_admins ra
  WHERE ra.rank_in_company = 1
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles owner_profile
      WHERE owner_profile.company_id = ra.company_id
        AND owner_profile.role = 'owner'
    )
)
UPDATE public.profiles p
SET role = 'owner',
    updated_at = NOW()
FROM to_promote tp
WHERE p.id = tp.id;

-- 3) Enforce one owner per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_company_single_owner
  ON public.profiles (company_id)
  WHERE role = 'owner';

-- 4) Invite table for company user management
CREATE TABLE IF NOT EXISTS public.company_user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT company_user_invites_role_check
    CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'viewer'::text])),
  CONSTRAINT company_user_invites_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text])),
  CONSTRAINT company_user_invites_email_lower_check
    CHECK (email = lower(email))
);

CREATE INDEX IF NOT EXISTS idx_company_user_invites_company
  ON public.company_user_invites (company_id);

CREATE INDEX IF NOT EXISTS idx_company_user_invites_status_expires
  ON public.company_user_invites (status, expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_user_invites_pending_unique
  ON public.company_user_invites (company_id, email)
  WHERE status = 'pending';

ALTER TABLE public.company_user_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner/Admin can view company invites"
  ON public.company_user_invites
  FOR SELECT
  USING (
    company_id = public.get_current_user_company_id()
    AND public.get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

CREATE POLICY "Owner/Admin can create company invites"
  ON public.company_user_invites
  FOR INSERT
  WITH CHECK (
    company_id = public.get_current_user_company_id()
    AND invited_by = public.get_current_user_id()
    AND public.get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

CREATE POLICY "Owner/Admin can update company invites"
  ON public.company_user_invites
  FOR UPDATE
  USING (
    company_id = public.get_current_user_company_id()
    AND public.get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  )
  WITH CHECK (
    company_id = public.get_current_user_company_id()
    AND public.get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

CREATE POLICY "Owner/Admin can delete company invites"
  ON public.company_user_invites
  FOR DELETE
  USING (
    company_id = public.get_current_user_company_id()
    AND public.get_current_user_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- 5) Seat limit helpers
CREATE OR REPLACE FUNCTION public.get_company_user_limit(p_company_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(
    (
      SELECT COALESCE(ce.max_users, t.max_users)
      FROM public.company_entitlements ce
      LEFT JOIN public.tiers t
        ON t.slug = ce.tier_slug
      WHERE ce.company_id = p_company_id
      LIMIT 1
    ),
    (
      SELECT t2.max_users
      FROM public.tiers t2
      WHERE t2.slug = 'free'
      LIMIT 1
    ),
    2
  );
$$;

CREATE OR REPLACE FUNCTION public.get_company_seat_usage(p_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_limit integer;
  active_users integer;
  pending_invites integer;
BEGIN
  user_limit := public.get_company_user_limit(p_company_id);

  SELECT COUNT(*)::integer
  INTO active_users
  FROM public.profiles
  WHERE company_id = p_company_id;

  SELECT COUNT(*)::integer
  INTO pending_invites
  FROM public.company_user_invites
  WHERE company_id = p_company_id
    AND status = 'pending'
    AND expires_at > NOW();

  RETURN json_build_object(
    'active_users', active_users,
    'pending_invites', pending_invites,
    'limit', user_limit,
    'available', GREATEST(user_limit - (active_users + pending_invites), 0)
  );
END;
$$;

-- 6) Invite acceptance helper used by auth provisioning
CREATE OR REPLACE FUNCTION public.accept_pending_invite_for_auth_user(
  p_user_id uuid,
  p_user_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  normalized_email text;
  existing_company_id uuid;
  invite_record public.company_user_invites%ROWTYPE;
  user_limit integer;
  active_users integer;
  pending_invites integer;
BEGIN
  normalized_email := lower(trim(COALESCE(p_user_email, '')));
  IF normalized_email = '' THEN
    RETURN NULL;
  END IF;

  -- If user already has a profile, keep existing company association
  SELECT company_id
  INTO existing_company_id
  FROM public.profiles
  WHERE id = p_user_id
  LIMIT 1;

  IF existing_company_id IS NOT NULL THEN
    RETURN existing_company_id;
  END IF;

  -- Claim the oldest unexpired pending invite for this email
  SELECT *
  INTO invite_record
  FROM public.company_user_invites
  WHERE email = normalized_email
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Re-check seat capacity at acceptance time
  user_limit := public.get_company_user_limit(invite_record.company_id);

  SELECT COUNT(*)::integer
  INTO active_users
  FROM public.profiles
  WHERE company_id = invite_record.company_id;

  SELECT COUNT(*)::integer
  INTO pending_invites
  FROM public.company_user_invites
  WHERE company_id = invite_record.company_id
    AND status = 'pending'
    AND expires_at > NOW();

  -- pending_invites includes this invite, so this mirrors post-accept seat count.
  IF (active_users + pending_invites) > user_limit THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.profiles (
    id,
    company_id,
    email,
    role,
    terms_accepted_at,
    auth_provider,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    invite_record.company_id,
    normalized_email,
    invite_record.role,
    NOW(),
    'email',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET company_id = EXCLUDED.company_id,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      updated_at = NOW();

  UPDATE public.company_user_invites
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = invite_record.id;

  RETURN invite_record.company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_company_ownership(
  p_company_id uuid,
  p_current_owner_id uuid,
  p_new_owner_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_owner_role text;
  new_owner_role text;
BEGIN
  SELECT role
  INTO current_owner_role
  FROM public.profiles
  WHERE id = p_current_owner_id
    AND company_id = p_company_id
  LIMIT 1;

  IF current_owner_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Current owner is invalid for this company';
  END IF;

  SELECT role
  INTO new_owner_role
  FROM public.profiles
  WHERE id = p_new_owner_id
    AND company_id = p_company_id
  LIMIT 1;

  IF new_owner_role IS NULL THEN
    RAISE EXCEPTION 'New owner must belong to the same company';
  END IF;

  IF p_current_owner_id = p_new_owner_id THEN
    RETURN TRUE;
  END IF;

  UPDATE public.profiles
  SET role = CASE
    WHEN id = p_current_owner_id THEN 'admin'
    WHEN id = p_new_owner_id THEN 'owner'
    ELSE role
  END,
  updated_at = NOW()
  WHERE id IN (p_current_owner_id, p_new_owner_id)
    AND company_id = p_company_id;

  RETURN TRUE;
END;
$$;

-- 7) New companies should start with owner role (not admin)
CREATE OR REPLACE FUNCTION public.create_company_and_profile(
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
  new_company_id UUID;
  company_slug TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    SELECT company_id INTO new_company_id FROM public.profiles WHERE id = user_id;
    RETURN new_company_id;
  END IF;

  company_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  company_slug := regexp_replace(company_slug, '^-|-$', '', 'g');

  IF company_slug = '' OR company_slug IS NULL THEN
    company_slug := 'company';
  END IF;

  WHILE EXISTS (SELECT 1 FROM public.companies WHERE slug = company_slug) LOOP
    company_slug := company_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  END LOOP;

  INSERT INTO public.companies (name, slug)
  VALUES (company_name, company_slug)
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (
    id,
    company_id,
    email,
    role,
    terms_accepted_at,
    auth_provider,
    first_name,
    last_name
  )
  VALUES (
    user_id,
    new_company_id,
    user_email,
    'owner',
    COALESCE(user_terms_accepted_at, NOW()),
    COALESCE(user_auth_provider, 'email'),
    user_first_name,
    user_last_name
  );

  RETURN new_company_id;
END;
$$;

-- 8) Auth trigger flow: accept invite first, otherwise create new company
CREATE OR REPLACE FUNCTION public.handle_auth_user_if_needed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_provider TEXT;
  user_email TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  inferred_company_name TEXT;
  email_domain TEXT;
  invited_company_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  user_provider := NEW.raw_app_meta_data->>'provider';
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');

  user_first_name := NEW.raw_user_meta_data->>'given_name';
  user_last_name := NEW.raw_user_meta_data->>'family_name';
  IF user_first_name IS NULL AND user_last_name IS NULL THEN
    user_first_name := NEW.raw_user_meta_data->>'full_name';
  END IF;

  invited_company_id := public.accept_pending_invite_for_auth_user(NEW.id, user_email);
  IF invited_company_id IS NOT NULL THEN
    UPDATE public.profiles
    SET first_name = COALESCE(public.profiles.first_name, user_first_name),
        last_name = COALESCE(public.profiles.last_name, user_last_name),
        auth_provider = COALESCE(user_provider, public.profiles.auth_provider, 'email'),
        terms_accepted_at = COALESCE(public.profiles.terms_accepted_at, NOW()),
        updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  inferred_company_name := NEW.raw_user_meta_data->>'company_name';
  IF inferred_company_name IS NULL OR inferred_company_name = '' THEN
    IF user_email LIKE '%@%' THEN
      email_domain := split_part(user_email, '@', 2);
      email_domain := split_part(email_domain, '.', 1);
      inferred_company_name := initcap(replace(replace(email_domain, '-', ' '), '_', ' '));
    ELSE
      inferred_company_name := 'My Company';
    END IF;
  END IF;

  IF inferred_company_name IS NULL OR inferred_company_name = '' THEN
    inferred_company_name := 'My Company';
  END IF;

  PERFORM public.create_company_and_profile(
    NEW.id,
    user_email,
    inferred_company_name,
    NOW(),
    COALESCE(user_provider, 'email'),
    user_first_name,
    user_last_name
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_oauth_user_if_needed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_provider TEXT;
  user_email TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  inferred_company_name TEXT;
  email_domain TEXT;
  invited_company_id UUID;
BEGIN
  user_provider := NEW.raw_app_meta_data->>'provider';

  IF user_provider IS NULL OR user_provider = 'email' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  user_first_name := NEW.raw_user_meta_data->>'given_name';
  user_last_name := NEW.raw_user_meta_data->>'family_name';

  IF user_first_name IS NULL AND user_last_name IS NULL THEN
    user_first_name := NEW.raw_user_meta_data->>'full_name';
  END IF;

  invited_company_id := public.accept_pending_invite_for_auth_user(NEW.id, user_email);
  IF invited_company_id IS NOT NULL THEN
    UPDATE public.profiles
    SET first_name = COALESCE(public.profiles.first_name, user_first_name),
        last_name = COALESCE(public.profiles.last_name, user_last_name),
        auth_provider = COALESCE(user_provider, public.profiles.auth_provider, 'email'),
        terms_accepted_at = COALESCE(public.profiles.terms_accepted_at, NOW()),
        updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  IF user_email LIKE '%@%' THEN
    email_domain := split_part(user_email, '@', 2);
    email_domain := split_part(email_domain, '.', 1);
    inferred_company_name := initcap(replace(replace(email_domain, '-', ' '), '_', ' '));
  ELSE
    inferred_company_name := 'My Company';
  END IF;

  IF inferred_company_name IS NULL OR inferred_company_name = '' THEN
    inferred_company_name := 'My Company';
  END IF;

  PERFORM public.create_company_and_profile(
    NEW.id,
    user_email,
    inferred_company_name,
    NOW(),
    user_provider,
    user_first_name,
    user_last_name
  );

  RETURN NEW;
END;
$$;

-- 9) Profile hardening: block direct role/company/superadmin mutations by non-service roles
CREATE OR REPLACE FUNCTION public.prevent_restricted_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Changing role is not allowed from this context';
    END IF;

    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Changing company membership is not allowed from this context';
    END IF;

    IF NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin THEN
      RAISE EXCEPTION 'Changing superadmin status is not allowed from this context';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_restricted_profile_updates ON public.profiles;
CREATE TRIGGER prevent_restricted_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_restricted_profile_updates();

-- 10) Grants
GRANT ALL ON TABLE public.company_user_invites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_user_invites TO authenticated;

GRANT ALL ON FUNCTION public.get_company_user_limit(uuid) TO service_role;
GRANT ALL ON FUNCTION public.get_company_user_limit(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.get_company_seat_usage(uuid) TO service_role;
GRANT ALL ON FUNCTION public.get_company_seat_usage(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.accept_pending_invite_for_auth_user(uuid, text) TO service_role;
GRANT ALL ON FUNCTION public.accept_pending_invite_for_auth_user(uuid, text) TO authenticated;

GRANT ALL ON FUNCTION public.transfer_company_ownership(uuid, uuid, uuid) TO service_role;
GRANT ALL ON FUNCTION public.transfer_company_ownership(uuid, uuid, uuid) TO authenticated;
