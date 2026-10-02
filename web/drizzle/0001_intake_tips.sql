CREATE TABLE "suggestion" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"website" text,
	"directory_id" text,
	"note" text DEFAULT '' NOT NULL,
	"suggested_by" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"handled_by" text,
	"handled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "instagram" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "dog_count" integer;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "opening_hours" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "walking_times" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "coordinator_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "coordinator_email" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "coordinator_phone" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "treats_policy" text DEFAULT 'own' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "provides" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "default_walk_minutes" integer DEFAULT 45 NOT NULL;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_suggested_by_user_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suggestion_status_idx" ON "suggestion" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "suggestion_user_idx" ON "suggestion" USING btree ("suggested_by","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "suggestion_vote_idx" ON "suggestion" USING btree ("suggested_by","directory_id");--> statement-breakpoint
CREATE INDEX "profile_referred_by_idx" ON "profile" USING btree ("referred_by");--> statement-breakpoint
UPDATE "dog" SET "country" = "organization"."country", "city" = "organization"."city", "lat" = "organization"."lat", "lng" = "organization"."lng" FROM "organization" WHERE "dog"."org_id" = "organization"."id";
