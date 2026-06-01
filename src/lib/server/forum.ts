import {
	and,
	asc,
	count,
	desc,
	eq,
	exists,
	ilike,
	isNull,
	isNotNull,
	or,
	sql,
	type SQL
} from 'drizzle-orm';
import { db } from './db';
import { forumPost, forumThread, user } from './db/schema';
import {
	addForumPostAttachments,
	deleteAttachmentsForPost,
	loadAttachmentsForPosts,
	type ForumAttachmentRow
} from './forum-attachments';
import { FORUM_ATTACHMENT_MAX_PER_POST } from '../shared/forum-attachments';
import { isWrkspaceAdminOrOwner } from '../shared/roles';
import { getWrkspaceAccess } from './authorization';
import { getModuleForUser } from './modules';
import { escapeIlike } from './ilike';
import { uniqueId } from '../shared/slug';

export type ForumThreadRow = {
	id: string;
	title: string;
	authorId: string;
	authorName: string;
	replyCount: number;
	excerpt: string;
	updatedAt: Date;
	closedAt: Date | null;
};

export type ForumPostRow = {
	id: string;
	threadId: string;
	authorId: string;
	authorName: string;
	authorImage: string | null;
	body: string;
	parentId: string | null;
	createdAt: Date;
	attachments: ForumAttachmentRow[];
};

export type ForumPostNode = ForumPostRow & {
	children: ForumPostNode[];
};

export type ForumThreadDetail = {
	id: string;
	moduleId: string;
	title: string;
	authorId: string;
	authorName: string;
	createdAt: Date;
	updatedAt: Date;
	closedAt: Date | null;
};

async function assertForumModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<boolean> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	return mod?.type === 'forum';
}

function excerptBody(body: string, maxLen = 120): string {
	const trimmed = body.trim().replace(/\s+/g, ' ');
	if (trimmed.length <= maxLen) return trimmed;
	return `${trimmed.slice(0, maxLen)}…`;
}

export function buildPostTree(posts: ForumPostRow[]): ForumPostNode[] {
	const byId = new Map<string, ForumPostNode>();
	for (const post of posts) {
		byId.set(post.id, { ...post, children: [] });
	}

	const roots: ForumPostNode[] = [];
	for (const node of byId.values()) {
		if (node.parentId && byId.has(node.parentId)) {
			byId.get(node.parentId)!.children.push(node);
		} else if (!node.parentId) {
			roots.push(node);
		}
	}

	return roots;
}

export const FORUM_MODULE_PREVIEW_LIMIT = 6;
export const FORUM_THREADS_PER_PAGE = 10;

export type ForumThreadSort = 'active' | 'newest' | 'oldest' | 'replies' | 'title';

const FORUM_THREAD_SORTS: ForumThreadSort[] = ['active', 'newest', 'oldest', 'replies', 'title'];

export function parseForumThreadSort(raw: string | null): ForumThreadSort {
	if (raw && FORUM_THREAD_SORTS.includes(raw as ForumThreadSort)) {
		return raw as ForumThreadSort;
	}
	return 'active';
}

export type ForumThreadsPage = {
	threads: ForumThreadRow[];
	totalCount: number;
	page: number;
	perPage: number;
	q: string;
	sort: ForumThreadSort;
};

function forumThreadListWhere(moduleId: string, q?: string): SQL {
	const base = eq(forumThread.moduleId, moduleId);
	const trimmed = q?.trim();
	if (!trimmed) return base;

	const pattern = `%${escapeIlike(trimmed)}%`;
	return and(
		base,
		or(
			ilike(forumThread.title, pattern),
			exists(
				db
					.select({ id: forumPost.id })
					.from(forumPost)
					.where(and(eq(forumPost.threadId, forumThread.id), ilike(forumPost.body, pattern)))
			)
		)
	)!;
}

function forumThreadOrderBy(sort: ForumThreadSort) {
	switch (sort) {
		case 'newest':
			return [desc(forumThread.createdAt)];
		case 'oldest':
			return [asc(forumThread.createdAt)];
		case 'title':
			return [asc(forumThread.title)];
		case 'replies':
			return [
				desc(
					sql`(SELECT COUNT(*)::int FROM ${forumPost} WHERE ${forumPost.threadId} = ${forumThread.id} AND ${forumPost.parentId} IS NOT NULL)`
				)
			];
		case 'active':
		default:
			return [desc(forumThread.updatedAt), desc(forumThread.createdAt)];
	}
}

