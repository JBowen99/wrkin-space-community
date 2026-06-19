import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiUser } from '$lib/server/api';
import { listModulesWithPreviews } from '$lib/server/modules';

export const GET: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);
	const modules = await listModulesWithPreviews(user.id, params.teamSlug, params.wrkspaceSlug);
	return json(
		modules.map((m) => ({
			id: m.id,
			type: m.type,
			title: m.title,
			position: m.position
		}))
	);
};
