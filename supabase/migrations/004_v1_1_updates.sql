-- 1. Remove columns from patients
ALTER TABLE public.patients DROP COLUMN IF EXISTS email;
ALTER TABLE public.patients DROP COLUMN IF EXISTS emergency_contact;

-- 2. Add visit_type to patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS visit_type TEXT CHECK (visit_type IN ('Home Visit', 'Hospital Visit', 'Doctor''s Home Visit'));

-- 3. Create attendances table
CREATE TABLE IF NOT EXISTS public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  attendance_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add Indexes and RLS for attendances
CREATE INDEX IF NOT EXISTS idx_attendances_doctor_id ON public.attendances(doctor_id);
CREATE INDEX IF NOT EXISTS idx_attendances_patient_id ON public.attendances(patient_id);
CREATE INDEX IF NOT EXISTS idx_attendances_attendance_date ON public.attendances(attendance_date);

ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own attendances" ON public.attendances FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can insert own attendances" ON public.attendances FOR INSERT WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Doctors can update own attendances" ON public.attendances FOR UPDATE USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Doctors can delete own attendances" ON public.attendances FOR DELETE USING (auth.uid() = doctor_id);

-- 5. Drop appointment_id from consultations and payments
ALTER TABLE public.consultations DROP COLUMN IF EXISTS appointment_id;
ALTER TABLE public.payments DROP COLUMN IF EXISTS appointment_id;

-- 6. Add attendance_id to consultations and payments
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS attendance_id UUID REFERENCES public.attendances(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS attendance_id UUID REFERENCES public.attendances(id) ON DELETE SET NULL;

-- 7. Drop appointments table entirely
DROP TABLE IF EXISTS public.appointments CASCADE;
