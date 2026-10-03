-- IF NOT EXISTS: a preview build (PR #7) may already have created these tables under the old tag 0008_launch.
CREATE TABLE IF NOT EXISTS "launch_task" (
	"key" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"done_at" timestamp,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outreach_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"audience" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"organisation" text DEFAULT '' NOT NULL,
	"email" text,
	"phone" text,
	"city" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"last_contact_at" timestamp,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outreach_contact_status_idx" ON "outreach_contact" USING btree ("status","created_at");