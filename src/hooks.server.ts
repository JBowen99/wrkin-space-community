import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { auth } from '$lib/server/auth';
import { isDbOptionalPath } from '$lib/server/public-routes';
import { setDbEnv } from '$lib/server/db';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { ulid } from 'ulid';
import { logger, logError } from '$lib/server/logger';

if (!building) setDbEnv(env);

function isLowSignalPath(pathname: string): boolean {
	if (pathname === '/favicon.ico') return true;
	if (pathname === '/api/health' || pathname.startsWith('/api/health/')) return true;
	if (pathname.startsWith('/_app/')) return true;
	return false;
}

function clientIp(headers: Headers, fallback: string): string {
	const forwarded = headers.get('x-forwarded-for');
	if (forwarded) {
		const first = forwarded.split(',')[0]?.trim();
		if (first) return first;
	}
	const real = headers.get('x-real-ip');
	if (real) return real;
	return fallback;
}

function safeClientAddress(event: { getClientAddress: () => string }): string {
	try {
		return event.getClientAddress();
	} catch {
		return 'prerender';
	}
}

const handleObservability: Handle = async ({ event, resolve }) => {
	const incoming = event.request.headers.get('x-request-id')?.trim();
	const reqId = incoming && incoming.length <= 64 ? incoming : ulid();
	event.locals.req_id = reqId;
	event.locals.logger = logger.child({ req_id: reqId });

	const start = performance.now();
	const path = event.url.pathname;
	const method = event.request.method;
	const skipAccessLog = isLowSignalPath(path);

	let response: Response;
	try {
		response = await resolve(event);
	} catch (err) {
		const duration_ms = Math.round(performance.now() - start);
		logError(event.locals.logger, err, {
			method,
			path,
			duration_ms,
			user_id: event.locals.user?.id,
			ip: clientIp(event.request.headers, safeClientAddress(event))
		});
		throw err;
	}

	response.headers.set('x-request-id', reqId);
	const duration_ms = Math.round(performance.now() - start);

	if (!skipAccessLog) {
		const fields = {
			method,
			path,
			status: response.status,
			duration_ms,
			user_id: event.locals.user?.id,
			ip: clientIp(event.request.headers, safeClientAddress(event))
		};
		if (response.status >= 500) {
			event.locals.logger.error(fields, 'request');
		} else if (response.status >= 400) {
			event.locals.logger.warn(fields, 'request');
		} else {
			event.locals.logger.info(fields, 'request');
		}
	}

	return response;
};

async function resolveSession(
	event: Parameters<Handle>[0]['event']
): Promise<Awaited<ReturnType<typeof auth.api.getSession>>> {
	try {
		return await auth.api.getSession({ headers: event.request.headers });
	} catch (err) {
		if (!isDbOptionalPath(event.url.pathname)) throw err;
		event.locals.logger.warn({ err }, 'session lookup failed; continuing without session');
		return null;
	}
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await resolveSession(event);

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(handleObservability, handleBetterAuth);

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const errorId = ulid();
	const log = event.locals?.logger ?? logger;
	logError(log, error, {
		error_id: errorId,
		status,
		method: event.request.method,
		path: event.url.pathname,
		route: event.route?.id,
		user_id: event.locals?.user?.id
	});
	return {
		message: status >= 500 ? 'Internal server error' : message,
		errorId
	};
};
