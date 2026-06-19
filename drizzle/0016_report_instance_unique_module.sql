-- Deduplicate: keep lowest position per module, then most recently updated.
DELETE FROM "report_instance" ri
WHERE ri."id" IN (
	SELECT ri2."id"
	FROM "report_instance" ri2
	WHERE (
		SELECT COUNT(*) FROM "report_instance" ri3 WHERE ri3."module_id" = ri2."module_id"
	) > 1
	AND ri2."id" NOT IN (
		SELECT DISTINCT ON (ri4."module_id") ri4."id"
		FROM "report_instance" ri4
		ORDER BY ri4."module_id", ri4."position" ASC, ri4."updated_at" DESC
	)
);
--> statement-breakpoint
DROP INDEX IF EXISTS "report_instance_module_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "report_instance_module_unique_idx" ON "report_instance" USING btree ("module_id");
