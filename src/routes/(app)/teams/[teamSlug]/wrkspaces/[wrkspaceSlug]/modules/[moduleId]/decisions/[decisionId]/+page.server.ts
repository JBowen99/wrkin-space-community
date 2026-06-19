import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getWrkspaceForUser } from '$lib/server/wrkspaces';
import { getModuleForUser } from '$lib/server/modules';
import { getDecision } from '$lib/server/decisions';

export const load: PageServerLoad = async ({ locals, params }) => {
	const wrkspace = await getWrkspaceForUser(locals.user!.id, params.teamSlug, params.wrkspaceSlug);
	if (!wrkspace) {
		error(404, 'wrkspace not found');
	}

	const module = await getModuleForUser(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId
	);

	if (!module || module.type !== 'decisions') {
		error(404, 'Module not found');
	}

	const decision = await getDecision(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.decisionId
	);

	if (!decision) {
		error(404, 'Decision not found');
	}

	redirect(
		303,
		`/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}/modules/${params.moduleId}?decision=${params.decisionId}`
	);
};
