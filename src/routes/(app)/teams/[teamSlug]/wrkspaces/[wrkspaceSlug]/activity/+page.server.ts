import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getWrkspaceAccess, getWrkspaceCapabilitiesForAccess } from '$lib/server/authorization';
import { listWrkspaceActivity } from '$lib/server/activity';
import { getWrkspaceWithDescription } from '$lib/server/wrkspaces';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const access = await getWrkspaceAccess(locals.user!.id, params.teamSlug, params.wrkspaceSlug);
	if (!access) {
		error(404, 'wrkspace not found');
	}

	const wrkspace = await getWrkspaceWithDescription(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug
	);
	if (!wrkspace) {
		error(404, 'wrkspace not found');
	}

	const cursorParam = url.searchParams.get('cursor');
	const moduleType = url.searchParams.get('moduleType');
	const cursor = cursorParam ? new Date(cursorParam) : undefined;

	const { events, nextCursor } = await listWrkspaceActivity(access.wrkspaceId, {
		limit: 30,
		cursor: cursor && !Number.isNaN(cursor.getTime()) ? cursor : undefined,
		moduleType: moduleType || null
	});

	return {
		wrkspace,
		capabilities: getWrkspaceCapabilitiesForAccess(access),
		events: events.map((e) => ({
			...e,
			createdAt: e.createdAt.toISOString()
		})),
		nextCursor: nextCursor?.toISOString() ?? null,
		moduleTypeFilter: moduleType
	};
};
