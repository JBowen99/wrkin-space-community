import { APIError } from 'better-auth/api';

export const AUTH_UNAVAILABLE_LOGIN =
	"We can't sign you in right now. Please try again in a few minutes.";
export const AUTH_UNAVAILABLE_SIGNUP =
	"We can't create your account right now. Please try again in a few minutes.";

export const EMAIL_NOT_VERIFIED_MESSAGE =
	'Verify your email before signing in. We sent a link when you signed up — check your inbox, or resend below.';

export function isEmailNotVerifiedError(error: unknown): boolean {
	for (const message of collectErrorMessages(error)) {
		if (/EMAIL_NOT_VERIFIED|email not verified/i.test(message)) {
			return true;
		}
	}
	if (error instanceof APIError) {
		const status = error.statusCode ?? error.status;
		if (status === 403) {
			const message = error.message?.trim() ?? '';
			if (/verify|verified/i.test(message)) return true;
		}
	}
	return false;
}

/** Messages that indicate infra/DB failure — never show raw text, use unavailable copy instead. */
const INTERNAL_AUTH_MESSAGE =
	/failed query|ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|connect\s+ECONN|connection refused|connection terminated|timeout expired|DATABASE_URL|postgres|drizzle|syntax error at|relation\s+.+\s+does not exist|\bparams:\s/i;

const INFRA_ERROR_CODES = new Set([
	'ECONNREFUSED',
	'ECONNRESET',
	'ENOTFOUND',
	'ETIMEDOUT',
	'EHOSTUNREACH',
	'ENETUNREACH'
]);

export type AuthFormErrorOptions = {
	/** Shown for wrong credentials or other expected auth rejections. */
	invalidCredentials: string;
	/** Shown when sign-in/sign-up cannot reach the database or auth backend. */
	unavailable: string;
};

function collectErrorMessages(error: unknown): string[] {
	const messages: string[] = [];
	const seen = new Set<unknown>();
	let current: unknown = error;

	while (current != null && !seen.has(current)) {
		seen.add(current);

		if (current instanceof Error) {
			if (current.message) messages.push(current.message);
			const code = (current as NodeJS.ErrnoException).code;
			if (typeof code === 'string') messages.push(code);
			current = current.cause;
			continue;
		}

		if (typeof current === 'object' && 'message' in current) {
			const message = (current as { message?: unknown }).message;
			if (typeof message === 'string') messages.push(message);
		}
		break;
	}

	return messages;
}

export function isAuthServiceUnavailable(error: unknown): boolean {
	for (const message of collectErrorMessages(error)) {
		if (INTERNAL_AUTH_MESSAGE.test(message)) return true;
		if (INFRA_ERROR_CODES.has(message)) return true;
	}
	return false;
}

function isUserSafeAuthMessage(message: string): boolean {
	const trimmed = message.trim();
	if (!trimmed || trimmed.length > 200) return false;
	if (INTERNAL_AUTH_MESSAGE.test(trimmed)) return false;
	if (/^\s*select\s+/i.test(trimmed)) return false;
	if (trimmed.includes('"') && /\bfrom\b/i.test(trimmed)) return false;
	return true;
}

/** Map auth failures to short, safe copy for forms — never leak SQL or stack details. */
export function userFacingAuthError(error: unknown, options: AuthFormErrorOptions): string {
	if (isAuthServiceUnavailable(error)) {
		return options.unavailable;
	}

	if (error instanceof APIError) {
		const status = error.statusCode ?? error.status;
		if (typeof status === 'number' && status >= 500) {
			return options.unavailable;
		}

		const message = error.message?.trim();
		if (message && isUserSafeAuthMessage(message)) {
			return message;
		}
	}

	return options.invalidCredentials;
}

export function shouldLogAuthError(
	error: unknown,
	displayedMessage: string,
	options: AuthFormErrorOptions
): boolean {
	if (!error) return false;
	const expected = [options.invalidCredentials, options.unavailable];
	return expected.includes(displayedMessage);
}
