-- Feature additions: billing info, recurring sessions, waitlist

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
