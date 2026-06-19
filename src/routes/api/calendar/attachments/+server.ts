import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addCalendarEventAttachment } from '$lib/server/calendar-attachments';

export const POST: RequestHandler = async ({ locals, request, url }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const eventId = url.searchParams.get('eventId')?.trim() ?? '';
	if (!eventId) {
		error(400, 'eventId is required');
	}

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || file.size === 0) {
		error(400, 'file is required');
	}

	try {
		const result = await addCalendarEventAttachment(locals.user.id, eventId, file);
		return json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Upload failed';
		if (message === 'Forbidden') {
			error(403, message);
		}
		error(400, message);
	}
};
