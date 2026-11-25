-- Lets a hard (non-dismissible) vs soft (dismissible, nags once per launch)
-- update prompt be chosen from SQL, instead of every version bump being a hard block.
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS force_update BOOLEAN NOT NULL DEFAULT false;
