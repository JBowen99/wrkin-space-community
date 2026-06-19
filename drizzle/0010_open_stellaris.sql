CREATE TABLE "decision_link" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"module_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_participant" (
	"decision_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_record" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'accepted' NOT NULL,
	"decided_at" timestamp,
	"author_id" text NOT NULL,
	"supersedes_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_link" ADD CONSTRAINT "decision_link_decision_id_decision_record_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decision_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_link" ADD CONSTRAINT "decision_link_module_id_wrkspace_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."wrkspace_module"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_participant" ADD CONSTRAINT "decision_participant_decision_id_decision_record_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decision_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_participant" ADD CONSTRAINT "decision_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_record" ADD CONSTRAINT "decision_record_module_id_wrkspace_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."wrkspace_module"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_record" ADD CONSTRAINT "decision_record_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_record" ADD CONSTRAINT "decision_record_supersedes_id_decision_record_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."decision_record"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "decision_link_decision_target_idx" ON "decision_link" USING btree ("decision_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "decision_link_decision_idx" ON "decision_link" USING btree ("decision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "decision_participant_decision_user_idx" ON "decision_participant" USING btree ("decision_id","user_id");--> statement-breakpoint
CREATE INDEX "decision_participant_decision_idx" ON "decision_participant" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "decision_record_module_idx" ON "decision_record" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "decision_record_module_status_idx" ON "decision_record" USING btree ("module_id","status");