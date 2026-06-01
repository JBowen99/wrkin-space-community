import { json, type RequestHandler } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { pingBucket } from '$lib/server/storage/s3';
import { getBuildInfo, getUptimeSeconds } from '$lib/server/build-info';

/**
 * Readiness probe.
 *
 * Exercises every dependency we'd need to serve a real request:
 *   - Postgres   (`SELECT 1` via Drizzle)
 *   - Object storage (`HeadBucket` against MinIO/S3)
 *   - Collab WebSocket server, when reachable
 *
 * Returns 200 when everything passes, 503 if anything is degraded. Each
 * check has its own timeout so one slow dependency can't hang the probe.
 */

type CheckStatus = 'ok' | 'fail' | 'skipped';

interface CheckResult {
	status: CheckStatus;
	duration_ms: number;
	error?: string;
}

const CHECK_TIMEOUT_MS = 2_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<T>((_, reject) => {
				timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
			})
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

async function timed(label: string, fn: () => Promise<void>): Promise<CheckResult> {
	const start = performance.now();
	try {
		await withTimeout(fn(), CHECK_TIMEOUT_MS, label);
		return { status: 'ok', duration_ms: Math.round(performance.now() - start) };
	} catch (err) {
		return {
			status: 'fail',
			duration_ms: Math.round(performance.now() - start),
			error: err instanceof Error ? err.message : String(err)
		};
	}
}

async function checkDb(): Promise<CheckResult> {
	return timed('db', async () => {
		await db.execute(sql`select 1`);
	});
}

async function checkS3(): Promise<CheckResult> {
	return timed('s3', async () => {
		await pingBucket();
	});
}

async function checkCollab(): Promise<CheckResult> {
	const url = env.COLLAB_HEALTH_URL;
	if (!url) {
		return { status: 'skipped', duration_ms: 0 };
	}
	return timed('collab', async () => {
		const res = await fetch(url, { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
		if (!res.ok) {
			throw new Error(`status ${res.status}`);
		}
	});
}

export const GET: RequestHandler = async () => {
	const [database, storage, collab] = await Promise.all([checkDb(), checkS3(), checkCollab()]);

	const checks = { database, storage, collab };
	const failed = Object.entries(checks)
		.filter(([, c]) => c.status === 'fail')
		.map(([name]) => name);

	const status = failed.length === 0 ? 'ok' : 'degraded';
	const httpStatus = failed.length === 0 ? 200 : 503;

	return json(
		{
			status,
			service: 'wrkin-space',
			uptime_s: getUptimeSeconds(),
			...getBuildInfo(),
			failed,
			checks
		},
		{
			status: httpStatus,
			headers: { 'cache-control': 'no-store' }
		}
	);
};
