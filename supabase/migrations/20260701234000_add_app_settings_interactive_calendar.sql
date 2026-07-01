CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value_boolean boolean,
  description text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view public app settings" ON public.app_settings;
CREATE POLICY "Authenticated users can view public app settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (key IN ('interactive_calendar_enabled'));

DROP POLICY IF EXISTS "Deny app setting inserts to authenticated users" ON public.app_settings;
CREATE POLICY "Deny app setting inserts to authenticated users"
  ON public.app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny app setting updates to authenticated users" ON public.app_settings;
CREATE POLICY "Deny app setting updates to authenticated users"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny app setting deletes to authenticated users" ON public.app_settings;
CREATE POLICY "Deny app setting deletes to authenticated users"
  ON public.app_settings
  FOR DELETE
  TO authenticated
  USING (false);

INSERT INTO public.app_settings (key, value_boolean, description)
VALUES (
  'interactive_calendar_enabled',
  false,
  'Global switch for interactive calendar editing. When disabled, only explicitly allowlisted account emails can use interactive editing.'
)
ON CONFLICT (key) DO NOTHING;

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.app_settings IS
  'Global runtime app settings that are safe for authenticated server-side reads.';

COMMENT ON COLUMN public.app_settings.key IS
  'Stable setting identifier.';

COMMENT ON COLUMN public.app_settings.value_boolean IS
  'Boolean setting value when the setting is a feature switch.';
