-- App version gate: a single-row settings table so we can force users on an
-- old build to update without shipping a new release just to bump a number.
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  min_app_version TEXT NOT NULL DEFAULT '1.0.0',
  update_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.app_settings (id, min_app_version)
VALUES (1, '1.0.0')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Readable by anyone, including pre-login, so the update gate can show before auth.
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT USING (true);
