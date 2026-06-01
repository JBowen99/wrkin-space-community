import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listTeamsForUser, createTeamForUser } from '$lib/server/teams';

export const load: PageServerLoad = async ({ locals }) => {
	const teams = await listTeamsForUser(locals.user!.id);
	return { teams };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';

		if (!name) {
			return fail(400, { message: 'Team name is required' });
		}

		const created = await createTeamForUser(locals.user!.id, { name });
		redirect(303, `/teams/${created.slug}`);
	}
};
