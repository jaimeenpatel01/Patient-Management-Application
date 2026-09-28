-- Feature additions: billing info, recurring sessions, waitlist, patient portal

-- 1. Clinic billing info on profiles (for GST invoices)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinic_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinic_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinic_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- 2. Recurring/multi-session attendance series
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS series_id UUID;
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS series_index INTEGER;
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS series_total INTEGER;

CREATE INDEX IF NOT EXISTS idx_attendances_series_id ON public.attendances(series_id);

-- 3. Waitlist
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  requested_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'scheduled', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_doctor_id ON public.waitlist(doctor_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_patient_id ON public.waitlist(patient_id);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own waitlist" ON public.waitlist FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can insert own waitlist" ON public.waitlist FOR INSERT WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Doctors can update own waitlist" ON public.waitlist FOR UPDATE USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Doctors can delete own waitlist" ON public.waitlist FOR DELETE USING (auth.uid() = doctor_id);

-- 4. Patient portal: link a patient row to an auth user via a one-time invite code
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_invite_code ON public.patients(invite_code);

-- Backfill invite codes for any existing rows created before the default existed
UPDATE public.patients SET invite_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8) WHERE invite_code IS NULL;

-- RPC: a signed-in patient claims their patient record using the code the doctor gave them.
-- SECURITY DEFINER so it can bypass the doctor-only RLS policies for this one controlled write;
-- it only ever sets user_id on a single unclaimed row matching the code.
CREATE OR REPLACE FUNCTION public.claim_patient_invite(p_invite_code TEXT)
RETURNS public.patients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient public.patients;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_patient FROM public.patients WHERE invite_code = p_invite_code FOR UPDATE;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF v_patient.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'This invite code has already been used';
  END IF;

  UPDATE public.patients SET user_id = auth.uid(), updated_at = now()
  WHERE id = v_patient.id
  RETURNING * INTO v_patient;

  RETURN v_patient;
END;
$$;

-- 5. Patient-role read-only RLS: a patient may read their own linked records.
CREATE POLICY "Patients can view own patient row"
ON public.patients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Patients can view own attendances"
ON public.attendances FOR SELECT
USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));

CREATE POLICY "Patients can view own exercise_plans"
ON public.exercise_plans FOR SELECT
USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));

CREATE POLICY "Patients can view own payments"
ON public.payments FOR SELECT
USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));

CREATE POLICY "Patients can view own consultations"
ON public.consultations FOR SELECT
USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));
