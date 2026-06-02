import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listAllTeamsWithDetails, adminDeleteTeam } from '$lib/server/admin';

export const load: PageServerLoad = async () => {
	const teams = await listAllTeamsWithDetails();

	return {
		teams: teams.map((t) => ({
			...t,
			createdAt: t.createdAt.toISOString()
		}))
	};
};

export const actions: Actions = {
	deleteTeam: async (event) => {
		const formData = await event.request.formData();
		const teamId = formData.get('teamId')?.toString();

		if (!teamId) return fail(400, { message: 'Team ID is required' });

		try {
			await adminDeleteTeam(teamId);
			return { success: true as const };
		} catch (err) {
			event.locals.logger.warn({ err, teamId }, 'admin team delete failed');
			return fail(500, { message: 'Failed to delete team' });
		}
	}
};
