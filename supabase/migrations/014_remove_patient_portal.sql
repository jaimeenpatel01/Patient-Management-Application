-- Remove the patient portal feature (invite codes, patient auth linking) added in
-- 011_feature_additions.sql and 012_patient_can_view_doctor_profile.sql.

DROP POLICY IF EXISTS "Patients can view their doctor's profile" ON public.profiles;

DROP POLICY IF EXISTS "Patients can view own consultations" ON public.consultations;
DROP POLICY IF EXISTS "Patients can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Patients can view own exercise_plans" ON public.exercise_plans;
DROP POLICY IF EXISTS "Patients can view own attendances" ON public.attendances;
DROP POLICY IF EXISTS "Patients can view own patient row" ON public.patients;

DROP FUNCTION IF EXISTS public.claim_patient_invite(TEXT);

DROP INDEX IF EXISTS public.idx_patients_invite_code;
DROP INDEX IF EXISTS public.idx_patients_user_id;

ALTER TABLE public.patients DROP COLUMN IF EXISTS invite_code;
ALTER TABLE public.patients DROP COLUMN IF EXISTS user_id;
