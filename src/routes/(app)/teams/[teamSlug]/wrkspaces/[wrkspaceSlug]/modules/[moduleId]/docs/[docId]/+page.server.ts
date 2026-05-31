import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getWrkspaceForUser } from '$lib/server/wrkspaces';
import { getDocPageForUser, updateDocPageTitle } from '$lib/server/docs';
import { getModuleForUser, moduleTypeLabel } from '$lib/server/modules';

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

	if (!module || module.type !== 'docs') {
		error(404, 'Module not found');
	}

	const doc = await getDocPageForUser(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.docId
	);

	if (!doc) {
		error(404, 'Document not found');
	}

	const moduleIndexUrl = `/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}/modules/${params.moduleId}`;

	return {
		wrkspace,
		module,
		doc,
		typeLabel: moduleTypeLabel(module.type),
		moduleIndexUrl,
		currentUser: {
			id: locals.user!.id,
			name: locals.user!.name,
			image: locals.user!.image
		}
	};
};

export const actions: Actions = {
	updateDocTitle: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString() ?? '';

		const ok = await updateDocPageTitle(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			params.docId,
			title
		);

		if (!ok) {
			return fail(400, { message: 'Could not update title' });
		}

		return { success: true };
	}
};
