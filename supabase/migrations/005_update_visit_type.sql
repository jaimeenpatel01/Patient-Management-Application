-- 1. Drop existing check constraint on visit_type
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.patients'::regclass
    AND conname LIKE '%visit_type%check%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.patients DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END $$;

-- 2. Update existing records to match new UI values
UPDATE public.patients
SET visit_type = 'Home'
WHERE visit_type = 'Home Visit';

UPDATE public.patients
SET visit_type = 'Hospital'
WHERE visit_type = 'Hospital Visit';

UPDATE public.patients
SET visit_type = 'Doctor''s Home'
WHERE visit_type = 'Doctor''s Home Visit';

-- 3. Add new check constraint with updated values
ALTER TABLE public.patients ADD CONSTRAINT patients_visit_type_check CHECK (visit_type IN ('Home', 'Hospital', 'Doctor''s Home'));
