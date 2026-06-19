import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getTeamCapabilities, getTeamMembership } from '$lib/server/authorization';
import { listWrkspacesForTeam } from '$lib/server/wrkspaces';
import { createWrkspaceFromTemplate, listWrkspaceTemplatesForTier } from '$lib/server/templates';
import { BLANK_WRKSPACE_TEMPLATE_ID } from '$lib/shared/templates';
import { getModuleCatalogEntry } from '$lib/shared/modules';
import { slugify } from '$lib/shared/slug';
import { getCommunityEffectiveTier } from '$lib/plan';

export const load: PageServerLoad = async ({ locals, params }) => {
	const membership = await getTeamMembership(locals.user!.id, params.teamSlug);

	if (!membership) {
		error(404, 'Team not found');
	}

	const effectiveTier = getCommunityEffectiveTier(membership.subscriptionTier);
	const team = {
		id: membership.teamId,
		name: membership.teamName,
		slug: membership.teamSlug,
		subscriptionTier: effectiveTier
	};
	const capabilities = getTeamCapabilities(membership.role);

	const wrkspaces = await listWrkspacesForTeam(locals.user!.id, params.teamSlug);

	const templates = listWrkspaceTemplatesForTier(effectiveTier).map((template) => ({
		id: template.id,
		name: template.name,
		description: template.description,
		includesSampleContent: template.includesSampleContent,
		moduleLabels: template.modules.map((mod) => getModuleCatalogEntry(mod.type).label)
	}));

	return { team, wrkspaces, capabilities, templates };
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';
		const templateId = formData.get('templateId')?.toString() ?? BLANK_WRKSPACE_TEMPLATE_ID;

		if (!name) {
			return fail(400, { message: 'wrkspace name is required', planLimit: null });
		}

		const membership = await getTeamMembership(locals.user!.id, params.teamSlug);
		if (!membership) {
			return fail(404, { message: 'Team not found', planLimit: null });
		}

		const baseSlug = slugify(name) || `wrkspace-${Date.now()}`;
		const created = await createWrkspaceFromTemplate(
			locals.user!.id,
			params.teamSlug,
			{
				name,
				description: 'No description yet.',
				slug: baseSlug
			},
			templateId
		);

		if ('error' in created) {
			return fail(400, {
				message: created.error,
				planLimit: created.planLimit ?? null
			});
		}

		redirect(303, `/teams/${params.teamSlug}/wrkspaces/${created.slug}`);
	}
};
