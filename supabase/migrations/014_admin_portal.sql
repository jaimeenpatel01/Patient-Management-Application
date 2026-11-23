-- Admin portal: base functions (admin/ folder, run locally with `npm run admin`).
--
-- Depends only on migrations 001–011, so it can be applied to production before the
-- subscription model (012) ships. Subscription admin functions live in 015_admin_subscriptions.sql;
-- the portal hides plans, revenue and payments until that migration exists.
--
-- Every function here is SECURITY DEFINER and executable ONLY by service_role, so the
-- portal's server (which holds the service-role key) can call them but no app user can.
-- Admin access deliberately does not depend on profiles.role (users can edit their own row).

-- 1. User list (only the fields the portal shows)
CREATE OR REPLACE FUNCTION public.admin_users()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  clinic_name TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email, p.phone, p.clinic_name, p.created_at, u.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
$$;

-- 2. Overview numbers, computed in the database so only one small object is returned.
-- public.appointments was dropped in 004 and only returns with the appointments feature,
-- so it's counted only when the table exists ('appointments' is null otherwise).
CREATE OR REPLACE FUNCTION public.admin_app_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointments BIGINT;
BEGIN
  IF to_regclass('public.appointments') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.appointments' INTO v_appointments;
  END IF;

  RETURN jsonb_build_object(
    'users', (
      SELECT jsonb_build_object(
        'total', count(*),
        'new_7d', count(*) FILTER (WHERE created_at > now() - interval '7 days'),
        'new_30d', count(*) FILTER (WHERE created_at > now() - interval '30 days')
      ) FROM public.profiles
    ),
    'usage', jsonb_build_object(
      'patients', (SELECT count(*) FROM public.patients WHERE is_active),
      'attendances', (SELECT count(*) FROM public.attendances),
      'consultations', (SELECT count(*) FROM public.consultations),
      'appointments', v_appointments
    )
  );
END;
$$;

-- 3. Lock down to service_role
REVOKE EXECUTE ON FUNCTION public.admin_users() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_app_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_app_stats() TO service_role;
