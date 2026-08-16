ALTER TABLE public.patients DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE public.patients ADD COLUMN age INTEGER;
