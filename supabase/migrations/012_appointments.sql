-- Appointment scheduling: recurring/one-off future visits, separate from the
-- attendances log (which only records visits that already happened).

-- 1. appointment_series — the recurrence rule a schedule was generated from
CREATE TABLE IF NOT EXISTS public.appointment_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  frequency TEXT NOT NULL CHECK (frequency IN ('one_off', 'daily', 'weekly', 'biweekly', 'monthly')),
  days_of_week INTEGER[],
  end_type TEXT NOT NULL CHECK (end_type IN ('occurrences', 'end_date', 'ongoing')),
  end_date DATE,
  occurrences_count INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. appointments — individual scheduled occurrences, always belonging to a series
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES public.appointment_series(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_appointment_series_doctor_id ON public.appointment_series(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointment_series_patient_id ON public.appointment_series(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointment_series_status ON public.appointment_series(status);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_series_id ON public.appointments(series_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 4. RLS
ALTER TABLE public.appointment_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own appointment series" ON public.appointment_series FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can insert own appointment series" ON public.appointment_series FOR INSERT WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Doctors can update own appointment series" ON public.appointment_series FOR UPDATE USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Doctors can delete own appointment series" ON public.appointment_series FOR DELETE USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can insert own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Doctors can update own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Doctors can delete own appointments" ON public.appointments FOR DELETE USING (auth.uid() = doctor_id);

-- 5. updated_at triggers
CREATE TRIGGER on_appointment_series_updated
  BEFORE UPDATE ON public.appointment_series
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_appointments_updated
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
