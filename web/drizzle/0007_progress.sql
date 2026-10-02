CREATE TABLE "award" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"tier" integer NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"seen_at" timestamp,
	CONSTRAINT "award_user_id_key_tier_pk" PRIMARY KEY("user_id","key","tier")
);
--> statement-breakpoint
CREATE TABLE "point_event" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"ref" text DEFAULT '' NOT NULL,
	"points" integer NOT NULL,
	"at" timestamp NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "point_event_user_id_kind_ref_pk" PRIMARY KEY("user_id","kind","ref")
);
--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "flags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "weekly_goal" integer;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "seen_level" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "award" ADD CONSTRAINT "award_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_event" ADD CONSTRAINT "point_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "point_event_user_at_idx" ON "point_event" USING btree ("user_id","at");--> statement-breakpoint
CREATE INDEX "feedback_from_idx" ON "feedback" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "group_walk_signup_user_idx" ON "group_walk_signup" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "walk_started_idx" ON "walk" USING btree ("started_at");