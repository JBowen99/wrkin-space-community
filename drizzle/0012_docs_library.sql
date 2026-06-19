CREATE TABLE "doc_folder" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"folder_id" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"original_name" text,
	"mime_type" text,
	"size_bytes" integer,
	"storage_key" text,
	"url" text,
	"link_title" text,
	"link_description" text,
	"link_image" text,
	"site_name" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_folder_grant" (
	"id" text PRIMARY KEY NOT NULL,
	"folder_id" text NOT NULL,
	"user_id" text NOT NULL,
	"level" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doc_page" ADD COLUMN "folder_id" text;--> statement-breakpoint
ALTER TABLE "doc_folder" ADD CONSTRAINT "doc_folder_module_id_wrkspace_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."wrkspace_module"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_folder" ADD CONSTRAINT "doc_folder_parent_id_doc_folder_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."doc_folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_asset" ADD CONSTRAINT "doc_asset_module_id_wrkspace_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."wrkspace_module"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_asset" ADD CONSTRAINT "doc_asset_folder_id_doc_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."doc_folder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_asset" ADD CONSTRAINT "doc_asset_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_folder_grant" ADD CONSTRAINT "doc_folder_grant_folder_id_doc_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."doc_folder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_folder_grant" ADD CONSTRAINT "doc_folder_grant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_page" ADD CONSTRAINT "doc_page_folder_id_doc_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."doc_folder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doc_folder_module_idx" ON "doc_folder" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "doc_folder_parent_idx" ON "doc_folder" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "doc_asset_module_idx" ON "doc_asset" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "doc_asset_folder_idx" ON "doc_asset" USING btree ("folder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "doc_folder_grant_folder_user_idx" ON "doc_folder_grant" USING btree ("folder_id","user_id");--> statement-breakpoint
CREATE INDEX "doc_folder_grant_folder_idx" ON "doc_folder_grant" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "doc_page_folder_idx" ON "doc_page" USING btree ("folder_id");
