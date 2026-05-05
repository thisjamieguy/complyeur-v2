-- Phase 3.5: Final RLS / SECURITY DEFINER hardening lock-in
--
-- Purpose: Idempotent re-assertion of all four hardened RPC definitions so that
-- every environment (local, staging, production) converges on the same secure
-- function bodies regardless of prior migration history.
--
-- What this migration guarantees:
--   1. All four functions derive authorization exclusively from auth.uid() and
--      get_current_user_company_id() — never from caller-supplied arguments.
--   2. Caller-supplied company_id / user_id arguments are validated against the
--      authenticated context and rejected when they do not match (fail-closed).
--   3. accept_pending_invite_for_auth_user verifies both the user_id and email
--      against auth.users — no impersonation is possible via direct RPC.
--   4. transfer_company_ownership verifies the caller IS auth.uid() and holds
--      the 'owner' role — no privilege escalation from any role is possible.
--   5. EXECUTE is granted only to the authenticated role; anon and service_role
--      cannot invoke these functions directly via the PostgREST API.
--
-- Safety:
--   - Uses CREATE OR REPLACE FUNCTION — no DROP, no CASCADE, no data change.
--   - Idempotent: safe to replay on any environment.
--   - Wrapped in a transaction — fails atomically if any statement errors.

BEGIN;

-- ============================================================
-- 1. get_company_user_limit
--    Returns the seat cap for the caller's company.
--    Rejects callers who supply a company_id that does not
--    match their authenticated profile company.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_company_user_limit(p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  authenticated_user_id    uuid;
  authenticated_company_id uuid;
BEGIN
  authenticated_user_id    := auth.uid();
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
      FROM   public.company_entitlements ce
      LEFT JOIN public.tiers t ON t.slug = ce.tier_slug
      WHERE  ce.company_id = authenticated_company_id
      LIMIT  1
    ),
    (
      SELECT t2.max_users
      FROM   public.tiers t2
      WHERE  t2.slug = 'free'
      LIMIT  1
    ),
    2
  );
END;
$$;

COMMENT ON FUNCTION public.get_company_user_limit(uuid) IS
  'Security model: the caller is bound to auth.uid() and their profile company. '
  'p_company_id is validated against the authenticated context and rejected on mismatch.';

