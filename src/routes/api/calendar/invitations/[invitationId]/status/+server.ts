import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateEventInvitationStatus } from '$lib/server/calendar-invitations';
import type { CalendarInvitationStatus } from '$lib/server/calendar-invitations';

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const body = (await request.json()) as {
		eventId?: string;
		status?: string;
	};
	const { eventId, status } = body;

	if (!eventId || !status || !['accepted', 'declined'].includes(status)) {
		error(400, 'eventId and status ("accepted" or "declined") are required');
	}

	const ok = await updateEventInvitationStatus(
		locals.user.id,
		eventId,
		status as CalendarInvitationStatus
	);
	if (!ok) {
		error(404, 'Invitation not found');
	}

	return json({ ok: true });
};
