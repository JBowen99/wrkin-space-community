import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { apiKey } from 'better-auth/plugins';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from './db/index.ts';
import * as schema from './db/schema.ts';

export type AuthEmailHookUser = {
	id: string;
	email: string;
	name: string;
	emailVerified: boolean;
	image?: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type AuthEmailHooks = {
	sendResetPassword?: (
		params: { user: AuthEmailHookUser; url: string; token: string },
		request?: Request
	) => Promise<void>;
	sendVerificationEmail?: (
		params: { user: AuthEmailHookUser; url: string; token: string },
		request?: Request
	) => Promise<void>;
};

export type AuthOptions = {
	emailHooks?: AuthEmailHooks;
	requireEmailVerification?: boolean;
	revokeSessionsOnPasswordReset?: boolean;
};

/** Better Auth needs an absolute base URL for links in emails (verify, reset). */
function resolveAuthBaseUrl(origin: string | undefined): string {
	const trimmed = origin?.trim().replace(/\/$/, '');
	return trimmed || 'http://localhost:5173';
}

export function createAuth(options?: AuthOptions) {
	const hooks = options?.emailHooks;
	const requireEmailVerification = options?.requireEmailVerification ?? false;
	const revokeSessionsOnPasswordReset = options?.revokeSessionsOnPasswordReset ?? false;

	return betterAuth({
		baseURL: resolveAuthBaseUrl(env.ORIGIN),
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(db, { provider: 'pg', schema }),
		emailVerification: hooks?.sendVerificationEmail
			? {
					sendOnSignUp: true,
					sendVerificationEmail: hooks.sendVerificationEmail
				}
			: undefined,
		emailAndPassword: {
			enabled: true,
			requireEmailVerification,
			revokeSessionsOnPasswordReset,
			sendResetPassword: hooks?.sendResetPassword
		},
		user: {
			additionalFields: {
				role: {
					type: 'string',
					required: false,
					defaultValue: 'user',
					input: false
				}
			}
		},
		plugins: [
			sveltekitCookies(getRequestEvent),
			apiKey({ rateLimit: { enabled: true, timeWindow: 24 * 60 * 60 * 1000, maxRequests: 100 } })
		]
	});
}

export type Auth = ReturnType<typeof createAuth>;
