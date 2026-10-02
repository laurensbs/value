CREATE TABLE "walk_photo" (
	"id" text PRIMARY KEY NOT NULL,
	"walk_id" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "walk_photo" ADD CONSTRAINT "walk_photo_walk_id_walk_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "walk_photo_walk_idx" ON "walk_photo" USING btree ("walk_id","created_at");