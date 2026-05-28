-- Harden Supabase Security Advisor findings for exposed RPC functions.
--
-- The public RPC names remain stable for application code, but privileged
-- SECURITY DEFINER bodies live in app_private, which is not an exposed API
-- schema. Public functions are SECURITY INVOKER wrappers with explicit grants.

BEGIN;

CREATE SCHEMA IF NOT EXISTS app_private;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT USAGE ON SCHEMA app_private TO service_role;

-- Keep future public functions closed by default. RPCs must opt in explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app_private
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Supabase recommends keeping extensions outside exposed schemas.
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
  ELSE
    EXECUTE 'CREATE EXTENSION pg_trgm WITH SCHEMA extensions';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.ping()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $$
  SELECT 1;
$$;

REVOKE ALL ON FUNCTION public.ping() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ping() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $$
  SELECT auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_current_user_id() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT p.company_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION app_private.get_current_user_company_id() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_current_user_company_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $$
  SELECT app_private.get_current_user_company_id();
$$;

REVOKE ALL ON FUNCTION public.get_current_user_company_id() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_company_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION app_private.get_current_user_role() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_current_user_role() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $$
  SELECT app_private.get_current_user_role();
$$;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.is_current_company_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_entitlements ce
    WHERE ce.company_id = app_private.get_current_user_company_id()
      AND COALESCE(ce.is_suspended, false) = false
      AND COALESCE(ce.subscription_status, 'none') <> ALL (
        ARRAY[
          'canceled'::text,
          'unpaid'::text,
          'paused'::text,
          'incomplete_expired'::text
        ]
      )
  );
$$;

REVOKE ALL ON FUNCTION app_private.is_current_company_active() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_current_company_active() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_current_company_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $$
  SELECT app_private.is_current_company_active();
$$;

REVOKE ALL ON FUNCTION public.is_current_company_active() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_current_company_active() TO authenticated, service_role;

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
    last_name
  )
  VALUES (
    user_id,
    new_company_id,
    normalized_email,
    'owner',
    COALESCE(user_terms_accepted_at, NOW()),
    COALESCE(user_auth_provider, 'email'),
    user_first_name,
    user_last_name
  );

  RETURN new_company_id;
END;
$$;

