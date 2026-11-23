-- Admin portal: subscription functions. Requires 012_subscriptions.sql — ship them together.
-- Until this migration is applied, the portal hides plans, revenue and payments.
-- Also wraps the 012 helpers admin_verify/reject_subscription_payment.
-- Every function is SECURITY DEFINER and executable ONLY by service_role.

-- Effective subscription state, shared by the functions below.
-- Keep in sync with getEffectiveTier in src/lib/subscription.ts.
CREATE OR REPLACE FUNCTION public.admin_subscription_state(
  p_tier TEXT, p_status TEXT, p_trial_ends_at TIMESTAMPTZ, p_current_period_end TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_tier IS DISTINCT FROM 'pro' THEN 'free'
    WHEN p_status = 'trialing' AND p_trial_ends_at > now() THEN 'trialing'
    WHEN p_status = 'active' AND (p_current_period_end IS NULL OR p_current_period_end > now()) THEN 'pro_paid'
    ELSE 'expired'
  END;
$$;

-- 1. Each user's subscription (the portal merges this into admin_users() by id)
CREATE OR REPLACE FUNCTION public.admin_user_subscriptions()
RETURNS TABLE (
  doctor_id UUID,
  plan_id TEXT,
  plan_name TEXT,
  status TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  state TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, ds.plan_id, sp.name, ds.status, ds.trial_ends_at, ds.current_period_end,
    public.admin_subscription_state(sp.tier, ds.status, ds.trial_ends_at, ds.current_period_end)
  FROM public.profiles p
  LEFT JOIN public.doctor_subscriptions ds ON ds.doctor_id = p.id
  LEFT JOIN public.subscription_plans sp ON sp.id = ds.plan_id;
$$;

-- 2. All subscription payments, newest first
CREATE OR REPLACE FUNCTION public.admin_subscription_payments()
RETURNS TABLE (
  id UUID,
  doctor_id UUID,
  full_name TEXT,
  email TEXT,
  plan_id TEXT,
  plan_name TEXT,
  amount_inr NUMERIC,
  payment_reference TEXT,
  payer_note TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pay.id, pay.doctor_id, p.full_name, p.email, pay.plan_id, sp.name,
    pay.amount_inr, pay.payment_reference, pay.payer_note, pay.status,
    pay.created_at, pay.verified_at, pay.rejection_reason
  FROM public.subscription_payments pay
  LEFT JOIN public.profiles p ON p.id = pay.doctor_id
  LEFT JOIN public.subscription_plans sp ON sp.id = pay.plan_id
  ORDER BY pay.created_at DESC;
$$;

-- 3. Plan breakdown and revenue numbers
CREATE OR REPLACE FUNCTION public.admin_subscription_stats()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH subs AS (
    SELECT
      sp.billing_interval,
      sp.price_inr,
      ds.trial_ends_at,
      public.admin_subscription_state(sp.tier, ds.status, ds.trial_ends_at, ds.current_period_end) AS state
    FROM public.profiles p
    LEFT JOIN public.doctor_subscriptions ds ON ds.doctor_id = p.id
    LEFT JOIN public.subscription_plans sp ON sp.id = ds.plan_id
  )
  SELECT jsonb_build_object(
    'plans', (
      SELECT jsonb_build_object(
        'free', count(*) FILTER (WHERE state = 'free'),
        'trialing', count(*) FILTER (WHERE state = 'trialing'),
        'pro_paid', count(*) FILTER (WHERE state = 'pro_paid'),
        'expired', count(*) FILTER (WHERE state = 'expired'),
        'trials_ending_7d', count(*) FILTER (
          WHERE state = 'trialing' AND trial_ends_at <= now() + interval '7 days'
        )
      ) FROM subs
    ),
    'revenue', (
      SELECT jsonb_build_object(
        'this_month', COALESCE(sum(amount_inr) FILTER (
          WHERE status = 'verified' AND verified_at >= date_trunc('month', now())
        ), 0),
        'all_time', COALESCE(sum(amount_inr) FILTER (WHERE status = 'verified'), 0),
        'pending_count', count(*) FILTER (WHERE status = 'pending'),
        'pending_amount', COALESCE(sum(amount_inr) FILTER (WHERE status = 'pending'), 0),
        'est_mrr', (
          SELECT COALESCE(sum(CASE billing_interval
            WHEN 'monthly' THEN price_inr
            WHEN 'yearly' THEN round(price_inr / 12, 2)
            ELSE 0 END), 0)
          FROM subs WHERE state = 'pro_paid'
        )
      ) FROM public.subscription_payments
    )
  );
$$;

-- 4. Set a doctor's plan (grant/extend Pro, extend trial, downgrade to Free)
CREATE OR REPLACE FUNCTION public.admin_set_doctor_plan(
  p_doctor_id UUID,
  p_plan_id TEXT,
  p_status TEXT,
  p_trial_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_current_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_doctor_id) THEN
    RAISE EXCEPTION 'User % not found', p_doctor_id;
  END IF;

  SELECT tier INTO v_tier FROM public.subscription_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan % not found', p_plan_id;
  END IF;

  IF p_status NOT IN ('trialing', 'active', 'expired', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status %', p_status;
  END IF;

  IF v_tier = 'free' THEN
    p_status := 'active';
    p_trial_ends_at := NULL;
    p_current_period_end := NULL;
  ELSIF p_status = 'trialing' AND p_trial_ends_at IS NULL THEN
    RAISE EXCEPTION 'A trial needs an end date';
  END IF;

  INSERT INTO public.doctor_subscriptions (doctor_id, plan_id, status, trial_ends_at, current_period_end)
  VALUES (p_doctor_id, p_plan_id, p_status, p_trial_ends_at, p_current_period_end)
  ON CONFLICT (doctor_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        trial_ends_at = EXCLUDED.trial_ends_at,
        current_period_end = EXCLUDED.current_period_end;
END;
$$;

-- 5. Lock everything down to service_role
REVOKE EXECUTE ON FUNCTION public.admin_subscription_state(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_user_subscriptions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_subscription_payments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_subscription_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_doctor_plan(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_subscription_state(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_user_subscriptions() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_subscription_payments() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_subscription_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_doctor_plan(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_verify_subscription_payment(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_subscription_payment(UUID, TEXT) TO service_role;
GRANT SELECT ON public.admin_pending_subscription_payments TO service_role;
