-- Phase 3 hardening: bind team/security RPCs to auth context and narrow execute grants.

CREATE OR REPLACE FUNCTION public.get_company_user_limit(p_company_id uuid)
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
  authenticated_company_id := public.get_current_user_company_id();

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
      LEFT JOIN public.tiers t
        ON t.slug = ce.tier_slug
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

COMMENT ON FUNCTION public.get_company_user_limit(uuid) IS
  'Security model: authenticated callers are hard-bound to auth.uid() and their profile company. The p_company_id argument is retained only for compatibility and is rejected when it does not match the caller company.';

CREATE OR REPLACE FUNCTION public.get_company_seat_usage(p_company_id uuid)
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
  authenticated_company_id := public.get_current_user_company_id();

  IF authenticated_user_id IS NULL OR authenticated_company_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to read company seat usage'
      USING ERRCODE = '42501';
  END IF;

  IF p_company_id IS DISTINCT FROM authenticated_company_id THEN
    RAISE EXCEPTION 'Cross-company seat usage access denied'
      USING ERRCODE = '42501';
  END IF;

  user_limit := public.get_company_user_limit(authenticated_company_id);

  SELECT COUNT(*)::integer
  INTO active_users
  FROM public.profiles
  WHERE company_id = authenticated_company_id;

  SELECT COUNT(*)::integer
  INTO pending_invites
  FROM public.company_user_invites
  WHERE company_id = authenticated_company_id
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

COMMENT ON FUNCTION public.get_company_seat_usage(uuid) IS
  'Security model: authenticated callers can inspect seat usage only for their own company. The function derives authorization from auth.uid() and the caller profile, not from the provided company UUID.';

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

  SELECT company_id
  INTO existing_company_id
  FROM public.profiles
  WHERE id = p_user_id
  LIMIT 1;

  IF existing_company_id IS NOT NULL THEN
    RETURN existing_company_id;
  END IF;

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

  SELECT COALESCE(
    (
      SELECT COALESCE(ce.max_users, t.max_users)
      FROM public.company_entitlements ce
      LEFT JOIN public.tiers t
        ON t.slug = ce.tier_slug
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
  FROM public.profiles
  WHERE company_id = invite_record.company_id;

  SELECT COUNT(*)::integer
  INTO pending_invites
  FROM public.company_user_invites
  WHERE company_id = invite_record.company_id
    AND status = 'pending'
    AND expires_at > NOW();

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

COMMENT ON FUNCTION public.accept_pending_invite_for_auth_user(uuid, text) IS
  'Security model: direct RPC callers must match auth.uid() and the email stored on their auth.users record. The only no-JWT path allowed is the trusted auth trigger context that provisions invited users during account creation.';

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
  authenticated_user_id uuid;
  authenticated_company_id uuid;
  current_owner_role text;
  new_owner_role text;
BEGIN
  authenticated_user_id := auth.uid();
  authenticated_company_id := public.get_current_user_company_id();

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

  SELECT role
  INTO current_owner_role
  FROM public.profiles
  WHERE id = authenticated_user_id
    AND company_id = authenticated_company_id
  LIMIT 1;

  IF current_owner_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership'
      USING ERRCODE = '42501';
  END IF;

  SELECT role
  INTO new_owner_role
  FROM public.profiles
  WHERE id = p_new_owner_id
    AND company_id = authenticated_company_id
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

COMMENT ON FUNCTION public.transfer_company_ownership(uuid, uuid, uuid) IS
  'Security model: only auth.uid() can act as the current owner, and the caller must already be the owner of their own company. The company and current owner arguments are retained for compatibility but rejected when they do not match the authenticated caller context.';

REVOKE ALL ON FUNCTION public.get_company_user_limit(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_company_seat_usage(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.accept_pending_invite_for_auth_user(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.transfer_company_ownership(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_company_user_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_seat_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_pending_invite_for_auth_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_company_ownership(uuid, uuid, uuid) TO authenticated;
