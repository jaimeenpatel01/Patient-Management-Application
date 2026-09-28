-- Let a patient read their linked doctor's profile (name, clinic info) for the patient portal.
CREATE POLICY "Patients can view their doctor's profile"
ON public.profiles FOR SELECT
USING (id IN (SELECT doctor_id FROM public.patients WHERE user_id = auth.uid()));
