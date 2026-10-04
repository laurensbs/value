-- Seintjes only for people who turn them on: new profiles start with reminders off. Only the default changes; existing rows keep their value. Safe to run twice.
ALTER TABLE "profile" ALTER COLUMN "reminders" SET DEFAULT false;--> statement-breakpoint
-- IF NOT EXISTS: safe to run twice. Off for everyone: only the iPhone app turns it on.
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "local_nudges" boolean DEFAULT false NOT NULL;
