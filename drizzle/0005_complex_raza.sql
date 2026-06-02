ALTER TABLE "calendar_event" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "ical_uid" text;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_event_module_ical_uid_idx" ON "calendar_event" USING btree ("module_id","ical_uid");