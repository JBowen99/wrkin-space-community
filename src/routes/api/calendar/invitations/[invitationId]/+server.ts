import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeEventInvitation } from '$lib/server/calendar-invitations';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const { invitationId } = params;
	const ok = await removeEventInvitation(invitationId);
	if (!ok) {
		error(404, 'Not found');
	}

	return json({ ok: true });
};
