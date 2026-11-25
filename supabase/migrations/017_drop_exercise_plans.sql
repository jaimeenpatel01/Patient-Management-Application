-- Remove the exercise plans feature (table added in 001_tables.sql).
-- Dropping the table also drops its indexes, RLS policies, and updated_at trigger.
-- Media previously uploaded under `medical_documents/exercise-media/` is not touched here.
DROP TABLE IF EXISTS public.exercise_plans;
