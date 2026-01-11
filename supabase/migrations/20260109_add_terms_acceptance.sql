-- Migration: Add terms acceptance tracking to profiles table
-- This tracks when users accept the Terms of Service and Privacy Policy

-- Add terms_accepted_at column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN profiles.terms_accepted_at IS 'Timestamp when user accepted Terms of Service and Privacy Policy';

-- Update the create_company_and_profile function to accept terms_accepted_at
CREATE OR REPLACE FUNCTION create_company_and_profile(
  user_id UUID,
  user_email TEXT,
  company_name TEXT,
  user_terms_accepted_at TIMESTAMPTZ DEFAULT NULL
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
  -- Generate a slug from company name
  company_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  company_slug := regexp_replace(company_slug, '^-|-$', '', 'g');

  -- Ensure slug uniqueness by appending random suffix if needed
  WHILE EXISTS (SELECT 1 FROM companies WHERE slug = company_slug) LOOP
    company_slug := company_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  END LOOP;

  -- Create the company
  INSERT INTO companies (name, slug)
  VALUES (company_name, company_slug)
  RETURNING id INTO new_company_id;

  -- Create the user profile with admin role and terms acceptance
  INSERT INTO profiles (id, company_id, email, role, terms_accepted_at)
  VALUES (user_id, new_company_id, user_email, 'admin', user_terms_accepted_at);

  RETURN new_company_id;
END;
$$;