export async function getForumModulePreview(moduleId: string): Promise<{
	openCount: number;
	threads: { title: string; authorName: string; replyCount: number }[];
}> {
	const [openRow] = await db
		.select({ value: count() })
		.from(forumThread)
		.where(and(eq(forumThread.moduleId, moduleId), isNull(forumThread.closedAt)));

	const openCount = Number(openRow?.value ?? 0);

	const [countRow] = await db
		.select({ value: count() })
		.from(forumThread)
		.where(eq(forumThread.moduleId, moduleId));

	const total = Number(countRow?.value ?? 0);
	if (total === 0) {
		return { openCount: 0, threads: [] };
	}

	const rows = await db
		.select({
			id: forumThread.id,
			title: forumThread.title,
			authorName: user.name
		})
		.from(forumThread)
		.innerJoin(user, eq(forumThread.authorId, user.id))
		.where(eq(forumThread.moduleId, moduleId))
		.orderBy(desc(forumThread.updatedAt), desc(forumThread.createdAt))
		.limit(FORUM_MODULE_PREVIEW_LIMIT);

	const threads: { title: string; authorName: string; replyCount: number }[] = [];

	for (const row of rows) {
		const [replyCountRow] = await db
			.select({ value: count() })
			.from(forumPost)
			.where(and(eq(forumPost.threadId, row.id), isNotNull(forumPost.parentId)));

		threads.push({
			title: row.title,
			authorName: row.authorName,
			replyCount: Number(replyCountRow?.value ?? 0)
		});
	}

	return { openCount, threads };
}

