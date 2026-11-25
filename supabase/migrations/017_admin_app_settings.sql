-- Admin portal: manage the app update gate (app_settings from 014/015) from the
-- portal's "App update" tab instead of hand-written SQL.
--
-- Reads go straight to app_settings (already readable by anyone). Writes go through this
-- function so they're validated and stamp updated_at; only service_role may call it.

CREATE OR REPLACE FUNCTION public.admin_update_app_settings(
  p_min_app_version TEXT,
  p_force_update BOOLEAN,
  p_update_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_min_app_version IS NULL OR p_min_app_version !~ '^\d+\.\d+\.\d+$' THEN
    RAISE EXCEPTION 'Minimum version must look like 2.5.0';
  END IF;
  IF p_update_message IS NOT NULL AND length(btrim(p_update_message)) > 300 THEN
    RAISE EXCEPTION 'Message must be 300 characters or fewer';
  END IF;

  INSERT INTO public.app_settings (id, min_app_version, force_update, update_message, updated_at)
  VALUES (1, p_min_app_version, COALESCE(p_force_update, false), NULLIF(btrim(p_update_message), ''), now())
  ON CONFLICT (id) DO UPDATE SET
    min_app_version = EXCLUDED.min_app_version,
    force_update = EXCLUDED.force_update,
    update_message = EXCLUDED.update_message,
    updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_app_settings(TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_app_settings(TEXT, BOOLEAN, TEXT) TO service_role;
