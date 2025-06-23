CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"target_audience" text NOT NULL,
	"village_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"collector_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"is_present" boolean DEFAULT false,
	"start_time" text,
	"end_time" text,
	"work_hours" real,
	"daily_review" text,
	"performance_rating" integer,
	"marked_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "collector_complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"collector_id" integer NOT NULL,
	"household_id" integer NOT NULL,
	"complaint" text NOT NULL,
	"status" text DEFAULT 'open',
	"manager_response" text,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "collectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"village_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "collectors_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_household_id" integer NOT NULL,
	"to_collector_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"village_id" text NOT NULL,
	"head_name" text NOT NULL,
	"phone" text,
	"house_number" text,
	"family_size" integer DEFAULT 1,
	"address" text,
	"status" text DEFAULT 'active',
	"qr_code_url" text,
	"qr_code_public_id" text,
	"generator_user_id" text,
	"generator_password" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "households_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"reported_by" text NOT NULL,
	"village_id" text NOT NULL,
	"status" text DEFAULT 'open',
	"photo_url" text,
	"manager_reply" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "segregator_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"segregator_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"status" text NOT NULL,
	"start_time" text,
	"end_time" text,
	"work_hours" real,
	"work_rating" integer,
	"daily_review" text,
	"remarks" text,
	"marked_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "segregators" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"village_id" text NOT NULL,
	"phone" text NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"password" text NOT NULL,
	"role" text NOT NULL,
	"village_id" text,
	"name" text NOT NULL,
	"phone" text,
	"is_first_login" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "villages" (
	"id" serial PRIMARY KEY NOT NULL,
	"village_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "villages_village_id_unique" UNIQUE("village_id")
);
--> statement-breakpoint
CREATE TABLE "waste_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"collector_id" integer NOT NULL,
	"collection_date" timestamp DEFAULT now(),
	"segregation_rating" integer,
	"plastic_rating" integer,
	"observations" json,
	"remarks" text,
	"photo_url" text,
	"voice_url" text,
	"status" text DEFAULT 'collected',
	"missed_reason" text
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_village_id_villages_village_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("village_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_collector_id_collectors_id_fk" FOREIGN KEY ("collector_id") REFERENCES "public"."collectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collector_complaints" ADD CONSTRAINT "collector_complaints_collector_id_collectors_id_fk" FOREIGN KEY ("collector_id") REFERENCES "public"."collectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collector_complaints" ADD CONSTRAINT "collector_complaints_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collectors" ADD CONSTRAINT "collectors_village_id_villages_village_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("village_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_from_household_id_households_id_fk" FOREIGN KEY ("from_household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_to_collector_id_collectors_id_fk" FOREIGN KEY ("to_collector_id") REFERENCES "public"."collectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_village_id_villages_village_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("village_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_village_id_villages_village_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("village_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segregator_attendance" ADD CONSTRAINT "segregator_attendance_segregator_id_segregators_id_fk" FOREIGN KEY ("segregator_id") REFERENCES "public"."segregators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segregators" ADD CONSTRAINT "segregators_village_id_villages_village_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("village_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_village_id_villages_village_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("village_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_collections" ADD CONSTRAINT "waste_collections_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_collections" ADD CONSTRAINT "waste_collections_collector_id_collectors_id_fk" FOREIGN KEY ("collector_id") REFERENCES "public"."collectors"("id") ON DELETE no action ON UPDATE no action;