export async function listForumThreads(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	options?: { page?: number; perPage?: number; q?: string; sort?: ForumThreadSort }
): Promise<ForumThreadsPage> {
	const perPage = options?.perPage ?? FORUM_THREADS_PER_PAGE;
	const q = options?.q?.trim() ?? '';
	const sort = options?.sort ?? 'active';
	const empty: ForumThreadsPage = { threads: [], totalCount: 0, page: 1, perPage, q, sort };

	if (!(await assertForumModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return empty;
	}

	const where = forumThreadListWhere(moduleId, q || undefined);

	const [countRow] = await db.select({ value: count() }).from(forumThread).where(where);

	const totalCount = Number(countRow?.value ?? 0);
	if (totalCount === 0) {
		return empty;
	}

	const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
	const requestedPage = Math.max(1, options?.page ?? 1);
	const page = Math.min(requestedPage, totalPages);
	const offset = (page - 1) * perPage;

	const threads = await db
		.select({
			id: forumThread.id,
			title: forumThread.title,
			authorId: forumThread.authorId,
			authorName: user.name,
			updatedAt: forumThread.updatedAt,
			closedAt: forumThread.closedAt
		})
		.from(forumThread)
		.innerJoin(user, eq(forumThread.authorId, user.id))
		.where(where)
		.orderBy(...forumThreadOrderBy(sort))
		.limit(perPage)
		.offset(offset);

	const result: ForumThreadRow[] = [];

	for (const thread of threads) {
		const [replyCountRow] = await db
			.select({ value: count() })
			.from(forumPost)
			.where(and(eq(forumPost.threadId, thread.id), isNotNull(forumPost.parentId)));

		const [openingPost] = await db
			.select({ body: forumPost.body })
			.from(forumPost)
			.where(and(eq(forumPost.threadId, thread.id), isNull(forumPost.parentId)))
			.limit(1);

		result.push({
			id: thread.id,
			title: thread.title,
			authorId: thread.authorId,
			authorName: thread.authorName,
			replyCount: Number(replyCountRow?.value ?? 0),
			excerpt: excerptBody(openingPost?.body ?? ''),
			updatedAt: thread.updatedAt,
			closedAt: thread.closedAt
		});
	}

	return { threads: result, totalCount, page, perPage, q, sort };
}

export async function getForumThread(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	threadId: string
): Promise<ForumThreadDetail | undefined> {
	if (!(await assertForumModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	const rows = await db
		.select({
			id: forumThread.id,
			moduleId: forumThread.moduleId,
			title: forumThread.title,
			authorId: forumThread.authorId,
			authorName: user.name,
			createdAt: forumThread.createdAt,
			updatedAt: forumThread.updatedAt,
			closedAt: forumThread.closedAt
		})
		.from(forumThread)
		.innerJoin(user, eq(forumThread.authorId, user.id))
		.where(and(eq(forumThread.id, threadId), eq(forumThread.moduleId, moduleId)))
		.limit(1);

	return rows[0];
}

export async function listForumPosts(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	threadId: string
): Promise<ForumPostRow[]> {
	const thread = await getForumThread(userId, teamSlug, wrkspaceSlug, moduleId, threadId);
	if (!thread) return [];

	const posts = await db
		.select({
			id: forumPost.id,
			threadId: forumPost.threadId,
			authorId: forumPost.authorId,
			authorName: user.name,
			authorImage: user.image,
			body: forumPost.body,
			parentId: forumPost.parentId,
			createdAt: forumPost.createdAt
		})
		.from(forumPost)
		.innerJoin(user, eq(forumPost.authorId, user.id))
		.where(eq(forumPost.threadId, threadId))
		.orderBy(asc(forumPost.createdAt));

	const attachmentsByPost = await loadAttachmentsForPosts(posts.map((post) => post.id));
	return posts.map((post) => ({
		...post,
		attachments: attachmentsByPost.get(post.id) ?? []
	}));
}

export async function createForumThread(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	title: string,
	body: string,
	files: File[] = []
): Promise<string | undefined> {
	if (!(await assertForumModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	const trimmedTitle = title.trim();
	const trimmedBody = body.trim();
	const validFiles = files.filter((f) => f.size > 0);
	if (!trimmedTitle || (!trimmedBody && validFiles.length === 0)) return undefined;

	const threadId = uniqueId();
	const postId = uniqueId();
	const now = new Date();

	await db.insert(forumThread).values({
		id: threadId,
		moduleId,
		title: trimmedTitle,
		authorId: userId,
		createdAt: now,
		updatedAt: now
	});

	await db.insert(forumPost).values({
		id: postId,
		threadId,
		authorId: userId,
		body: trimmedBody,
		parentId: null,
		createdAt: now
	});

	try {
		await addForumPostAttachments(userId, postId, validFiles);
	} catch {
		await deleteAttachmentsForPost(postId);
		await db.delete(forumPost).where(eq(forumPost.id, postId));
		await db.delete(forumThread).where(eq(forumThread.id, threadId));
		return undefined;
	}

	return threadId;
}

export async function createForumPost(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	threadId: string,
	body: string,
	parentId: string | null,
	files: File[] = []
): Promise<boolean> {
	const thread = await getForumThread(userId, teamSlug, wrkspaceSlug, moduleId, threadId);
	if (!thread || thread.closedAt) return false;

	const trimmedBody = body.trim();
	const validFiles = files.filter((f) => f.size > 0);
	if (!trimmedBody && validFiles.length === 0) return false;
	if (validFiles.length > FORUM_ATTACHMENT_MAX_PER_POST) return false;

	if (parentId) {
		const [parent] = await db
			.select({ id: forumPost.id })
			.from(forumPost)
			.where(and(eq(forumPost.id, parentId), eq(forumPost.threadId, threadId)))
			.limit(1);

		if (!parent) return false;
	}

	const now = new Date();

	const postId = uniqueId();
	await db.insert(forumPost).values({
		id: postId,
		threadId,
		authorId: userId,
		body: trimmedBody,
		parentId,
		createdAt: now
	});

	try {
		await addForumPostAttachments(userId, postId, validFiles);
	} catch {
		await deleteAttachmentsForPost(postId);
		await db.delete(forumPost).where(eq(forumPost.id, postId));
		return false;
	}

	await db.update(forumThread).set({ updatedAt: now }).where(eq(forumThread.id, threadId));

	return true;
}

async function canCloseForumThread(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	thread: { authorId: string; closedAt: Date | null }
): Promise<boolean> {
	if (thread.closedAt) return false;
	if (thread.authorId === userId) return true;

	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return false;

	return isWrkspaceAdminOrOwner(access.effectiveWrkspaceRole);
}

export async function closeForumThread(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	threadId: string
): Promise<boolean> {
	const thread = await getForumThread(userId, teamSlug, wrkspaceSlug, moduleId, threadId);
	if (!thread) return false;
	if (!(await canCloseForumThread(userId, teamSlug, wrkspaceSlug, thread))) return false;

	const now = new Date();
	await db
		.update(forumThread)
		.set({ closedAt: now, updatedAt: now })
		.where(eq(forumThread.id, threadId));

	return true;
}
