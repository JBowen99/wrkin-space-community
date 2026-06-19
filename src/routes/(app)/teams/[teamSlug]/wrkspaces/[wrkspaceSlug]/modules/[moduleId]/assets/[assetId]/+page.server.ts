import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getWrkspaceForUser } from '$lib/server/wrkspaces';
import { getModuleForUser } from '$lib/server/modules';
import { getAssetForUser } from '$lib/server/docs-library';

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
		error(404, 'module not found');
	}

	const asset = await getAssetForUser(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.assetId
	);

	if (!asset) {
		error(404, 'asset not found');
	}

	const modulePath = `/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}/modules/${params.moduleId}`;

	return {
		wrkspace,
		module,
		asset,
		modulePath,
		downloadUrl: `/api/docs/assets/${encodeURIComponent(asset.id)}`
	};
};
