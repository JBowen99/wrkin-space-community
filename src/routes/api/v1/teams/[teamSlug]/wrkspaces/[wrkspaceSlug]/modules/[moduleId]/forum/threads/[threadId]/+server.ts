import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireApiUser } from '$lib/server/api';
import { getForumThread, listForumPosts, createForumPost } from '$lib/server/forum';

type CreatePostBody = {
	body?: unknown;
	parentId?: unknown;
};

export const GET: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);
	const thread = await getForumThread(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.threadId
	);
	if (!thread) error(404, 'Thread not found');

	const posts = await listForumPosts(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.threadId
	);

	return json({
		id: thread.id,
		title: thread.title,
		authorName: thread.authorName,
		createdAt: thread.createdAt,
		updatedAt: thread.updatedAt,
		closedAt: thread.closedAt,
		posts: posts.map((p) => ({
			id: p.id,
			authorName: p.authorName,
			body: p.body,
			parentId: p.parentId,
			createdAt: p.createdAt
		}))
	});
};

export const POST: RequestHandler = async ({ request, params }) => {
	const user = await requireApiUser(request);

	let body: CreatePostBody;
	try {
		body = (await request.json()) as CreatePostBody;
	} catch {
		error(400, 'Invalid JSON body');
	}

	const postBody = typeof body.body === 'string' ? body.body.trim() : '';
	if (!postBody) error(400, 'body is required');
	const parentId = typeof body.parentId === 'string' && body.parentId ? body.parentId : null;

	const ok = await createForumPost(
		user.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.threadId,
		postBody,
		parentId
	);
	if (!ok) error(403, 'Could not create post (thread closed, not found, or no access)');
	return json({ threadId: params.threadId, created: true }, { status: 201 });
};
