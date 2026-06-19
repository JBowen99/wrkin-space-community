import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	AUTH_UNAVAILABLE_SIGNUP,
	shouldLogAuthError,
	userFacingAuthError
} from '$lib/server/auth-errors';
import { auth } from '$lib/server/auth';
import { hasAnyAdmin, promoteToAdmin } from '$lib/server/admin';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	if (await hasAnyAdmin()) {
		redirect(302, '/login');
	}
};

const SETUP_ERRORS = {
	invalidCredentials: 'Could not create admin account',
	unavailable: AUTH_UNAVAILABLE_SIGNUP
} as const;

export const actions: Actions = {
	createAdmin: async (event) => {
		if (await hasAnyAdmin()) {
			redirect(302, '/login');
		}

		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString() ?? '';

		try {
			await auth.api.signUpEmail({
				body: { email, password, name, callbackURL: '/teams' },
				headers: event.request.headers
			});
		} catch (err) {
			const message = userFacingAuthError(err, SETUP_ERRORS);
			if (shouldLogAuthError(err, message, SETUP_ERRORS)) {
				event.locals.logger.warn({ err }, 'admin setup sign-up failed');
			}
			return fail(400, { message });
		}

		const [newUser] = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, email))
			.limit(1);

		if (newUser) {
			await promoteToAdmin(newUser.id);
		}

		redirect(302, '/teams');
	}
};
