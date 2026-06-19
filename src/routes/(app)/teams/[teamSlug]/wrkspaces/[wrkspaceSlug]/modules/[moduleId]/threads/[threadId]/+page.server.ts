import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getWrkspaceForUser } from '$lib/server/wrkspaces';
import { isWrkspaceAdminOrOwner } from '$lib/shared/roles';
import { getWrkspaceAccess } from '$lib/server/authorization';
import {
	buildPostTree,
	closeForumThread,
	createForumPost,
	getForumThread,
	listForumPosts
} from '$lib/server/forum';
import { getModuleForUser, moduleTypeLabel } from '$lib/server/modules';
import { listBookmarks } from '$lib/server/bookmarks';

export const load: PageServerLoad = async ({ locals, params }) => {
	const wrkspace = await getWrkspaceForUser(locals.user!.id, params.teamSlug, params.wrkspaceSlug);

	if (!wrkspace) {
		error(404, 'wrkspace not found');
	}

	const module = await getModuleForUser(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId
	);

	if (!module || module.type !== 'forum') {
		error(404, 'Module not found');
	}

	const thread = await getForumThread(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.threadId
	);

	if (!thread) {
		error(404, 'Thread not found');
	}

	const posts = await listForumPosts(
		locals.user!.id,
		params.teamSlug,
		params.wrkspaceSlug,
		params.moduleId,
		params.threadId
	);

	const moduleIndexUrl = `/teams/${params.teamSlug}/wrkspaces/${params.wrkspaceSlug}/modules/${params.moduleId}`;

	const access = await getWrkspaceAccess(locals.user!.id, params.teamSlug, params.wrkspaceSlug);
	const isWrkspaceAdmin = access ? isWrkspaceAdminOrOwner(access.effectiveWrkspaceRole) : false;
	const canClose = !thread.closedAt && (thread.authorId === locals.user!.id || isWrkspaceAdmin);

	const bookmarks = await listBookmarks(locals.user!.id, { wrkspaceId: wrkspace.id });
	const bookmarkedIds = bookmarks
		.filter((b) => b.moduleId === params.moduleId)
		.map((b) => b.targetId);

	return {
		wrkspace,
		module,
		thread,
		postTree: buildPostTree(posts),
		typeLabel: moduleTypeLabel(module.type),
		moduleIndexUrl,
		currentUserId: locals.user!.id,
		canClose,
		bookmarkedIds
	};
};

export const actions: Actions = {
	createPost: async ({ request, locals, params }) => {
		const formData = await request.formData();
		const body = formData.get('body')?.toString() ?? '';
		const parentIdRaw = formData.get('parentId')?.toString() ?? '';
		const parentId = parentIdRaw || null;
		const files = formData
			.getAll('attachments')
			.filter((entry): entry is File => entry instanceof File);

		const ok = await createForumPost(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			params.threadId,
			body,
			parentId,
			files
		);

		if (!ok) {
			const thread = await getForumThread(
				locals.user!.id,
				params.teamSlug,
				params.wrkspaceSlug,
				params.moduleId,
				params.threadId
			);
			if (thread?.closedAt) {
				return fail(400, { message: 'This thread is closed' });
			}
			return fail(400, { message: 'Could not post reply' });
		}

		return { success: true };
	},

	closeThread: async ({ locals, params }) => {
		const ok = await closeForumThread(
			locals.user!.id,
			params.teamSlug,
			params.wrkspaceSlug,
			params.moduleId,
			params.threadId
		);

		if (!ok) {
			return fail(400, { message: 'Could not close thread' });
		}

		return { success: true };
	}
};
