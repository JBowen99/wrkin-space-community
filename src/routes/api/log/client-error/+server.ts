import { json, type RequestHandler } from '@sveltejs/kit';

/**
 * Receives client-side error reports from `src/hooks.client.ts` and writes
 * them to the server log stream with `source: 'client'` so they're searchable
 * alongside server logs.
 *
 * Rate-limited per client IP with a tiny in-memory token bucket. The limit
 * resets on process restart, which is fine for this use case — a misbehaving
 * client gets throttled until it stops or the server cycles.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const MAX_BODY_BYTES = 8 * 1024;
const PRUNE_AFTER_BUCKETS = 5_000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimit(key: string, now: number): boolean {
	const existing = buckets.get(key);
	if (!existing || existing.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
		if (buckets.size > PRUNE_AFTER_BUCKETS) {
			for (const [k, v] of buckets) {
				if (v.resetAt <= now) buckets.delete(k);
			}
		}
		return true;
	}
	if (existing.count >= MAX_PER_WINDOW) return false;
	existing.count += 1;
	return true;
}

function clientKey(event: Parameters<RequestHandler>[0]): string {
	const xff = event.request.headers.get('x-forwarded-for');
	if (xff) {
		const first = xff.split(',')[0]?.trim();
		if (first) return first;
	}
	const real = event.request.headers.get('x-real-ip');
	if (real) return real;
	try {
		return event.getClientAddress();
	} catch {
		return 'unknown';
	}
}

function pickString(value: unknown, max = 2_000): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export const POST: RequestHandler = async (event) => {
	const ip = clientKey(event);
	const now = Date.now();

	if (!rateLimit(ip, now)) {
		return json({ ok: false, reason: 'rate_limited' }, { status: 429 });
	}

	const contentLength = Number(event.request.headers.get('content-length') ?? '0');
	if (contentLength > MAX_BODY_BYTES) {
		return json({ ok: false, reason: 'payload_too_large' }, { status: 413 });
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return json({ ok: false, reason: 'invalid_json' }, { status: 400 });
	}

	if (!body || typeof body !== 'object') {
		return json({ ok: false, reason: 'invalid_body' }, { status: 400 });
	}

	const payload = body as Record<string, unknown>;
	const errorObj = (payload.error as Record<string, unknown>) ?? {};

	event.locals.logger.error(
		{
			source: 'client',
			error_id: pickString(payload.error_id),
			status: typeof payload.status === 'number' ? payload.status : undefined,
			message: pickString(payload.message),
			path: pickString(payload.path),
			route: pickString(payload.route),
			user_agent: pickString(payload.user_agent, 500),
			user_id: event.locals.user?.id,
			ip,
			err: {
				name: pickString(errorObj.name, 200),
				message: pickString(errorObj.message),
				stack: pickString(errorObj.stack, 6_000)
			}
		},
		'client_error'
	);

	return json({ ok: true });
};
