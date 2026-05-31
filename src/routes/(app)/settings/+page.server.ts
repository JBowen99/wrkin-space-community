import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { listTeamsForUser } from '$lib/server/teams';

export const load: PageServerLoad = async ({ locals }) => {
	const teams = await listTeamsForUser(locals.user!.id);
	return { user: locals.user!, teams };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const name = (await request.formData()).get('name')?.toString().trim() ?? '';
		if (!name) {
			return fail(400, { message: 'Name is required' });
		}

		await db.update(user).set({ name }).where(eq(user.id, locals.user!.id));
		return { success: true };
	}
};
