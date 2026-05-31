import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { listTeamsForUser } from '$lib/server/teams';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	try {
		const teams = await listTeamsForUser(locals.user.id);
		return { user: locals.user, teams };
	} catch {
		return { user: locals.user, teams: [] };
	}
};
