ALTER TABLE "profile" ADD COLUMN "locale" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "email_notifications" boolean DEFAULT true NOT NULL;