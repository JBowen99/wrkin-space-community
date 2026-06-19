import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteTeamForUser, updateTeamForUser } from '$lib/server/teams';

export const load: PageServerLoad = async () => ({});

export const actions: Actions = {
	updateTeam: async ({ request, locals, params }) => {
		const name = (await request.formData()).get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Team name is required' });

		const ok = await updateTeamForUser(locals.user!.id, params.teamSlug, { name });
		if (!ok) return fail(403, { message: 'You cannot edit this team' });

		return { success: true };
	},

	deleteTeam: async ({ locals, params }) => {
		const ok = await deleteTeamForUser(locals.user!.id, params.teamSlug);
		if (!ok) return fail(403, { message: 'Only the team owner can delete the team' });

		redirect(303, '/teams');
	}
};
