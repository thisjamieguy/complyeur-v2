-- Migration: Create waitlist table for landing page signups
-- Purpose: Store email addresses of users who want early access

BEGIN;

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_name TEXT,
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure email uniqueness (case-insensitive)
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist (email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts (for waitlist signups from landing page)
CREATE POLICY "Allow anonymous waitlist insert"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only authenticated admins can read waitlist (for dashboard/admin use later)
CREATE POLICY "Allow authenticated read waitlist"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.waitlist IS 'Stores email signups from the landing page waitlist form';

COMMIT;
