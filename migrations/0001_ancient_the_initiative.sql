CREATE TABLE "moderator_village_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"moderator_id" integer NOT NULL,
	"village_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderators" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "moderators_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "moderator_village_assignments" ADD CONSTRAINT "moderator_village_assignments_moderator_id_moderators_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."moderators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderator_village_assignments" ADD CONSTRAINT "moderator_village_assignments_village_id_villages_village_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("village_id") ON DELETE no action ON UPDATE no action;