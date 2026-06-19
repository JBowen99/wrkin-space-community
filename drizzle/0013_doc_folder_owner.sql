ALTER TABLE "doc_folder" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "doc_folder" ADD CONSTRAINT "doc_folder_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doc_folder_owner_idx" ON "doc_folder" USING btree ("owner_user_id");
