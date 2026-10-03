-- IF NOT EXISTS: safe to run twice (a preview build may already have added the column).
ALTER TABLE "walk_request" ADD COLUMN IF NOT EXISTS "meet_via" text DEFAULT 'walk' NOT NULL;
