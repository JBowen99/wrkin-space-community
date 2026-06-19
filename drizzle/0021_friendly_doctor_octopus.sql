CREATE TABLE "calendar_event_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_event_attachment_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "calendar_event_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_event_attachment" ADD CONSTRAINT "calendar_event_attachment_event_id_calendar_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_attachment" ADD CONSTRAINT "calendar_event_attachment_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_invitation" ADD CONSTRAINT "calendar_event_invitation_event_id_calendar_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_invitation" ADD CONSTRAINT "calendar_event_invitation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_event_attachment_event_idx" ON "calendar_event_attachment" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_event_invitation_event_user_idx" ON "calendar_event_invitation" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "calendar_event_invitation_event_idx" ON "calendar_event_invitation" USING btree ("event_id");