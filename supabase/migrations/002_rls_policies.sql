-- Enable Row Level Security (RLS) on all tables

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 1. profiles
-- Users can read and update their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. patients
-- Doctors can only access their own patients
CREATE POLICY "Doctors can view own patients"
ON public.patients FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own patients"
ON public.patients FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own patients"
ON public.patients FOR UPDATE
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own patients"
ON public.patients FOR DELETE
USING (auth.uid() = doctor_id);

-- 3. appointments
CREATE POLICY "Doctors can view own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own appointments"
ON public.appointments FOR UPDATE
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own appointments"
ON public.appointments FOR DELETE
USING (auth.uid() = doctor_id);

-- 4. consultations
CREATE POLICY "Doctors can view own consultations"
ON public.consultations FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own consultations"
ON public.consultations FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own consultations"
ON public.consultations FOR UPDATE
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own consultations"
ON public.consultations FOR DELETE
USING (auth.uid() = doctor_id);

-- 5. diagnoses
CREATE POLICY "Doctors can view own diagnoses"
ON public.diagnoses FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own diagnoses"
ON public.diagnoses FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own diagnoses"
ON public.diagnoses FOR UPDATE
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own diagnoses"
ON public.diagnoses FOR DELETE
USING (auth.uid() = doctor_id);

-- 6. treatments
CREATE POLICY "Doctors can view own treatments"
ON public.treatments FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own treatments"
ON public.treatments FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own treatments"
ON public.treatments FOR UPDATE
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own treatments"
ON public.treatments FOR DELETE
USING (auth.uid() = doctor_id);

-- 7. exercise_plans
CREATE POLICY "Doctors can view own exercise_plans"
ON public.exercise_plans FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own exercise_plans"
ON public.exercise_plans FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own exercise_plans"
ON public.exercise_plans FOR UPDATE
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own exercise_plans"
ON public.exercise_plans FOR DELETE
USING (auth.uid() = doctor_id);

-- 8. documents
CREATE POLICY "Doctors can view own documents"
ON public.documents FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own documents"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own documents"
ON public.documents FOR UPDATE
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own documents"
ON public.documents FOR DELETE
USING (auth.uid() = doctor_id);

-- 9. payments
CREATE POLICY "Doctors can view own payments"
ON public.payments FOR SELECT
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own payments"
ON public.payments FOR INSERT
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own payments"
ON public.payments FOR UPDATE
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own payments"
ON public.payments FOR DELETE
USING (auth.uid() = doctor_id);
