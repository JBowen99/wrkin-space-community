import { describe, expect, it } from 'vitest';
import { APIError } from 'better-auth/api';
import {
	AUTH_UNAVAILABLE_LOGIN,
	isAuthServiceUnavailable,
	userFacingAuthError
} from './auth-errors';

const loginOptions = {
	invalidCredentials: 'Invalid email or password',
	unavailable: AUTH_UNAVAILABLE_LOGIN
};

describe('isAuthServiceUnavailable', () => {
	it('detects drizzle query failures', () => {
		const error = new APIError('INTERNAL_SERVER_ERROR', {
			message:
				'Failed query: select "id" from "user" where "user"."email" = $1 params: test@wrkin.local'
		});
		expect(isAuthServiceUnavailable(error)).toBe(true);
	});

	it('detects connection errors on Error.cause chain', () => {
		const error = new Error('Failed query', {
			cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
		});
		expect(isAuthServiceUnavailable(error)).toBe(true);
	});
});

describe('userFacingAuthError', () => {
	it('returns unavailable message for SQL leak errors', () => {
		const error = new APIError('INTERNAL_SERVER_ERROR', {
			message:
				'Failed query: select "id", "name" from "user" where "user"."email" = $1 params: test@wrkin.local'
		});
		expect(userFacingAuthError(error, loginOptions)).toBe(AUTH_UNAVAILABLE_LOGIN);
	});

	it('returns unavailable for generic connection errors', () => {
		expect(
			userFacingAuthError(new Error('connect ECONNREFUSED 127.0.0.1:5432'), loginOptions)
		).toBe(AUTH_UNAVAILABLE_LOGIN);
	});

	it('returns unavailable for 5xx APIError', () => {
		const error = new APIError('INTERNAL_SERVER_ERROR', { message: 'Something broke' });
		expect(userFacingAuthError(error, loginOptions)).toBe(AUTH_UNAVAILABLE_LOGIN);
	});

	it('passes through short, safe 4xx APIError messages', () => {
		const error = new APIError('UNAUTHORIZED', { message: 'Invalid email or password' });
		expect(userFacingAuthError(error, loginOptions)).toBe('Invalid email or password');
	});
});
