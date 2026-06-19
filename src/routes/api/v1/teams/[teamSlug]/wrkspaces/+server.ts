import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiUser } from '$lib/server/api';
import { listWrkspacesForTeam } from '$lib/server/wrkspaces';

export const GET: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);
	const wrkspaces = await listWrkspacesForTeam(user.id, params.teamSlug);
	return json(
		wrkspaces.map((w) => ({
			id: w.id,
			name: w.name,
			slug: w.slug,
			description: w.description
		}))
	);
};
