-- Add onboarding tracking to profiles table
-- New users have onboarding_completed_at = NULL (triggers onboarding redirect)
-- Existing users get backfilled to NOW() (skip onboarding)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz DEFAULT NULL;

-- Backfill all existing profiles so they skip onboarding
UPDATE public.profiles
SET onboarding_completed_at = NOW()
WHERE onboarding_completed_at IS NULL;

-- Update accept_pending_invite_for_auth_user to set onboarding_completed_at
-- Invited users join an existing company, no onboarding needed
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
