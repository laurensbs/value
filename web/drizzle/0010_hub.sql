-- IF NOT EXISTS: a preview with PREVIEW_MIGRATIONS=1 may have created this table under the old tag 0009_hub.
CREATE TABLE IF NOT EXISTS "hub_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hub_entry_kind_idx" ON "hub_entry" USING btree ("kind");