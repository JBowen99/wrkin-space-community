import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addEventInvitations } from '$lib/server/calendar-invitations';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const body = (await request.json()) as { eventId?: string; userIds?: string[] };
	const { eventId, userIds } = body;

	if (!eventId || !Array.isArray(userIds)) {
		error(400, 'eventId and userIds are required');
	}

	const invitations = await addEventInvitations(eventId, userIds);
	return json(invitations);
};
