-- Fix: Add missing columns to waitlist table
-- This fixes the schema cache issue where columns weren't created

DO $$
BEGIN
  -- Add company_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'waitlist'
    AND column_name = 'company_name'
  ) THEN
    ALTER TABLE public.waitlist ADD COLUMN company_name TEXT;
  END IF;

  -- Add source if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'waitlist'
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.waitlist ADD COLUMN source TEXT DEFAULT 'landing';
  END IF;

  -- Add created_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'waitlist'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.waitlist ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;
