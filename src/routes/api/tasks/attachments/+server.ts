import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addTaskAttachment } from '$lib/server/task-attachments';

export const POST: RequestHandler = async ({ locals, request, url }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const taskId = url.searchParams.get('taskId')?.trim() ?? '';
	if (!taskId) {
		error(400, 'taskId is required');
	}

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || file.size === 0) {
		error(400, 'file is required');
	}

	try {
		const result = await addTaskAttachment(locals.user.id, taskId, file);
		return json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Upload failed';
		if (message === 'Forbidden') {
			error(403, message);
		}
		error(400, message);
	}
};
