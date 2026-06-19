import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getTeamForUser } from '$lib/server/teams';
import { createWrkspaceFromTemplate, listWrkspaceTemplatesForTier } from '$lib/server/templates';
import { BLANK_WRKSPACE_TEMPLATE_ID } from '$lib/shared/templates';
import { getModuleCatalogEntry } from '$lib/shared/modules';
import { slugify } from '$lib/shared/slug';
import { getCommunityEffectiveTier } from '$lib/plan';

export const load: PageServerLoad = async ({ locals, params }) => {
	const team = await getTeamForUser(locals.user!.id, params.teamSlug);

	if (!team) {
		error(404, 'Team not found');
	}

	const effectiveTier = getCommunityEffectiveTier(team.subscriptionTier);
	const templates = listWrkspaceTemplatesForTier(effectiveTier).map((template) => ({
		id: template.id,
		name: template.name,
		description: template.description,
		includesSampleContent: template.includesSampleContent,
		moduleLabels: template.modules.map((mod) => getModuleCatalogEntry(mod.type).label)
	}));

	return { team: { ...team, subscriptionTier: effectiveTier }, templates };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';
		const description = formData.get('description')?.toString().trim() ?? '';
		const templateId = formData.get('templateId')?.toString() ?? BLANK_WRKSPACE_TEMPLATE_ID;

		if (!name) {
			return fail(400, { message: 'wrkspace name is required' });
		}

		const team = await getTeamForUser(locals.user!.id, params.teamSlug);
		if (!team) {
			return fail(404, { message: 'Team not found' });
		}

		const baseSlug = slugify(name) || `wrkspace-${Date.now()}`;
		const created = await createWrkspaceFromTemplate(
			locals.user!.id,
			params.teamSlug,
			{
				name,
				description: description || 'No description yet.',
				slug: baseSlug
			},
			templateId
		);

		if ('error' in created) {
			return fail(400, { message: created.error });
		}

		redirect(303, `/teams/${params.teamSlug}/wrkspaces/${created.slug}`);
	}
};
