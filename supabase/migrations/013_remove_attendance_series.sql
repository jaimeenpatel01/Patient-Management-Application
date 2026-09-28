-- Remove the recurring/multi-session attendance series feature (added in 011_feature_additions.sql).

DROP INDEX IF EXISTS public.idx_attendances_series_id;

ALTER TABLE public.attendances DROP COLUMN IF EXISTS series_id;
ALTER TABLE public.attendances DROP COLUMN IF EXISTS series_index;
ALTER TABLE public.attendances DROP COLUMN IF EXISTS series_total;
