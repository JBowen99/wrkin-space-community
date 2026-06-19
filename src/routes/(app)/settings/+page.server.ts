import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { listTeamsForUser } from '$lib/server/teams';
import { userHasCredentialAccount, changePassword } from '$lib/server';

export const load: PageServerLoad = async ({ locals }) => {
	const teams = await listTeamsForUser(locals.user!.id);
	const hasCredentialAccount = await userHasCredentialAccount(locals.user!.id);
	return { user: locals.user!, teams, hasCredentialAccount };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const name = (await request.formData()).get('name')?.toString().trim() ?? '';
		if (!name) {
			return fail(400, { message: 'Name is required' });
		}

		await db.update(user).set({ name }).where(eq(user.id, locals.user!.id));
		return { success: true };
	},
	changePassword: async ({ request, locals }) => {
		const formData = await request.formData();
		const result = await changePassword({
			currentPassword: formData.get('currentPassword')?.toString() ?? '',
			newPassword: formData.get('newPassword')?.toString() ?? '',
			confirmPassword: formData.get('confirmPassword')?.toString() ?? '',
			headers: request.headers,
			logger: locals.logger
		});

		if (!result.success) {
			return fail(400, { passwordError: result.error });
		}

		return { passwordSuccess: true };
	}
};
