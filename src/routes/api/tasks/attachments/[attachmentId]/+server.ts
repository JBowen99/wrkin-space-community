import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteTaskAttachment } from '$lib/server/task-attachments';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const { attachmentId } = params;
	const ok = await deleteTaskAttachment(locals.user.id, attachmentId);
	if (!ok) {
		error(404, 'Not found');
	}

	return json({ ok: true });
};
