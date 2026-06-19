CREATE TABLE "report_instance" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"config" text DEFAULT '{}' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_source_link" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"source_module_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_instance" ADD CONSTRAINT "report_instance_module_id_wrkspace_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."wrkspace_module"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_source_link" ADD CONSTRAINT "report_source_link_report_id_report_instance_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_source_link" ADD CONSTRAINT "report_source_link_source_module_id_wrkspace_module_id_fk" FOREIGN KEY ("source_module_id") REFERENCES "public"."wrkspace_module"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_instance_module_idx" ON "report_instance" USING btree ("module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_source_link_report_module_idx" ON "report_source_link" USING btree ("report_id","source_module_id");--> statement-breakpoint
CREATE INDEX "report_source_link_report_idx" ON "report_source_link" USING btree ("report_id");