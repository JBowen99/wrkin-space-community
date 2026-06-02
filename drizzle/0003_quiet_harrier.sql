CREATE TABLE "forum_post_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "forum_post_attachment_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "forum_post_attachment" ADD CONSTRAINT "forum_post_attachment_post_id_forum_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_post"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "forum_post_attachment_post_idx" ON "forum_post_attachment" USING btree ("post_id");
