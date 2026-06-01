import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { forumPost, forumPostAttachment, forumThread, wrkspaceModule } from './db/schema';
import { getSubscriptionTierForWrkspaceId } from './authorization';
import { formatUploadLimit, getPlanLimits } from '$lib/shared/plan-limits';
import { DEFAULT_SUBSCRIPTION_TIER } from '$lib/shared/pricing';
import { FORUM_ATTACHMENT_MAX_BYTES, FORUM_ATTACHMENT_MAX_PER_POST } from '$lib/shared/forum-attachments';
import { TASK_ATTACHMENT_ACCEPT } from '$lib/shared/task-attachments';
import { deleteObject, forumAttachmentKey, getObject, putObject } from './storage';
import { uniqueId } from '$lib/shared/slug';

const MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/gif': '.gif',
	'image/webp': '.webp',
	'application/pdf': '.pdf',
	'text/plain': '.txt'
};

const ALLOWED_MIME_TYPES = new Set(TASK_ATTACHMENT_ACCEPT.split(',').map((type) => type.trim()));

export type ForumAttachmentRow = {
	id: string;
	postId: string;
	originalName: string;
	mimeType: string;
	sizeBytes: number;
	url: string;
	createdAt: Date;
};

export function forumAttachmentPublicUrl(postId: string, attachmentId: string): string {
	return `/api/forum/attachments/${encodeURIComponent(postId)}/${encodeURIComponent(attachmentId)}`;
}

export async function userCanAccessForumPost(userId: string, postId: string): Promise<boolean> {
	const { userCanAccessForumPostById } = await import('./authorization');
	return userCanAccessForumPostById(userId, postId);
}

export async function loadAttachmentsForPosts(
	postIds: string[]
): Promise<Map<string, ForumAttachmentRow[]>> {
	const map = new Map<string, ForumAttachmentRow[]>();
	if (postIds.length === 0) return map;

	const rows = await db
		.select()
		.from(forumPostAttachment)
		.where(inArray(forumPostAttachment.postId, postIds))
		.orderBy(asc(forumPostAttachment.createdAt));

	for (const row of rows) {
		const list = map.get(row.postId) ?? [];
		list.push({
			id: row.id,
			postId: row.postId,
			originalName: row.originalName,
			mimeType: row.mimeType,
			sizeBytes: row.sizeBytes,
			url: forumAttachmentPublicUrl(row.postId, row.id),
			createdAt: row.createdAt
		});
		map.set(row.postId, list);
	}

	return map;
}

function sanitizeOriginalName(name: string): string {
	const base = name.replace(/[/\\]/g, '_').trim();
	return base.slice(0, 255) || 'file';
}

function validateForumAttachmentFile(file: File, maxBytes?: number): string | null {
	if (!ALLOWED_MIME_TYPES.has(file.type)) {
		return 'File type not allowed. Use JPEG, PNG, GIF, WebP, PDF, or plain text.';
	}
	const limit = maxBytes ?? FORUM_ATTACHMENT_MAX_BYTES;
	if (file.size > limit) {
		return `File must be ${formatUploadLimit(limit)} or smaller`;
	}
	if (file.size === 0) {
		return 'File is empty';
	}
	return null;
}

async function maxUploadForPost(postId: string): Promise<number> {
	const [row] = await db
		.select({ wrkspaceId: wrkspaceModule.wrkspaceId })
		.from(forumPost)
		.innerJoin(forumThread, eq(forumPost.threadId, forumThread.id))
		.innerJoin(wrkspaceModule, eq(forumThread.moduleId, wrkspaceModule.id))
		.where(eq(forumPost.id, postId))
		.limit(1);
	if (!row) return getPlanLimits(DEFAULT_SUBSCRIPTION_TIER).maxUploadBytes;
	const tier = await getSubscriptionTierForWrkspaceId(row.wrkspaceId);
	return getPlanLimits(tier ?? DEFAULT_SUBSCRIPTION_TIER).maxUploadBytes;
}

export async function addForumPostAttachments(
	userId: string,
	postId: string,
	files: File[]
): Promise<ForumAttachmentRow[]> {
	if (files.length === 0) return [];
	if (files.length > FORUM_ATTACHMENT_MAX_PER_POST) {
		throw new Error(`At most ${FORUM_ATTACHMENT_MAX_PER_POST} files per post`);
	}
	if (!(await userCanAccessForumPost(userId, postId))) {
		throw new Error('Forbidden');
	}

	const results: ForumAttachmentRow[] = [];
	const maxBytes = await maxUploadForPost(postId);

	for (const file of files) {
		const validationError = validateForumAttachmentFile(file, maxBytes);
		if (validationError) {
			throw new Error(validationError);
		}

		const ext = MIME_TO_EXT[file.type];
		if (!ext) {
			throw new Error('File type not allowed. Use JPEG, PNG, GIF, WebP, PDF, or plain text.');
		}

		const id = uniqueId();
		const storageKey = forumAttachmentKey(postId, id, ext);
		const buffer = Buffer.from(await file.arrayBuffer());
		const originalName = sanitizeOriginalName(file.name);
		const createdAt = new Date();

		await putObject(storageKey, buffer, file.type);

		await db.insert(forumPostAttachment).values({
			id,
			postId,
			storageKey,
			originalName,
			mimeType: file.type,
			sizeBytes: file.size,
			createdAt
		});

		results.push({
			id,
			postId,
			originalName,
			mimeType: file.type,
			sizeBytes: file.size,
			url: forumAttachmentPublicUrl(postId, id),
			createdAt
		});
	}

	return results;
}

export async function getForumAttachmentForUser(
	userId: string,
	postId: string,
	attachmentId: string
): Promise<{ row: typeof forumPostAttachment.$inferSelect; body: Buffer } | undefined> {
	if (!(await userCanAccessForumPost(userId, postId))) return undefined;

	const [row] = await db
		.select()
		.from(forumPostAttachment)
		.where(and(eq(forumPostAttachment.id, attachmentId), eq(forumPostAttachment.postId, postId)))
		.limit(1);

	if (!row) return undefined;

	const { body } = await getObject(row.storageKey);
	return { row, body };
}

export async function deleteAttachmentsForPost(postId: string): Promise<void> {
	const rows = await db
		.select({ storageKey: forumPostAttachment.storageKey })
		.from(forumPostAttachment)
		.where(eq(forumPostAttachment.postId, postId));

	for (const row of rows) {
		try {
			await deleteObject(row.storageKey);
		} catch {
			// best effort
		}
	}
}
