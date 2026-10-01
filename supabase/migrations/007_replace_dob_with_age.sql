ALTER TABLE public.patients
DROP COLUMN IF EXISTS date_of_birth;

ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS age INTEGER;