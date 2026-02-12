-- Store waitlist email addresses using application-layer AES-256-GCM encryption.
-- Legacy plaintext rows are preserved for backward compatibility and migration safety.

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS email_hash text,
  ADD COLUMN IF NOT EXISTS email_ciphertext text,
  ADD COLUMN IF NOT EXISTS email_iv text,
  ADD COLUMN IF NOT EXISTS email_tag text,
  ADD COLUMN IF NOT EXISTS email_key_version text,
  ADD COLUMN IF NOT EXISTS email_encryption_algorithm text;

ALTER TABLE public.waitlist
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN email_key_version SET DEFAULT 'v1',
  ALTER COLUMN email_encryption_algorithm SET DEFAULT 'aes-256-gcm';

UPDATE public.waitlist
SET
  email_key_version = COALESCE(email_key_version, 'legacy-plaintext'),
  email_encryption_algorithm = COALESCE(email_encryption_algorithm, 'none')
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email_hash_unique
  ON public.waitlist (email_hash)
  WHERE email_hash IS NOT NULL;

ALTER TABLE public.waitlist
  DROP CONSTRAINT IF EXISTS waitlist_email_storage_check;

ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_email_storage_check CHECK (
    (
      email IS NOT NULL
      AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text
      AND email_hash IS NULL
      AND email_ciphertext IS NULL
      AND email_iv IS NULL
      AND email_tag IS NULL
    )
    OR
    (
      email IS NULL
      AND email_hash IS NOT NULL
      AND email_hash ~ '^[a-f0-9]{64}$'::text
      AND email_ciphertext IS NOT NULL
      AND email_iv IS NOT NULL
      AND email_tag IS NOT NULL
      AND email_key_version IS NOT NULL
      AND COALESCE(email_encryption_algorithm, '') = 'aes-256-gcm'
    )
  );

DROP POLICY IF EXISTS "Allow anonymous waitlist insert with validation" ON public.waitlist;

CREATE POLICY "Allow anonymous waitlist insert with validation"
ON public.waitlist
FOR INSERT
TO authenticated, anon
WITH CHECK (
  (
    (
      email IS NOT NULL
      AND length(email) >= 5
      AND length(email) <= 255
      AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text
    )
    OR
    (
      email IS NULL
      AND email_hash IS NOT NULL
      AND email_hash ~ '^[a-f0-9]{64}$'::text
      AND email_ciphertext IS NOT NULL
      AND length(email_ciphertext) > 0
      AND email_iv IS NOT NULL
      AND length(email_iv) > 0
      AND email_tag IS NOT NULL
      AND length(email_tag) > 0
      AND email_key_version IS NOT NULL
      AND length(email_key_version) > 0
      AND COALESCE(email_encryption_algorithm, '') = 'aes-256-gcm'
    )
  )
  AND ((source IS NULL) OR (source = ANY (ARRAY['landing'::text, 'referral'::text, 'direct'::text, 'demo'::text])))
  AND ((company_name IS NULL) OR (length(company_name) <= 200))
);

COMMENT ON COLUMN public.waitlist.email IS
  'Legacy plaintext waitlist email. New inserts should store encrypted fields and hash.';

COMMENT ON COLUMN public.waitlist.email_hash IS
  'SHA-256 hash (peppered) of normalized email for duplicate detection without plaintext storage.';

COMMENT ON COLUMN public.waitlist.email_ciphertext IS
  'Base64 AES-256-GCM ciphertext of normalized waitlist email.';

COMMENT ON COLUMN public.waitlist.email_iv IS
  'Base64 initialization vector used for waitlist email AES-256-GCM encryption.';

COMMENT ON COLUMN public.waitlist.email_tag IS
  'Base64 authentication tag for waitlist email AES-256-GCM ciphertext integrity.';

COMMENT ON COLUMN public.waitlist.email_key_version IS
  'Key version identifier used to encrypt waitlist email.';

COMMENT ON COLUMN public.waitlist.email_encryption_algorithm IS
  'Encryption algorithm used for waitlist email ciphertext (expected: aes-256-gcm).';
