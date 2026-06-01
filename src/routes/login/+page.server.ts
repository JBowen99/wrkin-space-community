import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	AUTH_UNAVAILABLE_LOGIN,
	AUTH_UNAVAILABLE_SIGNUP,
	shouldLogAuthError,
	userFacingAuthError
} from '$lib/server/auth-errors';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) {
		redirect(302, '/teams');
	}
};

const LOGIN_ERRORS = {
	invalidCredentials: 'Invalid email or password',
	unavailable: AUTH_UNAVAILABLE_LOGIN
} as const;

const SIGNUP_ERRORS = {
	invalidCredentials: 'Could not create account',
	unavailable: AUTH_UNAVAILABLE_SIGNUP
} as const;

export const actions: Actions = {
	signInEmail: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		try {
			await auth.api.signInEmail({
				body: { email, password, callbackURL: '/teams' },
				headers: event.request.headers
			});
		} catch (error) {
			const message = userFacingAuthError(error, LOGIN_ERRORS);
			if (shouldLogAuthError(error, message, LOGIN_ERRORS)) {
				event.locals.logger.warn({ err: error }, 'sign-in failed');
			}
			return fail(400, {
				action: 'login',
				message
			});
		}

		redirect(302, '/teams');
	},
	signUpEmail: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString() ?? '';

		try {
			await auth.api.signUpEmail({
				body: { email, password, name, callbackURL: '/teams' },
				headers: event.request.headers
			});
		} catch (error) {
			const message = userFacingAuthError(error, SIGNUP_ERRORS);
			if (shouldLogAuthError(error, message, SIGNUP_ERRORS)) {
				event.locals.logger.warn({ err: error }, 'sign-up failed');
			}
			return fail(400, {
				action: 'signup',
				message
			});
		}

		redirect(302, '/teams');
	}
};
