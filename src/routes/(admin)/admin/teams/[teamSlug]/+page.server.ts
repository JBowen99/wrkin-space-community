import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getTeamById,
	listAllWrkspacesForTeam,
	adminDeleteTeam,
	adminDeleteWrkspace
} from '$lib/server/admin';

export const load: PageServerLoad = async ({ params }) => {
	const team = await getTeamById(params.teamSlug);

	if (!team) {
		redirect(302, '/admin/teams');
	}

	const wrkspaces = await listAllWrkspacesForTeam(team.id);

	return {
		team: {
			...team,
			createdAt: team.createdAt.toISOString()
		},
		wrkspaces: wrkspaces.map((w) => ({
			...w,
			createdAt: w.createdAt.toISOString()
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
			redirect(302, '/admin/teams');
		} catch (err) {
			if (err instanceof Response) throw err;
			event.locals.logger.warn({ err, teamId }, 'admin team delete failed');
			return fail(500, { message: 'Failed to delete team' });
		}
	},
	deleteWrkspace: async (event) => {
		const formData = await event.request.formData();
		const wrkspaceId = formData.get('wrkspaceId')?.toString();

		if (!wrkspaceId) return fail(400, { message: 'Wrkspace ID is required' });

		try {
			await adminDeleteWrkspace(wrkspaceId);
			return { success: true as const };
		} catch (err) {
			event.locals.logger.warn({ err, wrkspaceId }, 'admin wrkspace delete failed');
			return fail(500, { message: 'Failed to delete wrkspace' });
		}
	}
};
