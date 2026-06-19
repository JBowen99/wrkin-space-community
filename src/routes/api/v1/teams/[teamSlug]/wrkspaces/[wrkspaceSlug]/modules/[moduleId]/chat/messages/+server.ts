import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiUser } from '$lib/server/api';
import { listChatMessages, addChatMessage } from '$lib/server/modules';

type SendMessageBody = {
	body?: unknown;
};

export const GET: RequestHandler = async ({ request, params, url }) => {
	const user = await requireApiUser(request);
	const q = url.searchParams.get('q') ?? undefined;
	const messages = await listChatMessages(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		{ q }
	);
	return json(
		messages.map((m) => ({
			id: m.id,
			body: m.body,
			authorName: m.authorName,
			createdAt: m.createdAt
		}))
	);
};

export const POST: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);

	let body: SendMessageBody;
	try {
		body = (await request.json()) as SendMessageBody;
	} catch {
		error(400, 'Invalid JSON body');
	}

	const messageBody = typeof body.body === 'string' ? body.body.trim() : '';
	if (!messageBody) error(400, 'body is required');

	const ok = await addChatMessage(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		messageBody
	);
	if (!ok) error(403, 'Could not send message');
	return json({ sent: true }, { status: 201 });
};
