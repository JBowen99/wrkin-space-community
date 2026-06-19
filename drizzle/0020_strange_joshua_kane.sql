CREATE TABLE "bookmark" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"team_slug" text NOT NULL,
	"wrkspace_id" text NOT NULL,
	"wrkspace_name" text NOT NULL,
	"wrkspace_slug" text NOT NULL,
	"module_id" text,
	"module_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"context_id" text,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_wrkspace_id_wrkspace_id_fk" FOREIGN KEY ("wrkspace_id") REFERENCES "public"."wrkspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_module_id_wrkspace_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."wrkspace_module"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "bookmark_user_target_idx" ON "bookmark" USING btree ("user_id","target_type","target_id");
--> statement-breakpoint
CREATE INDEX "bookmark_user_wrkspace_idx" ON "bookmark" USING btree ("user_id","wrkspace_id","created_at");
--> statement-breakpoint
CREATE INDEX "bookmark_user_created_idx" ON "bookmark" USING btree ("user_id","created_at");
