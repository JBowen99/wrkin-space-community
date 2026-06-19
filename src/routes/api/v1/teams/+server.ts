import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiUser } from '$lib/server/api';
import { listTeamsForUser } from '$lib/server/teams';

export const GET: RequestHandler = async ({ request }) => {
	const user = await requireApiUser(request);
	const teams = await listTeamsForUser(user.id);
	return json(
		teams.map((t) => ({
			id: t.id,
			name: t.name,
			slug: t.slug,
			subscriptionTier: t.subscriptionTier,
			role: t.role
		}))
	);
};
