CREATE TABLE "wrkspace_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"wrkspace_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wrkspace_tag" ADD CONSTRAINT "wrkspace_tag_wrkspace_id_wrkspace_id_fk" FOREIGN KEY ("wrkspace_id") REFERENCES "public"."wrkspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "wrkspace_tag_wrkspace_name_idx" ON "wrkspace_tag" USING btree ("wrkspace_id","name");
--> statement-breakpoint
CREATE INDEX "wrkspace_tag_wrkspace_idx" ON "wrkspace_tag" USING btree ("wrkspace_id");
--> statement-breakpoint
CREATE TABLE "task_item_tag" (
	"task_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_item_tag" ADD CONSTRAINT "task_item_tag_task_id_task_item_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task_item"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_item_tag" ADD CONSTRAINT "task_item_tag_tag_id_wrkspace_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."wrkspace_tag"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "task_item_tag_task_tag_idx" ON "task_item_tag" USING btree ("task_id","tag_id");
--> statement-breakpoint
CREATE INDEX "task_item_tag_task_idx" ON "task_item_tag" USING btree ("task_id");
--> statement-breakpoint
CREATE INDEX "task_item_tag_tag_idx" ON "task_item_tag" USING btree ("tag_id");
--> statement-breakpoint
CREATE TABLE "task_link" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"module_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_link" ADD CONSTRAINT "task_link_task_id_task_item_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task_item"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_link" ADD CONSTRAINT "task_link_module_id_wrkspace_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."wrkspace_module"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "task_link_task_target_idx" ON "task_link" USING btree ("task_id","target_type","target_id");
--> statement-breakpoint
CREATE INDEX "task_link_task_idx" ON "task_link" USING btree ("task_id");
--> statement-breakpoint
CREATE INDEX "task_link_target_idx" ON "task_link" USING btree ("target_type","target_id");
--> statement-breakpoint
CREATE TABLE "task_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_task_id_task_item_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task_item"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "task_comment_task_created_idx" ON "task_comment" USING btree ("task_id","created_at");
