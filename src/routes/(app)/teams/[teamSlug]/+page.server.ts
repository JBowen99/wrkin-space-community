import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getTeamCapabilities, getTeamMembership } from '$lib/server/authorization';
import { createWrkspaceForTeam, listWrkspacesForTeam } from '$lib/server/wrkspaces';
import { slugify } from '$lib/shared/slug';

export const load: PageServerLoad = async ({ locals, params }) => {
	const membership = await getTeamMembership(locals.user!.id, params.teamSlug);

	if (!membership) {
		error(404, 'Team not found');
	}

	const team = {
		id: membership.teamId,
		name: membership.teamName,
		slug: membership.teamSlug,
		subscriptionTier: membership.subscriptionTier
	};
	const capabilities = getTeamCapabilities(membership.role);

	const wrkspaces = await listWrkspacesForTeam(locals.user!.id, params.teamSlug);

	return { team, wrkspaces, capabilities };
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';

		if (!name) {
			return fail(400, { message: 'wrkspace name is required', planLimit: null });
		}

		const membership = await getTeamMembership(locals.user!.id, params.teamSlug);
		if (!membership) {
			return fail(404, { message: 'Team not found', planLimit: null });
		}

		const baseSlug = slugify(name) || `wrkspace-${Date.now()}`;
		const created = await createWrkspaceForTeam(locals.user!.id, params.teamSlug, {
			name,
			description: 'No description yet.',
			slug: baseSlug
		});

		if ('error' in created) {
			return fail(400, {
				message: created.error,
				planLimit: created.planLimit ?? null
			});
		}

		redirect(303, `/teams/${params.teamSlug}/wrkspaces/${created.slug}`);
	}
};