REVOKE ALL ON FUNCTION app_private.create_company_and_profile(uuid, text, text, timestamptz, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.create_company_and_profile(uuid, text, text, timestamptz, text, text, text)
  TO authenticated, service_role;

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
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $$
  SELECT app_private.create_company_and_profile(
    user_id,
    user_email,
    company_name,
    user_terms_accepted_at,
    user_auth_provider,
    user_first_name,
    user_last_name
  );
$$;

REVOKE ALL ON FUNCTION public.create_company_and_profile(uuid, text, text, timestamptz, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_company_and_profile(uuid, text, text, timestamptz, text, text, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.get_company_user_limit(p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  authenticated_user_id uuid;
  authenticated_company_id uuid;
BEGIN
  authenticated_user_id := auth.uid();
  authenticated_company_id := app_private.get_current_user_company_id();

  IF authenticated_user_id IS NULL OR authenticated_company_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to read company seat limits'
      USING ERRCODE = '42501';
  END IF;

  IF p_company_id IS DISTINCT FROM authenticated_company_id THEN
    RAISE EXCEPTION 'Cross-company seat limit access denied'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(
    (
      SELECT COALESCE(ce.max_users, t.max_users)
      FROM public.company_entitlements ce
      LEFT JOIN public.tiers t ON t.slug = ce.tier_slug
      WHERE ce.company_id = authenticated_company_id
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
END;
$$;

REVOKE ALL ON FUNCTION app_private.get_company_user_limit(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_company_user_limit(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_company_user_limit(p_company_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $$
  SELECT app_private.get_company_user_limit(p_company_id);
$$;

REVOKE ALL ON FUNCTION public.get_company_user_limit(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_company_user_limit(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.get_company_seat_usage(p_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  authenticated_user_id uuid;
  authenticated_company_id uuid;
  user_limit integer;
  active_users integer;
  pending_invites integer;
BEGIN
  authenticated_user_id := auth.uid();
  authenticated_company_id := app_private.get_current_user_company_id();

  IF authenticated_user_id IS NULL OR authenticated_company_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to read company seat usage'
      USING ERRCODE = '42501';
  END IF;

  IF p_company_id IS DISTINCT FROM authenticated_company_id THEN
    RAISE EXCEPTION 'Cross-company seat usage access denied'
      USING ERRCODE = '42501';
  END IF;

  user_limit := app_private.get_company_user_limit(authenticated_company_id);

  SELECT COUNT(*)::integer
  INTO active_users
  FROM public.profiles p
  WHERE p.company_id = authenticated_company_id;

  SELECT COUNT(*)::integer
  INTO pending_invites
  FROM public.company_user_invites i
  WHERE i.company_id = authenticated_company_id
    AND i.status = 'pending'
    AND i.expires_at > NOW();

  RETURN json_build_object(
    'active_users', active_users,
    'pending_invites', pending_invites,
    'limit', user_limit,
    'available', GREATEST(user_limit - (active_users + pending_invites), 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION app_private.get_company_seat_usage(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_company_seat_usage(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_company_seat_usage(p_company_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $$
  SELECT app_private.get_company_seat_usage(p_company_id);
$$;

REVOKE ALL ON FUNCTION public.get_company_seat_usage(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_company_seat_usage(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.accept_pending_invite_for_auth_user(
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
  caller_user_id uuid;
  caller_auth_email text;
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

  caller_user_id := auth.uid();

  IF caller_user_id IS NOT NULL THEN
    IF caller_user_id IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'Invite acceptance user mismatch'
        USING ERRCODE = '42501';
    END IF;

    SELECT lower(trim(COALESCE(au.email, '')))
    INTO caller_auth_email
    FROM auth.users au
    WHERE au.id = caller_user_id
    LIMIT 1;

    IF caller_auth_email = '' OR caller_auth_email IS DISTINCT FROM normalized_email THEN
      RAISE EXCEPTION 'Invite acceptance email mismatch'
        USING ERRCODE = '42501';
    END IF;
  ELSIF session_user NOT IN ('postgres', 'supabase_auth_admin') THEN
    RAISE EXCEPTION 'Invite acceptance requires an authenticated user or auth trigger context'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.company_id
  INTO existing_company_id
  FROM public.profiles p
  WHERE p.id = p_user_id
  LIMIT 1;

  IF existing_company_id IS NOT NULL THEN
    RETURN existing_company_id;
  END IF;

  SELECT *
  INTO invite_record
  FROM public.company_user_invites i
  WHERE i.email = normalized_email
    AND i.status = 'pending'
    AND i.expires_at > NOW()
  ORDER BY i.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    (
      SELECT COALESCE(ce.max_users, t.max_users)
      FROM public.company_entitlements ce
      LEFT JOIN public.tiers t ON t.slug = ce.tier_slug
      WHERE ce.company_id = invite_record.company_id
      LIMIT 1
    ),
    (
      SELECT t2.max_users
      FROM public.tiers t2
      WHERE t2.slug = 'free'
      LIMIT 1
    ),
    2
  )
  INTO user_limit;

  SELECT COUNT(*)::integer
  INTO active_users
  FROM public.profiles p
  WHERE p.company_id = invite_record.company_id;

  SELECT COUNT(*)::integer
  INTO pending_invites
  FROM public.company_user_invites i
  WHERE i.company_id = invite_record.company_id
    AND i.status = 'pending'
    AND i.expires_at > NOW();

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
    onboarding_completed_at,
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
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET company_id = EXCLUDED.company_id,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        onboarding_completed_at = NOW(),
        updated_at = NOW();

  UPDATE public.company_user_invites
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = invite_record.id;

  RETURN invite_record.company_id;
END;
$$;

REVOKE ALL ON FUNCTION app_private.accept_pending_invite_for_auth_user(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.accept_pending_invite_for_auth_user(uuid, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.accept_pending_invite_for_auth_user(
  p_user_id uuid,
  p_user_email text
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $$
  SELECT app_private.accept_pending_invite_for_auth_user(p_user_id, p_user_email);
$$;

REVOKE ALL ON FUNCTION public.accept_pending_invite_for_auth_user(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_pending_invite_for_auth_user(uuid, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.transfer_company_ownership(
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
  authenticated_user_id uuid;
  authenticated_company_id uuid;
  current_owner_role text;
  new_owner_role text;
BEGIN
  authenticated_user_id := auth.uid();
  authenticated_company_id := app_private.get_current_user_company_id();

  IF authenticated_user_id IS NULL OR authenticated_company_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to transfer company ownership'
      USING ERRCODE = '42501';
  END IF;

  IF p_company_id IS DISTINCT FROM authenticated_company_id THEN
    RAISE EXCEPTION 'Cross-company ownership transfer denied'
      USING ERRCODE = '42501';
  END IF;

  IF p_current_owner_id IS DISTINCT FROM authenticated_user_id THEN
    RAISE EXCEPTION 'Ownership transfer caller mismatch'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.role
  INTO current_owner_role
  FROM public.profiles p
  WHERE p.id = authenticated_user_id
    AND p.company_id = authenticated_company_id
  LIMIT 1;

  IF current_owner_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.role
  INTO new_owner_role
  FROM public.profiles p
  WHERE p.id = p_new_owner_id
    AND p.company_id = authenticated_company_id
  LIMIT 1;

  IF new_owner_role IS NULL THEN
    RAISE EXCEPTION 'New owner must belong to the same company'
      USING ERRCODE = '42501';
  END IF;

  IF authenticated_user_id = p_new_owner_id THEN
    RETURN TRUE;
  END IF;

  UPDATE public.profiles
  SET role = CASE
               WHEN id = authenticated_user_id THEN 'admin'
               WHEN id = p_new_owner_id THEN 'owner'
               ELSE role
             END,
      updated_at = NOW()
  WHERE id IN (authenticated_user_id, p_new_owner_id)
    AND company_id = authenticated_company_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION app_private.transfer_company_ownership(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.transfer_company_ownership(uuid, uuid, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.transfer_company_ownership(
  p_company_id uuid,
  p_current_owner_id uuid,
  p_new_owner_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $$
  SELECT app_private.transfer_company_ownership(
    p_company_id,
    p_current_owner_id,
    p_new_owner_id
  );
$$;

REVOKE ALL ON FUNCTION public.transfer_company_ownership(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_company_ownership(uuid, uuid, uuid)
  TO authenticated, service_role;

-- Direct public execution is not required for trigger/event-trigger helpers or
-- retired RPCs. The owner can still execute them from existing triggers.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.create_default_company_entitlements()'),
    to_regprocedure('public.get_dashboard_summary()'),
    to_regprocedure('public.get_dashboard_summary(uuid)'),
    to_regprocedure('public.get_last_audit_hash(uuid)'),
    to_regprocedure('public.handle_auth_user_if_needed()'),
    to_regprocedure('public.handle_oauth_user_if_needed()'),
    to_regprocedure('public.rls_auto_enable()'),
    to_regprocedure('public.unsubscribe_by_token(uuid)')
  ]
  LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', fn);
    END IF;
  END LOOP;
END;
$$;

COMMIT;
