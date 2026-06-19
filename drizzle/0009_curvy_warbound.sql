CREATE TABLE "okr_cycle" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "okr_objective" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"owner_id" text NOT NULL,
	"status" text DEFAULT 'on_track' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "okr_key_result" (
	"id" text PRIMARY KEY NOT NULL,
	"objective_id" text NOT NULL,
	"title" text NOT NULL,
	"current_value" integer DEFAULT 0 NOT NULL,
	"owner_id" text NOT NULL,
	"linked_task_id" text,
	"confidence" text DEFAULT 'medium' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "okr_check_in" (
	"id" text PRIMARY KEY NOT NULL,
	"key_result_id" text NOT NULL,
	"author_id" text NOT NULL,
	"previous_value" integer NOT NULL,
	"new_value" integer NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "okr_cycle" ADD CONSTRAINT "okr_cycle_module_id_wrkspace_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."wrkspace_module"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_objective" ADD CONSTRAINT "okr_objective_cycle_id_okr_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."okr_cycle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_objective" ADD CONSTRAINT "okr_objective_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_key_result" ADD CONSTRAINT "okr_key_result_objective_id_okr_objective_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."okr_objective"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_key_result" ADD CONSTRAINT "okr_key_result_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_key_result" ADD CONSTRAINT "okr_key_result_linked_task_id_task_item_id_fk" FOREIGN KEY ("linked_task_id") REFERENCES "public"."task_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_check_in" ADD CONSTRAINT "okr_check_in_key_result_id_okr_key_result_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."okr_key_result"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okr_check_in" ADD CONSTRAINT "okr_check_in_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "okr_cycle_module_idx" ON "okr_cycle" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "okr_objective_cycle_idx" ON "okr_objective" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "okr_key_result_objective_idx" ON "okr_key_result" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "okr_check_in_key_result_idx" ON "okr_check_in" USING btree ("key_result_id");
