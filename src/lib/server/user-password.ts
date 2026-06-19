import { and, eq } from 'drizzle-orm';
import { auth } from './auth.ts';
import { db } from './db/index.ts';
import { account } from './db/schema.ts';
import { shouldLogAuthError, userFacingAuthError, type AuthFormErrorOptions } from './auth-errors.ts';
import type { Logger } from './logger.ts';

const PASSWORD_ERRORS: AuthFormErrorOptions = {
	invalidCredentials: 'Current password is incorrect',
	unavailable: 'Could not update password right now. Please try again later.'
};

export async function userHasCredentialAccount(userId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: account.id })
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
		.limit(1);
	return !!row;
}

export type ChangePasswordResult = { success: true } | { success: false; error: string };

export async function changePassword(opts: {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
	headers: Headers;
	logger?: Logger;
}): Promise<ChangePasswordResult> {
	const { currentPassword, newPassword, confirmPassword, headers, logger } = opts;

	if (!currentPassword || !newPassword || !confirmPassword) {
		return { success: false, error: 'All fields are required.' };
	}

	if (newPassword.length < 8) {
		return { success: false, error: 'New password must be at least 8 characters.' };
	}

	if (newPassword !== confirmPassword) {
		return { success: false, error: 'New passwords do not match.' };
	}

	try {
		await auth.api.changePassword({
			body: { currentPassword, newPassword, revokeOtherSessions: true },
			headers
		});
	} catch (error) {
		const message = userFacingAuthError(error, PASSWORD_ERRORS);
		if (shouldLogAuthError(error, message, PASSWORD_ERRORS)) {
			logger?.warn({ err: error }, 'password change failed');
		}
		return { success: false, error: message };
	}

	return { success: true };
}
