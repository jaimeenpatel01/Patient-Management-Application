-- Billing settings editable from the admin portal (Settings tab). Requires 012_subscriptions.sql.
-- Where each value lives:
--   Plan prices          → subscription_plans.price_inr (pro plans)
--   Free patient cap     → subscription_plans.patient_cap (the 'free' row)
--   Trial length, UPI ID, payee name, verification time → billing_settings (single row)
-- The app reads all of these at runtime and falls back to src/constants/billing.ts offline.

-- 1. Guard rails on plan values the admin can now edit
ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_price_check
    CHECK ((tier = 'free' AND price_inr = 0) OR (tier = 'pro' AND price_inr > 0)),
  ADD CONSTRAINT subscription_plans_patient_cap_check
    CHECK (patient_cap IS NULL OR patient_cap > 0);

-- 2. Single-row settings table
CREATE TABLE IF NOT EXISTS public.billing_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  upi_id TEXT NOT NULL CHECK (upi_id ~ '^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$'),
  upi_payee_name TEXT NOT NULL CHECK (length(trim(upi_payee_name)) > 0),
  verification_sla_text TEXT NOT NULL CHECK (length(trim(verification_sla_text)) > 0),
  trial_days INTEGER NOT NULL CHECK (trial_days BETWEEN 0 AND 365), -- 0 = new signups start on Free
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.billing_settings (id, upi_id, upi_payee_name, verification_sla_text, trial_days)
VALUES (true, '8106232103@ybl', 'Jaimeen Kumar Patel', 'within 24 hours', 14)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;

-- Read-only for app users; only service_role (admin portal) can write.
CREATE POLICY "Authenticated users can view billing settings" ON public.billing_settings
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER on_billing_settings_updated
  BEFORE UPDATE ON public.billing_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. New signups: same body as 012, with the trial length read from billing_settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_trial_days INTEGER;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'doctor')
  );

  SELECT trial_days INTO v_trial_days FROM public.billing_settings WHERE id;
  v_trial_days := COALESCE(v_trial_days, 14);

  IF v_trial_days > 0 THEN
    INSERT INTO public.doctor_subscriptions (doctor_id, plan_id, status, trial_ends_at)
    VALUES (NEW.id, 'pro_monthly', 'trialing', now() + make_interval(days => v_trial_days))
    ON CONFLICT (doctor_id) DO NOTHING;
  ELSE
    INSERT INTO public.doctor_subscriptions (doctor_id, plan_id, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (doctor_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Admin: save everything from the Settings tab in one transaction
CREATE OR REPLACE FUNCTION public.admin_update_billing(
  p_prices JSONB, -- { "<pro plan id>": <price_inr>, ... }
  p_free_patient_cap INTEGER,
  p_trial_days INTEGER,
  p_upi_id TEXT,
  p_upi_payee_name TEXT,
  p_verification_sla_text TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_price TEXT;
BEGIN
  FOR v_plan_id, v_price IN SELECT key, value FROM jsonb_each_text(COALESCE(p_prices, '{}'::jsonb)) LOOP
    UPDATE public.subscription_plans SET price_inr = v_price::numeric
      WHERE id = v_plan_id AND tier = 'pro' AND price_inr IS DISTINCT FROM v_price::numeric;
    IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = v_plan_id AND tier = 'pro') THEN
      RAISE EXCEPTION 'Unknown paid plan %', v_plan_id;
    END IF;
  END LOOP;

  UPDATE public.subscription_plans SET patient_cap = p_free_patient_cap
    WHERE id = 'free' AND patient_cap IS DISTINCT FROM p_free_patient_cap;

  UPDATE public.billing_settings
    SET upi_id = trim(p_upi_id),
        upi_payee_name = trim(p_upi_payee_name),
        verification_sla_text = trim(p_verification_sla_text),
        trial_days = p_trial_days
    WHERE id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_billing(JSONB, INTEGER, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_billing(JSONB, INTEGER, INTEGER, TEXT, TEXT, TEXT) TO service_role;
