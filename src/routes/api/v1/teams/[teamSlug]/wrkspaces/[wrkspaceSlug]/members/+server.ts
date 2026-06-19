import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiUser } from '$lib/server/api';
import { listTeamMembersForWrkspace } from '$lib/server/tasks';

export const GET: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);
	const members = await listTeamMembersForWrkspace(user.id, params.teamSlug, params.wrkspaceSlug);
	return json(members.map((m) => ({ id: m.id, name: m.name })));
};
