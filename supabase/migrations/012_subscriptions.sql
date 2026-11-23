-- Subscriptions: Free / Pro tiers with manual (UPI) payment verification.
--
-- Admin runbook (Supabase Studio → SQL editor, runs as postgres so RLS is bypassed):
--   1. select * from public.admin_pending_subscription_payments;
--   2. Match the UTR / amount against your UPI app history.
--   3. select public.admin_verify_subscription_payment('<payment_id>');
--      or select public.admin_reject_subscription_payment('<payment_id>', 'reason');
--   The doctor sees the new plan the next time the Subscription screen gains focus.

-- 1. Plan catalog
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro')),
  name TEXT NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('none', 'monthly', 'yearly')),
  price_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  patient_cap INTEGER, -- NULL = unlimited
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.subscription_plans (id, tier, name, billing_interval, price_inr, patient_cap, sort_order) VALUES
  ('free', 'free', 'Free', 'none', 0, 10, 0),
  ('pro_monthly', 'pro', 'Pro Monthly', 'monthly', 499, NULL, 1),
  ('pro_yearly', 'pro', 'Pro Yearly', 'yearly', 4999, NULL, 2)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER on_subscription_plans_updated
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Each doctor's current subscription (one row per doctor)
CREATE TABLE IF NOT EXISTS public.doctor_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free' REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'expired', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  billing_provider TEXT NOT NULL DEFAULT 'manual' CHECK (billing_provider IN ('manual', 'razorpay', 'stripe', 'apple_iap', 'google_iap')),
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.doctor_subscriptions ENABLE ROW LEVEL SECURITY;

-- Read-only for doctors: no INSERT/UPDATE/DELETE policies, so a doctor can never grant themselves Pro.
CREATE POLICY "Doctors can view own subscription" ON public.doctor_subscriptions
  FOR SELECT USING (auth.uid() = doctor_id);

CREATE TRIGGER on_doctor_subscriptions_updated
  BEFORE UPDATE ON public.doctor_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Manual payment submissions ("I've paid")
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  amount_inr NUMERIC(10,2) NOT NULL CHECK (amount_inr > 0),
  payment_reference TEXT NOT NULL,
  payer_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_doctor_id ON public.subscription_payments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON public.subscription_payments(status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_subscription_payments_reference
  ON public.subscription_payments(upper(payment_reference));
CREATE UNIQUE INDEX IF NOT EXISTS uniq_subscription_payments_one_pending
  ON public.subscription_payments(doctor_id) WHERE status = 'pending';

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own subscription payments" ON public.subscription_payments
  FOR SELECT USING (auth.uid() = doctor_id);

-- Doctors may only create pending submissions for a paid plan; no UPDATE/DELETE policies.
CREATE POLICY "Doctors can submit own subscription payments" ON public.subscription_payments
  FOR INSERT WITH CHECK (
    auth.uid() = doctor_id
    AND status = 'pending'
    AND verified_at IS NULL
    AND rejection_reason IS NULL
    AND plan_id <> 'free'
  );

CREATE TRIGGER on_subscription_payments_updated
  BEFORE UPDATE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. New signups: same body as 008, plus a 14-day Pro trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'doctor')
  );

  INSERT INTO public.doctor_subscriptions (doctor_id, plan_id, status, trial_ends_at)
  VALUES (NEW.id, 'pro_monthly', 'trialing', now() + interval '14 days')
  ON CONFLICT (doctor_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Existing doctors start on Free
INSERT INTO public.doctor_subscriptions (doctor_id, plan_id, status)
SELECT id, 'free', 'active' FROM public.profiles WHERE role = 'doctor'
ON CONFLICT (doctor_id) DO NOTHING;

-- 6. Admin-only helpers (EXECUTE revoked from client roles; call from Studio SQL editor)
CREATE OR REPLACE FUNCTION public.admin_verify_subscription_payment(p_payment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.subscription_payments%ROWTYPE;
  v_interval TEXT;
  v_period INTERVAL;
BEGIN
  SELECT * INTO v_payment FROM public.subscription_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;
  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment % is already %', p_payment_id, v_payment.status;
  END IF;

  SELECT billing_interval INTO v_interval FROM public.subscription_plans WHERE id = v_payment.plan_id;
  v_period := CASE v_interval WHEN 'yearly' THEN interval '1 year' ELSE interval '1 month' END;

  UPDATE public.subscription_payments
    SET status = 'verified', verified_at = now()
    WHERE id = p_payment_id;

  -- Stack on top of any remaining paid period so early renewals aren't lost.
  INSERT INTO public.doctor_subscriptions (doctor_id, plan_id, status, current_period_end)
  VALUES (v_payment.doctor_id, v_payment.plan_id, 'active', now() + v_period)
  ON CONFLICT (doctor_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        status = 'active',
        trial_ends_at = NULL,
        current_period_end = CASE
          WHEN public.doctor_subscriptions.status = 'active'
            AND public.doctor_subscriptions.current_period_end > now()
          THEN public.doctor_subscriptions.current_period_end + v_period
          ELSE now() + v_period
        END;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_subscription_payment(p_payment_id UUID, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscription_payments
    SET status = 'rejected', verified_at = now(), rejection_reason = p_reason
    WHERE id = p_payment_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending payment % not found', p_payment_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_verify_subscription_payment(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reject_subscription_payment(UUID, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW public.admin_pending_subscription_payments AS
SELECT
  sp.id AS payment_id,
  sp.created_at AS submitted_at,
  p.full_name,
  p.email,
  p.phone,
  sp.plan_id,
  sp.amount_inr,
  sp.payment_reference,
  sp.payer_note
FROM public.subscription_payments sp
JOIN public.profiles p ON p.id = sp.doctor_id
WHERE sp.status = 'pending'
ORDER BY sp.created_at;

REVOKE ALL ON public.admin_pending_subscription_payments FROM PUBLIC, anon, authenticated;
