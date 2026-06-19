import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteWrkspaceForUser, getWrkspaceWithDescription } from '$lib/server/wrkspaces';
import { getWrkspaceCapabilitiesForAccess, getWrkspaceAccess } from '$lib/server/authorization';
import {
	deleteModule,
	listModulesWithPreviews,
	reorderModule,
	updateModuleTitle
} from '$lib/server/modules';
import { addModuleWithTemplate } from '$lib/server/templates';
import { listWrkspaceActivity } from '$lib/server/activity';
import { getModuleCatalogEntry } from '$lib/shared/modules';
import { isCommunityModuleType } from '$lib/modules';

export const load: PageServerLoad = async ({ locals, params }) => {
	const wrkspace = await getWrkspaceWithDescription(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug
	);

	if (!wrkspace) {
		error(404, 'wrkspace not found');
	}

	const access = await getWrkspaceAccess(locals.user!.id, params.teamSlug, params.wrkspaceSlug);
	const capabilities = access ? getWrkspaceCapabilitiesForAccess(access) : null;

	const modules = await listModulesWithPreviews(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug
	);

	const { events: recentActivity } = await listWrkspaceActivity(wrkspace.id, { limit: 10 });

	return {
		wrkspace,
		modules,
		capabilities,
		recentActivity: recentActivity.map((e) => ({
			...e,
			createdAt: e.createdAt.toISOString()
		}))
	};
};

export const actions: Actions = {
	addModule: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const type = formData.get('type')?.toString() ?? '';

		if (!isCommunityModuleType(type)) {
			return fail(400, { message: 'Invalid module type' });
		}

		const entry = getModuleCatalogEntry(type);
		if (!entry.enabled) {
			return fail(400, { message: 'Module type is not available yet' });
		}

		const created = await addModuleWithTemplate(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			type
		);

		if (!created) {
			return fail(403, { message: 'Could not add module' });
		}
		if ('error' in created) {
			return fail(400, {
				message: created.error,
				planLimit: created.planLimit ?? null
			});
		}

		return { success: true };
	},

	reorderModule: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const moduleId = formData.get('moduleId')?.toString() ?? '';
		const positionStr = formData.get('position')?.toString() ?? '';
		const position = Number.parseInt(positionStr, 10);

		if (!moduleId || Number.isNaN(position)) {
			return fail(400, { message: 'Invalid reorder request' });
		}

		const ok = await reorderModule(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			moduleId,
			position
		);

		if (!ok) {
			return fail(403, { message: 'Could not reorder module' });
		}

		return { success: true };
	},

	deleteModule: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const moduleId = formData.get('moduleId')?.toString() ?? '';

		if (!moduleId) {
			return fail(400, { message: 'Invalid delete request' });
		}

		const ok = await deleteModule(locals.user!.id, params.teamSlug, params.wrkspaceSlug, moduleId);

		if (!ok) {
			return fail(403, { message: 'Could not delete module' });
		}

		return { success: true };
	},

	updateModuleTitle: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const moduleId = formData.get('moduleId')?.toString() ?? '';
		const title = formData.get('title')?.toString() ?? '';

		if (!moduleId) {
			return fail(400, { message: 'Invalid module' });
		}

		const ok = await updateModuleTitle(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			moduleId,
			title
		);

		if (!ok) {
			return fail(400, { message: 'Could not update title' });
		}

		return { success: true };
	},

	deleteWrkspace: async ({ locals, params }) => {
		const ok = await deleteWrkspaceForUser(locals.user!.id, params.teamSlug, params.wrkspaceSlug);

		if (!ok) {
			return fail(403, { message: 'Could not delete wrkspace' });
		}

		redirect(303, `/teams/${params.teamSlug}`);
	}
};
