import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { userCanViewDoc } from '$lib/server/docs';
import { readDocImage } from '$lib/server/doc-uploads';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const { docId, filename } = params;
	const allowed = await userCanViewDoc(locals.user.id, docId);
	if (!allowed) {
		error(403, 'Forbidden');
	}

	try {
		const { body, contentType } = await readDocImage(docId, filename);
		return new Response(new Uint8Array(body), {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=3600'
			}
		});
	} catch {
		error(404, 'Not found');
	}
};
