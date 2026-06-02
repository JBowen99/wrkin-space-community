import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { chatMessage, chatMessageAttachment, wrkspaceModule } from './db/schema';
import { getSubscriptionTierForWrkspaceId } from './authorization';
import { formatUploadLimit, getPlanLimits } from '../shared/plan-limits';
import { DEFAULT_SUBSCRIPTION_TIER } from '../shared/pricing';
import { chatAttachmentKey, deleteObject, getObject, putObject } from './storage';
import { CHAT_ATTACHMENT_MAX_PER_MESSAGE, CHAT_ATTACHMENT_MAX_BYTES } from '../shared/chat-attachments';
import { TASK_ATTACHMENT_ACCEPT } from '../shared/task-attachments';
import { uniqueId } from '../shared/slug';

const MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/gif': '.gif',
	'image/webp': '.webp',
	'application/pdf': '.pdf',
	'text/plain': '.txt'
};

const ALLOWED_MIME_TYPES = new Set(TASK_ATTACHMENT_ACCEPT.split(',').map((type) => type.trim()));

export type ChatAttachmentRow = {
	id: string;
	messageId: string;
	originalName: string;
	mimeType: string;
	sizeBytes: number;
	url: string;
	createdAt: Date;
};

export function chatAttachmentPublicUrl(messageId: string, attachmentId: string): string {
	return `/api/chat/attachments/${encodeURIComponent(messageId)}/${encodeURIComponent(attachmentId)}`;
}

export async function userCanAccessChatMessage(
	userId: string,
	messageId: string
): Promise<boolean> {
	const { userCanAccessChatMessageById } = await import('./authorization');
	return userCanAccessChatMessageById(userId, messageId);
}

export async function loadAttachmentsForMessages(
	messageIds: string[]
): Promise<Map<string, ChatAttachmentRow[]>> {
	const map = new Map<string, ChatAttachmentRow[]>();
	if (messageIds.length === 0) return map;

	const rows = await db
		.select()
		.from(chatMessageAttachment)
		.where(inArray(chatMessageAttachment.messageId, messageIds))
		.orderBy(asc(chatMessageAttachment.createdAt));

	for (const row of rows) {
		const list = map.get(row.messageId) ?? [];
		list.push({
			id: row.id,
			messageId: row.messageId,
			originalName: row.originalName,
			mimeType: row.mimeType,
			sizeBytes: row.sizeBytes,
			url: chatAttachmentPublicUrl(row.messageId, row.id),
			createdAt: row.createdAt
		});
		map.set(row.messageId, list);
	}

	return map;
}

function sanitizeOriginalName(name: string): string {
	const base = name.replace(/[/\\]/g, '_').trim();
	return base.slice(0, 255) || 'file';
}

export function validateChatAttachmentFile(file: File, maxBytes?: number): string | null {
	if (!ALLOWED_MIME_TYPES.has(file.type)) {
		return 'File type not allowed. Use JPEG, PNG, GIF, WebP, PDF, or plain text.';
	}
	const limit = maxBytes ?? CHAT_ATTACHMENT_MAX_BYTES;
	if (file.size > limit) {
		return `File must be ${formatUploadLimit(limit)} or smaller`;
	}
	if (file.size === 0) {
		return 'File is empty';
	}
	return null;
}

async function maxUploadForMessage(messageId: string): Promise<number> {
	const [row] = await db
		.select({ wrkspaceId: wrkspaceModule.wrkspaceId })
		.from(chatMessage)
		.innerJoin(wrkspaceModule, eq(chatMessage.moduleId, wrkspaceModule.id))
		.where(eq(chatMessage.id, messageId))
		.limit(1);
	if (!row) return getPlanLimits(DEFAULT_SUBSCRIPTION_TIER).maxUploadBytes;
	const tier = await getSubscriptionTierForWrkspaceId(row.wrkspaceId);
	return getPlanLimits(tier ?? DEFAULT_SUBSCRIPTION_TIER).maxUploadBytes;
}

export async function addChatMessageAttachments(
	userId: string,
	messageId: string,
	files: File[]
): Promise<ChatAttachmentRow[]> {
	if (files.length === 0) return [];
	if (files.length > CHAT_ATTACHMENT_MAX_PER_MESSAGE) {
		throw new Error(`At most ${CHAT_ATTACHMENT_MAX_PER_MESSAGE} files per message`);
	}
	if (!(await userCanAccessChatMessage(userId, messageId))) {
		throw new Error('Forbidden');
	}

	const results: ChatAttachmentRow[] = [];

	const maxBytes = await maxUploadForMessage(messageId);

	for (const file of files) {
		const validationError = validateChatAttachmentFile(file, maxBytes);
		if (validationError) {
			throw new Error(validationError);
		}

		const ext = MIME_TO_EXT[file.type];
		if (!ext) {
			throw new Error('File type not allowed. Use JPEG, PNG, GIF, WebP, PDF, or plain text.');
		}

		const id = uniqueId();
		const storageKey = chatAttachmentKey(messageId, id, ext);
		const buffer = Buffer.from(await file.arrayBuffer());
		const originalName = sanitizeOriginalName(file.name);
		const createdAt = new Date();

		await putObject(storageKey, buffer, file.type);

		await db.insert(chatMessageAttachment).values({
			id,
			messageId,
			storageKey,
			originalName,
			mimeType: file.type,
			sizeBytes: file.size,
			createdAt
		});

		results.push({
			id,
			messageId,
			originalName,
			mimeType: file.type,
			sizeBytes: file.size,
			url: chatAttachmentPublicUrl(messageId, id),
			createdAt
		});
	}

	return results;
}

export async function getChatAttachmentForUser(
	userId: string,
	messageId: string,
	attachmentId: string
): Promise<{ row: typeof chatMessageAttachment.$inferSelect; body: Buffer } | undefined> {
	if (!(await userCanAccessChatMessage(userId, messageId))) return undefined;

	const [row] = await db
		.select()
		.from(chatMessageAttachment)
		.where(
			and(
				eq(chatMessageAttachment.id, attachmentId),
				eq(chatMessageAttachment.messageId, messageId)
			)
		)
		.limit(1);

	if (!row) return undefined;

	const { body } = await getObject(row.storageKey);
	return { row, body };
}

export async function deleteAttachmentsForMessage(messageId: string): Promise<void> {
	const rows = await db
		.select({ storageKey: chatMessageAttachment.storageKey })
		.from(chatMessageAttachment)
		.where(eq(chatMessageAttachment.messageId, messageId));

	for (const row of rows) {
		try {
			await deleteObject(row.storageKey);
		} catch {
			// best effort
		}
	}
}
