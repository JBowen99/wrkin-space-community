import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchLinkPreview, parsePreviewUrl } from '$lib/server/link-preview';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const target = url.searchParams.get('url')?.trim() ?? '';
	if (!target) {
		error(400, 'url is required');
	}

	if (!parsePreviewUrl(target)) {
		error(400, 'Invalid or disallowed URL');
	}

	const preview = await fetchLinkPreview(target);
	if (!preview) {
		error(404, 'Preview unavailable');
	}

	return json(preview);
};
