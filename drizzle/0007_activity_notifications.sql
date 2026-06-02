CREATE TABLE "activity_event" (
	"id" text PRIMARY KEY NOT NULL,
	"wrkspace_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"type" text NOT NULL,
	"module_id" text,
	"module_type" text,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"activity_event_id" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notification_preference" (
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_wrkspace_id_wrkspace_id_fk" FOREIGN KEY ("wrkspace_id") REFERENCES "public"."wrkspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_module_id_wrkspace_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."wrkspace_module"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_activity_event_id_activity_event_id_fk" FOREIGN KEY ("activity_event_id") REFERENCES "public"."activity_event"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD CONSTRAINT "user_notification_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "activity_event_wrkspace_created_idx" ON "activity_event" USING btree ("wrkspace_id","created_at");
--> statement-breakpoint
CREATE INDEX "activity_event_actor_idx" ON "activity_event" USING btree ("actor_user_id");
--> statement-breakpoint
CREATE INDEX "notification_user_read_created_idx" ON "notification" USING btree ("user_id","read_at","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_user_event_idx" ON "notification" USING btree ("user_id","activity_event_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_notification_preference_user_category_idx" ON "user_notification_preference" USING btree ("user_id","category");
