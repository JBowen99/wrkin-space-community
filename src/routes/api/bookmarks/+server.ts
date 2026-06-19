import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	addBookmark,
	removeBookmarkByTarget,
	listBookmarks,
	getBookmarkByTarget
} from '$lib/server/bookmarks';
import type { BookmarkTargetType } from '$lib/shared/bookmarks';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const wrkspaceId = url.searchParams.get('wrkspaceId');
	const bookmarks = await listBookmarks(locals.user.id, {
		wrkspaceId: wrkspaceId || undefined,
		limit: 100
	});

	return json({ bookmarks });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json()) as {
		teamSlug: string;
		wrkspaceSlug: string;
		moduleId?: string | null;
		moduleType: string;
		targetType: BookmarkTargetType;
		targetId: string;
		contextId?: string | null;
		label: string;
	};

	if (!body.teamSlug || !body.wrkspaceSlug || !body.targetType || !body.targetId || !body.label) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	const existing = await getBookmarkByTarget(locals.user.id, body.targetType, body.targetId);
	if (existing) {
		return json({ bookmark: existing });
	}

	const bm = await addBookmark(locals.user.id, body.teamSlug, body.wrkspaceSlug, {
		moduleId: body.moduleId ?? null,
		moduleType: body.moduleType,
		targetType: body.targetType,
		targetId: body.targetId,
		contextId: body.contextId ?? null,
		label: body.label
	});

	if (!bm) {
		return json({ error: 'Failed to create bookmark' }, { status: 500 });
	}

	return json({ bookmark: bm }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json()) as {
		targetType: BookmarkTargetType;
		targetId: string;
	};

	if (!body.targetType || !body.targetId) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	const ok = await removeBookmarkByTarget(locals.user.id, body.targetType, body.targetId);
	return json({ ok });
};
