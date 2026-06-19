import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDocAssetTextPreviewForUser } from '$lib/server/docs-library';
import { getModuleForUser } from '$lib/server/modules';
import { db } from '$lib/server/db';
import { docAsset, team, wrkspace, wrkspaceModule } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const assetId = params.assetId?.trim() ?? '';
	if (!assetId) {
		error(400, 'assetId is required');
	}

	const rows = await db
		.select({
			moduleId: docAsset.moduleId,
			teamSlug: team.slug,
			wrkspaceSlug: wrkspace.slug
		})
		.from(docAsset)
		.innerJoin(wrkspaceModule, eq(docAsset.moduleId, wrkspaceModule.id))
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(docAsset.id, assetId))
		.limit(1);

	const row = rows[0];
	if (!row) {
		error(404, 'Not found');
	}

	const mod = await getModuleForUser(locals.user.id, row.teamSlug, row.wrkspaceSlug, row.moduleId);
	if (!mod || mod.type !== 'docs') {
		error(403, 'Forbidden');
	}

	const text = await getDocAssetTextPreviewForUser(
		locals.user.id,
		row.teamSlug,
		row.wrkspaceSlug,
		row.moduleId,
		assetId
	);

	if (!text) {
		error(404, 'Preview not available');
	}

	return json(
		{ text },
		{
			headers: {
				'Cache-Control': 'private, max-age=300'
			}
		}
	);
};
