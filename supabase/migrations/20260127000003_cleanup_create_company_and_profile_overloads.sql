-- Migration: Cleanup create_company_and_profile overloads
-- Rationale: PostgREST cannot disambiguate overloaded RPCs; keep the 7-arg signature only.

BEGIN;

-- Drop legacy overloads to prevent RPC ambiguity
DROP FUNCTION IF EXISTS public.create_company_and_profile(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_company_and_profile(UUID, TEXT, TEXT, TIMESTAMPTZ);

-- Recreate the canonical function (7-arg) to ensure a single, authoritative definition
CREATE OR REPLACE FUNCTION public.create_company_and_profile(
  user_id UUID,
  user_email TEXT,
  company_name TEXT,
  user_terms_accepted_at TIMESTAMPTZ DEFAULT NULL,
  user_auth_provider TEXT DEFAULT 'email',
  user_first_name TEXT DEFAULT NULL,
  user_last_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  company_slug TEXT;
BEGIN
  -- Check if profile already exists (idempotency check)
  IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    -- Return existing company_id
    SELECT company_id INTO new_company_id FROM profiles WHERE id = user_id;
    RETURN new_company_id;
  END IF;

  -- Generate a slug from company name
  company_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  company_slug := regexp_replace(company_slug, '^-|-$', '', 'g');

  -- Ensure slug is not empty
  IF company_slug = '' OR company_slug IS NULL THEN
    company_slug := 'company';
  END IF;

  -- Ensure slug uniqueness by appending random suffix if needed
  WHILE EXISTS (SELECT 1 FROM companies WHERE slug = company_slug) LOOP
    company_slug := company_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  END LOOP;

  -- Create the company
  INSERT INTO companies (name, slug)
  VALUES (company_name, company_slug)
  RETURNING id INTO new_company_id;

  -- Create the user profile with admin role
  INSERT INTO profiles (
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
    'admin',
    COALESCE(user_terms_accepted_at, NOW()),
    COALESCE(user_auth_provider, 'email'),
    user_first_name,
    user_last_name
  );

  RETURN new_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_and_profile(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
