ALTER TABLE "team" ADD COLUMN "subscription_status" text;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;