CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "block" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "block_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "dog" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"org_id" text,
	"name" text NOT NULL,
	"breed" text DEFAULT '' NOT NULL,
	"sex" text DEFAULT 'female' NOT NULL,
	"age_years" integer,
	"size" text DEFAULT 'medium' NOT NULL,
	"energy" text DEFAULT 'medium' NOT NULL,
	"level" text DEFAULT 'starter' NOT NULL,
	"ppp" boolean DEFAULT false NOT NULL,
	"photos" text[] DEFAULT '{}'::text[] NOT NULL,
	"avatar" jsonb,
	"story" text DEFAULT '' NOT NULL,
	"needs" text DEFAULT '' NOT NULL,
	"traits" text[] DEFAULT '{}'::text[] NOT NULL,
	"treats" text DEFAULT 'own' NOT NULL,
	"treats_note" text DEFAULT '' NOT NULL,
	"provides" text[] DEFAULT '{}'::text[] NOT NULL,
	"off_leash" boolean DEFAULT false NOT NULL,
	"walk_minutes" integer DEFAULT 30 NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"meeting_info" text DEFAULT '' NOT NULL,
	"vet_info" text DEFAULT '' NOT NULL,
	"chip_number" text DEFAULT '' NOT NULL,
	"insurance_confirmed" boolean DEFAULT false NOT NULL,
	"health_confirmed" boolean DEFAULT false NOT NULL,
	"bite_history" boolean DEFAULT false NOT NULL,
	"bite_note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dog_slot" (
	"id" text PRIMARY KEY NOT NULL,
	"dog_id" text NOT NULL,
	"weekday" integer NOT NULL,
	"time" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"walk_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"role" text NOT NULL,
	"answers" jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_walk" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"level" text DEFAULT 'starter' NOT NULL,
	"meeting_point" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_walk_signup" (
	"group_walk_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'booked' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_walk_signup_group_walk_id_user_id_pk" PRIMARY KEY("group_walk_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "id_check" (
	"id" text PRIMARY KEY NOT NULL,
	"walker_id" text NOT NULL,
	"checked_by" text NOT NULL,
	"org_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"data" jsonb NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"website" text,
	"email" text,
	"phone" text,
	"registration_number" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"directory_id" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_member" (
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_member_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"birth_date" date NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"bio" text DEFAULT '' NOT NULL,
	"experience" text DEFAULT 'some' NOT NULL,
	"photo_url" text,
	"phone" text,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"wants_to_walk" boolean DEFAULT true NOT NULL,
	"has_dogs" boolean DEFAULT false NOT NULL,
	"quiz_passed_at" timestamp,
	"ppp_license" boolean DEFAULT false NOT NULL,
	"terms_accepted_at" timestamp NOT NULL,
	"terms_version" text NOT NULL,
	"referral_code" text NOT NULL,
	"referred_by" text,
	"banned_at" timestamp,
	"ban_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text,
	"subject_user_id" text,
	"dog_id" text,
	"walk_id" text,
	"org_id" text,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_grant" (
	"dog_id" text NOT NULL,
	"walker_id" text NOT NULL,
	"granted_by" text NOT NULL,
	"id_seen" boolean DEFAULT false NOT NULL,
	"solo_allowed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trust_grant_dog_id_walker_id_pk" PRIMARY KEY("dog_id","walker_id")
);
--> statement-breakpoint
CREATE TABLE "walk" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text,
	"dog_id" text NOT NULL,
	"walker_id" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"planned_end_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"distance_m" integer DEFAULT 0 NOT NULL,
	"last_lat" double precision,
	"last_lng" double precision,
	"last_at" timestamp,
	"overdue_notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "walk_point" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "walk_point_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"walk_id" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"accuracy" double precision,
	"recorded_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "walk_request" (
	"id" text PRIMARY KEY NOT NULL,
	"dog_id" text NOT NULL,
	"walker_id" text NOT NULL,
	"kind" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"duration_min" integer NOT NULL,
	"weekly" boolean DEFAULT false NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp,
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dog" ADD CONSTRAINT "dog_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dog" ADD CONSTRAINT "dog_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dog_slot" ADD CONSTRAINT "dog_slot_dog_id_dog_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_walk_id_walk_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_walk" ADD CONSTRAINT "group_walk_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_walk_signup" ADD CONSTRAINT "group_walk_signup_group_walk_id_group_walk_id_fk" FOREIGN KEY ("group_walk_id") REFERENCES "public"."group_walk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_walk_signup" ADD CONSTRAINT "group_walk_signup_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "id_check" ADD CONSTRAINT "id_check_walker_id_user_id_fk" FOREIGN KEY ("walker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "id_check" ADD CONSTRAINT "id_check_checked_by_user_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_dog_id_dog_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_walk_id_walk_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walk"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_grant" ADD CONSTRAINT "trust_grant_dog_id_dog_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_grant" ADD CONSTRAINT "trust_grant_walker_id_user_id_fk" FOREIGN KEY ("walker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk" ADD CONSTRAINT "walk_request_id_walk_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."walk_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk" ADD CONSTRAINT "walk_dog_id_dog_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk" ADD CONSTRAINT "walk_walker_id_user_id_fk" FOREIGN KEY ("walker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_point" ADD CONSTRAINT "walk_point_walk_id_walk_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_request" ADD CONSTRAINT "walk_request_dog_id_dog_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_request" ADD CONSTRAINT "walk_request_walker_id_user_id_fk" FOREIGN KEY ("walker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dog_country_status_idx" ON "dog" USING btree ("country","status");--> statement-breakpoint
CREATE INDEX "dog_owner_idx" ON "dog" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "dog_org_idx" ON "dog" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "dog_slot_dog_idx" ON "dog_slot" USING btree ("dog_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_walk_from_idx" ON "feedback" USING btree ("walk_id","from_user_id");--> statement-breakpoint
CREATE INDEX "group_walk_org_idx" ON "group_walk" USING btree ("org_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "id_check_pair_idx" ON "id_check" USING btree ("walker_id","checked_by");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notification" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "organization_country_idx" ON "organization" USING btree ("country","status");--> statement-breakpoint
CREATE INDEX "organization_member_user_idx" ON "organization_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_referral_idx" ON "profile" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "profile_country_idx" ON "profile" USING btree ("country");--> statement-breakpoint
CREATE INDEX "report_status_idx" ON "report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "walk_dog_idx" ON "walk" USING btree ("dog_id","status");--> statement-breakpoint
CREATE INDEX "walk_walker_idx" ON "walk" USING btree ("walker_id","status");--> statement-breakpoint
CREATE INDEX "walk_point_walk_idx" ON "walk_point" USING btree ("walk_id","id");--> statement-breakpoint
CREATE INDEX "walk_request_dog_idx" ON "walk_request" USING btree ("dog_id","status");--> statement-breakpoint
CREATE INDEX "walk_request_walker_idx" ON "walk_request" USING btree ("walker_id","status");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credentialID_idx" ON "passkey" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");