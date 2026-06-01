import crypto from 'node:crypto';
import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_FOLDER = resolve(__dirname, '..', 'drizzle');

type Journal = {
	entries: { tag: string; when: number }[];
};

function readJournal(): Journal {
	return JSON.parse(fs.readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, 'utf8')) as Journal;
}

/** Returns how many rows exist in drizzle.__drizzle_migrations (0 if table is missing). */
export async function getMigrationCount(sql: postgres.Sql): Promise<number> {
	try {
		const [row] = await sql<{ count: number }[]>`
			SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations
		`;
		return row?.count ?? 0;
	} catch (err: unknown) {
		const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
		if (code === '42P01') return 0;
		throw err;
	}
}

/**
 * True when the app schema already exists (e.g. DB was created with db:push).
 * Uses `team` as a sentinel table from the initial migration.
 */
export async function isDatabaseInitialized(sql: postgres.Sql): Promise<boolean> {
	const [row] = await sql<{ initialized: boolean }[]>`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'team'
		) AS initialized
	`;
	return row?.initialized ?? false;
}

/** Record all journal migrations as already applied (does not execute SQL). */
export async function baselineMigrations(sql: postgres.Sql): Promise<void> {
	const journal = readJournal();

	for (const entry of journal.entries) {
		const path = `${MIGRATIONS_FOLDER}/${entry.tag}.sql`;
		const query = fs.readFileSync(path, 'utf8');
		const hash = crypto.createHash('sha256').update(query).digest('hex');

		const existing = await sql`
			SELECT id FROM drizzle.__drizzle_migrations WHERE hash = ${hash}
		`;

		if (existing.length > 0) {
			console.log(`skip ${entry.tag} (already recorded)`);
			continue;
		}

		await sql`
			INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
			VALUES (${hash}, ${entry.when})
		`;
		console.log(`recorded ${entry.tag}`);
	}
}

/**
 * When migration history is empty but the DB already has tables, mark existing
 * migrations as applied so only new SQL runs.
 */
export async function ensureMigrationBaseline(sql: postgres.Sql): Promise<boolean> {
	const count = await getMigrationCount(sql);
	if (count > 0) return false;

	if (!(await isDatabaseInitialized(sql))) {
		return false;
	}

	console.log(
		'Migration history is empty but the database is initialized; recording existing migrations as applied'
	);
	await baselineMigrations(sql);
	return true;
}
