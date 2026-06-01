import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { userCanAccessDoc } from '$lib/server/docs';
import { saveDocImage } from '$lib/server/doc-uploads';

export const POST: RequestHandler = async ({ locals, request, url }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const docId = url.searchParams.get('docId')?.trim() ?? '';
	if (!docId) {
		error(400, 'docId is required');
	}

	const allowed = await userCanAccessDoc(locals.user.id, docId);
	if (!allowed) {
		error(403, 'Forbidden');
	}

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || file.size === 0) {
		error(400, 'file is required');
	}

	try {
		const result = await saveDocImage(docId, file);
		return json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Upload failed';
		error(400, message);
	}
};
