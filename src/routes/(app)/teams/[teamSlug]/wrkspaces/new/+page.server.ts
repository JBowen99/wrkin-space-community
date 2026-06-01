import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getTeamForUser } from '$lib/server/teams';
import { createWrkspaceForTeam } from '$lib/server/wrkspaces';
import { slugify } from '$lib/shared/slug';

export const load: PageServerLoad = async ({ locals, params }) => {
	const team = await getTeamForUser(locals.user!.id, params.teamSlug);

	if (!team) {
		error(404, 'Team not found');
	}

	return { team };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';
		const description = formData.get('description')?.toString().trim() ?? '';

		if (!name) {
			return fail(400, { message: 'wrkspace name is required' });
		}

		const team = await getTeamForUser(locals.user!.id, params.teamSlug);
		if (!team) {
			return fail(404, { message: 'Team not found' });
		}

		const baseSlug = slugify(name) || `wrkspace-${Date.now()}`;
		const created = await createWrkspaceForTeam(locals.user!.id, params.teamSlug, {
			name,
			description: description || 'No description yet.',
			slug: baseSlug
		});

		if ('error' in created) {
			return fail(400, { message: created.error });
		}

		redirect(303, `/teams/${params.teamSlug}/wrkspaces/${created.slug}`);
	}
};
