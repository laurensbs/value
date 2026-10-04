-- The Hondenschool: one row per finished lesson (besluit Laurens 4 okt 2026). Only a new table; nothing existing changes. IF NOT EXISTS, with the key and the link to "user" inside it: safe to run twice. Removing an account removes its rows.
CREATE TABLE IF NOT EXISTS "lesson_progress" (
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id"),
	CONSTRAINT "lesson_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
