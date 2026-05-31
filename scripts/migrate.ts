/**
 * Production migration runner.
 *
 * Applies generated SQL migrations from ./drizzle to the database referenced
 * by DATABASE_URL. If the DB was previously synced with db:push (schema exists
 * but drizzle.__drizzle_migrations is empty), records existing migrations
 * before applying new ones.
 *
 * Designed to run as a one-shot container in production
 * (see compose.prod.yaml's `migrate` service).
 *
 * Run with: `pnpm db:migrate:prod` (or `tsx scripts/migrate.ts`).
 */
import { config } from 'dotenv';
import { join } from 'node:path';
config({ path: join(import.meta.dirname, '..', '.env') });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { ensureMigrationBaseline, MIGRATIONS_FOLDER } from './migration-baseline.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });

try {
	if (await ensureMigrationBaseline(sql)) {
		console.log('Migration baseline complete');
	}

	console.log(`Applying migrations from ${MIGRATIONS_FOLDER}`);
	await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS_FOLDER });
	console.log('Migrations applied');
} catch (err) {
	console.error('Migration failed:', err);
	process.exitCode = 1;
} finally {
	await sql.end({ timeout: 5 });
}
