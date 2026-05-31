import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChatAttachmentForUser } from '$lib/server/chat-attachments';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const { messageId, attachmentId } = params;
	const result = await getChatAttachmentForUser(locals.user.id, messageId, attachmentId);
	if (!result) {
		error(404, 'Not found');
	}

	return new Response(new Uint8Array(result.body), {
		headers: {
			'Content-Type': result.row.mimeType,
			'Content-Disposition': `inline; filename="${encodeURIComponent(result.row.originalName)}"`,
			'Cache-Control': 'private, max-age=3600'
		}
	});
};
