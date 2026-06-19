CREATE TABLE "card_module_settings" (
	"module_id" text PRIMARY KEY NOT NULL,
	"schema" text NOT NULL,
	"layout" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_module_settings" ADD CONSTRAINT "card_module_settings_module_id_wrkspace_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."wrkspace_module"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "board_card" ADD COLUMN "field_values" text DEFAULT '{}' NOT NULL;
