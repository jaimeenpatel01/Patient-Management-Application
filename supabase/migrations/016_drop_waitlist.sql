-- Remove the waitlist feature (table added in 011_feature_additions.sql).
-- Dropping the table also drops its indexes and RLS policies.
DROP TABLE IF EXISTS public.waitlist;
