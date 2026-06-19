import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiUser } from '$lib/server/api';
import { listForumThreads, createForumThread } from '$lib/server/forum';

type CreateThreadBody = {
	title?: unknown;
	body?: unknown;
};

export const GET: RequestHandler = async ({ request, params, url }) => {
	const user = await requireApiUser(request);
	const q = url.searchParams.get('q') ?? undefined;
	const page = await listForumThreads(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		{ q }
	);
	return json(
		page.threads.map((t) => ({
			id: t.id,
			title: t.title,
			authorName: t.authorName,
			replyCount: t.replyCount,
			excerpt: t.excerpt,
			updatedAt: t.updatedAt,
			closedAt: t.closedAt
		}))
	);
};

export const POST: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);

	let body: CreateThreadBody;
	try {
		body = (await request.json()) as CreateThreadBody;
	} catch {
		error(400, 'Invalid JSON body');
	}

	const title = typeof body.title === 'string' ? body.title.trim() : '';
	const postBody = typeof body.body === 'string' ? body.body.trim() : '';
	if (!title || !postBody) error(400, 'title and body are required');

	const id = await createForumThread(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		title,
		postBody
	);
	if (!id) error(403, 'Could not create thread');
	return json({ id }, { status: 201 });
};