-- ============================================================
-- 2. get_company_seat_usage
--    Returns active-user count, pending-invite count, limit,
--    and available seats for the caller's company.
--    Rejects cross-company reads at the auth-context layer.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_company_seat_usage(p_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  authenticated_user_id    uuid;
  authenticated_company_id uuid;
  user_limit               integer;
  active_users             integer;
  pending_invites          integer;
BEGIN
  authenticated_user_id    := auth.uid();
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
  INTO   active_users
  FROM   public.profiles
  WHERE  company_id = authenticated_company_id;

  SELECT COUNT(*)::integer
  INTO   pending_invites
  FROM   public.company_user_invites
  WHERE  company_id = authenticated_company_id
    AND  status     = 'pending'
    AND  expires_at > NOW();

  RETURN json_build_object(
    'active_users',    active_users,
    'pending_invites', pending_invites,
    'limit',           user_limit,
    'available',       GREATEST(user_limit - (active_users + pending_invites), 0)
  );
END;
$$;

COMMENT ON FUNCTION public.get_company_seat_usage(uuid) IS
  'Security model: callers can inspect seat usage only for their own company. '
  'Authorization is derived from auth.uid() and the caller profile, not from p_company_id.';

-- ============================================================
-- 3. accept_pending_invite_for_auth_user
--    Claims the oldest unexpired pending invite for an email.
--
--    Two valid call paths:
--      a) Direct RPC from an authenticated user:
--         auth.uid() MUST equal p_user_id and the email on
--         auth.users MUST equal p_user_email. Any mismatch
--         raises 42501 (privilege not available).
--      b) Auth-trigger context (supabase_auth_admin / postgres):
--         No auth.uid() is present; session_user is checked to
--         ensure it is a trusted internal role.
--
--    This design allows the provisioning trigger to accept
--    invites during account creation while blocking direct
--    impersonation from regular authenticated users.
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_pending_invite_for_auth_user(
  p_user_id    uuid,
  p_user_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  normalized_email    text;
  caller_user_id      uuid;
  caller_auth_email   text;
  existing_company_id uuid;
  invite_record       public.company_user_invites%ROWTYPE;
  user_limit          integer;
  active_users        integer;
  pending_invites     integer;
BEGIN
  normalized_email := lower(trim(COALESCE(p_user_email, '')));

  IF normalized_email = '' THEN
    RETURN NULL;
  END IF;

  caller_user_id := auth.uid();

  IF caller_user_id IS NOT NULL THEN
    -- Direct RPC path: enforce strict identity match
    IF caller_user_id IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'Invite acceptance user mismatch'
        USING ERRCODE = '42501';
    END IF;

    SELECT lower(trim(COALESCE(au.email, '')))
    INTO   caller_auth_email
    FROM   auth.users au
    WHERE  au.id = caller_user_id
    LIMIT  1;

    IF caller_auth_email = '' OR caller_auth_email IS DISTINCT FROM normalized_email THEN
      RAISE EXCEPTION 'Invite acceptance email mismatch'
        USING ERRCODE = '42501';
    END IF;

  ELSIF session_user NOT IN ('postgres', 'supabase_auth_admin') THEN
    -- No JWT and not a trusted internal role — reject
    RAISE EXCEPTION 'Invite acceptance requires an authenticated user or auth trigger context'
      USING ERRCODE = '42501';
  END IF;

  -- Short-circuit: user already has a profile with a company
  SELECT company_id
  INTO   existing_company_id
  FROM   public.profiles
  WHERE  id = p_user_id
  LIMIT  1;

  IF existing_company_id IS NOT NULL THEN
    RETURN existing_company_id;
  END IF;

  -- Claim the oldest unexpired pending invite for this email
  SELECT *
  INTO   invite_record
  FROM   public.company_user_invites
  WHERE  email     = normalized_email
    AND  status    = 'pending'
    AND  expires_at > NOW()
  ORDER  BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Re-check seat capacity at acceptance time
  SELECT COALESCE(
    (
      SELECT COALESCE(ce.max_users, t.max_users)
      FROM   public.company_entitlements ce
      LEFT JOIN public.tiers t ON t.slug = ce.tier_slug
      WHERE  ce.company_id = invite_record.company_id
      LIMIT  1
    ),
    (
      SELECT t2.max_users
      FROM   public.tiers t2
      WHERE  t2.slug = 'free'
      LIMIT  1
    ),
    2
  )
  INTO user_limit;

  SELECT COUNT(*)::integer
  INTO   active_users
  FROM   public.profiles
  WHERE  company_id = invite_record.company_id;

  SELECT COUNT(*)::integer
  INTO   pending_invites
  FROM   public.company_user_invites
  WHERE  company_id = invite_record.company_id
    AND  status     = 'pending'
    AND  expires_at > NOW();

  -- pending_invites includes this invite, mirroring post-accept seat count
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
    SET company_id              = EXCLUDED.company_id,
        email                   = EXCLUDED.email,
        role                    = EXCLUDED.role,
        onboarding_completed_at = NOW(),
        updated_at              = NOW();

  UPDATE public.company_user_invites
  SET    status      = 'accepted',
         accepted_at = NOW(),
         updated_at  = NOW()
  WHERE  id = invite_record.id;

  RETURN invite_record.company_id;
END;
$$;

COMMENT ON FUNCTION public.accept_pending_invite_for_auth_user(uuid, text) IS
  'Security model: direct RPC callers must match auth.uid() and the email on auth.users. '
  'The only unauthenticated path allowed is the trusted auth-trigger context '
  '(supabase_auth_admin / postgres) used during account provisioning.';

-- ============================================================
-- 4. transfer_company_ownership
--    Atomically promotes p_new_owner_id to owner and demotes
--    the current caller to admin.
--
--    Security invariants enforced:
--      - auth.uid() must be present (no unauthenticated calls)
--      - p_company_id must equal the caller's company
--      - p_current_owner_id must equal auth.uid()
--      - caller's role in profiles must be 'owner'
--      - p_new_owner_id must belong to the same company
-- ============================================================

CREATE OR REPLACE FUNCTION public.transfer_company_ownership(
  p_company_id      uuid,
  p_current_owner_id uuid,
  p_new_owner_id    uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  authenticated_user_id    uuid;
  authenticated_company_id uuid;
  current_owner_role       text;
  new_owner_role           text;
BEGIN
  authenticated_user_id    := auth.uid();
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
  INTO   current_owner_role
  FROM   public.profiles
  WHERE  id         = authenticated_user_id
    AND  company_id = authenticated_company_id
  LIMIT  1;

  IF current_owner_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership'
      USING ERRCODE = '42501';
  END IF;

  SELECT role
  INTO   new_owner_role
  FROM   public.profiles
  WHERE  id         = p_new_owner_id
    AND  company_id = authenticated_company_id
  LIMIT  1;

  IF new_owner_role IS NULL THEN
    RAISE EXCEPTION 'New owner must belong to the same company'
      USING ERRCODE = '42501';
  END IF;

  -- No-op: transferring to self
  IF authenticated_user_id = p_new_owner_id THEN
    RETURN TRUE;
  END IF;

  UPDATE public.profiles
  SET role = CASE
               WHEN id = authenticated_user_id THEN 'admin'
               WHEN id = p_new_owner_id        THEN 'owner'
               ELSE role
             END,
      updated_at = NOW()
  WHERE  id IN (authenticated_user_id, p_new_owner_id)
    AND  company_id = authenticated_company_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.transfer_company_ownership(uuid, uuid, uuid) IS
  'Security model: only auth.uid() can act as the current owner; the caller must '
  'already hold the owner role for their own company. All three arguments are '
  'validated against the authenticated context and rejected on any mismatch.';

-- ============================================================
-- 5. Permissions — least-privilege execute grants
--
-- anon:          no access (never needed)
-- service_role:  no direct access (auth triggers run through
--                SECURITY DEFINER trigger functions which
--                execute as postgres — no separate grant needed)
-- authenticated: granted execute so users can call via RPC
-- ============================================================

REVOKE ALL ON FUNCTION public.get_company_user_limit(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_company_seat_usage(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.accept_pending_invite_for_auth_user(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.transfer_company_ownership(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_company_user_limit(uuid)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_company_seat_usage(uuid)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.accept_pending_invite_for_auth_user(uuid, text)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.transfer_company_ownership(uuid, uuid, uuid)
  TO authenticated;

-- ============================================================
-- 6. Validation block
--    Asserts that all four functions are SECURITY DEFINER
--    in the catalog after this migration runs. Fails the
--    transaction (and therefore the whole migration) if any
--    function is missing or not SECURITY DEFINER.
-- ============================================================

DO $$
DECLARE
  fn_name text;
  fn_secure boolean;
BEGIN
  FOR fn_name IN
    SELECT unnest(ARRAY[
      'get_company_user_limit(uuid)',
      'get_company_seat_usage(uuid)',
      'accept_pending_invite_for_auth_user(uuid,text)',
      'transfer_company_ownership(uuid,uuid,uuid)'
    ])
  LOOP
    SELECT p.prosecdef
    INTO   fn_secure
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.oid = (
             'public.' || fn_name
           )::regprocedure
    LIMIT  1;

    IF fn_secure IS NULL THEN
      RAISE EXCEPTION 'SECURITY VALIDATION FAILED: function public.% not found after migration', fn_name;
    END IF;

    IF fn_secure IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'SECURITY VALIDATION FAILED: public.% is not SECURITY DEFINER', fn_name;
    END IF;
  END LOOP;

  RAISE NOTICE 'Phase 3.5 security validation passed: all 4 functions are SECURITY DEFINER';
END;
$$;

COMMIT;
