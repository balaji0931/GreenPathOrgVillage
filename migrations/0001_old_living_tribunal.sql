CREATE TABLE "collector_location_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"collector_id" integer NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"accuracy" real,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collector_tracking_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"collector_id" integer NOT NULL,
	"session_date" date NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderator_village_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"moderator_id" text NOT NULL,
	"village_id" text NOT NULL,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderators" (
	"id" serial PRIMARY KEY NOT NULL,
	"moderator_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "moderators_moderator_id_unique" UNIQUE("moderator_id")
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "collector_location_tracking" ADD CONSTRAINT "collector_location_tracking_session_id_collector_tracking_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."collector_tracking_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collector_location_tracking" ADD CONSTRAINT "collector_location_tracking_collector_id_collectors_id_fk" FOREIGN KEY ("collector_id") REFERENCES "public"."collectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collector_tracking_sessions" ADD CONSTRAINT "collector_tracking_sessions_collector_id_collectors_id_fk" FOREIGN KEY ("collector_id") REFERENCES "public"."collectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderator_village_assignments" ADD CONSTRAINT "moderator_village_assignments_moderator_id_moderators_moderator_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."moderators"("moderator_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderator_village_assignments" ADD CONSTRAINT "moderator_village_assignments_village_id_villages_village_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("village_id") ON DELETE no action ON UPDATE no action;