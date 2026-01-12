-- Migration: Add Google OAuth support
-- This migration adds auth provider tracking and enhances the user provisioning function

-- 1. Add auth_provider column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

COMMENT ON COLUMN profiles.auth_provider IS 'Authentication provider used for signup: email, google, etc.';

-- 2. Add first_name and last_name columns if they don't exist (for OAuth user data)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 3. Update the create_company_and_profile function to support OAuth
-- This function is called both by email/password signup and OAuth callback
CREATE OR REPLACE FUNCTION create_company_and_profile(
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
  -- Remove special characters, convert to lowercase, replace spaces with hyphens
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_company_and_profile(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated;

-- 4. Create a backup trigger for OAuth users
-- This trigger runs if the callback route fails to provision
-- It checks if a profile exists when a user signs in, and creates one if missing
CREATE OR REPLACE FUNCTION handle_oauth_user_if_needed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_provider TEXT;
  user_email TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  inferred_company_name TEXT;
  email_domain TEXT;
BEGIN
  -- Only process OAuth users (not email/password)
  user_provider := NEW.raw_app_meta_data->>'provider';

  IF user_provider IS NULL OR user_provider = 'email' THEN
    RETURN NEW;
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Extract user info from metadata
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  user_first_name := NEW.raw_user_meta_data->>'given_name';
  user_last_name := NEW.raw_user_meta_data->>'family_name';

  -- If no name from OAuth, try full_name
  IF user_first_name IS NULL AND user_last_name IS NULL THEN
    user_first_name := NEW.raw_user_meta_data->>'full_name';
  END IF;

  -- Infer company name from email domain
  IF user_email LIKE '%@%' THEN
    email_domain := split_part(user_email, '@', 2);
    email_domain := split_part(email_domain, '.', 1);
    -- Convert hyphens/underscores to spaces and capitalize first letter
    inferred_company_name := initcap(replace(replace(email_domain, '-', ' '), '_', ' '));
  ELSE
    inferred_company_name := 'My Company';
  END IF;

  -- Ensure we have a valid company name
  IF inferred_company_name IS NULL OR inferred_company_name = '' THEN
    inferred_company_name := 'My Company';
  END IF;

  -- Create company and profile
  PERFORM create_company_and_profile(
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

-- Create the trigger on auth.users table
-- Note: This requires the supabase_auth_admin role
DROP TRIGGER IF EXISTS on_auth_user_created_oauth ON auth.users;
CREATE TRIGGER on_auth_user_created_oauth
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_oauth_user_if_needed();

-- 5. Create index for auth_provider column (for analytics queries)
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON profiles(auth_provider);

-- 6. Update existing email users to have explicit auth_provider
UPDATE profiles
SET auth_provider = 'email'
WHERE auth_provider IS NULL;
