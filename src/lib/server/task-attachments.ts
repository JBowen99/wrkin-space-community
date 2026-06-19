import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from './db/index.ts';
import { taskAttachment, taskItem, wrkspaceModule } from './db/schema.ts';
import { getSubscriptionTierForWrkspaceId } from './authorization.ts';
import { formatUploadLimit, getPlanLimits } from '../shared/plan-limits';
import { DEFAULT_SUBSCRIPTION_TIER } from '../shared/pricing';
import { deleteObject, getObject, putObject, taskAttachmentKey } from './storage/index.ts';
import { TASK_ATTACHMENT_MAX_BYTES } from '../shared/task-attachments';
import { uniqueId } from '../shared/slug';

export { TASK_ATTACHMENT_MAX_BYTES };

const MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/gif': '.gif',
	'image/webp': '.webp',
	'application/pdf': '.pdf',
	'text/plain': '.txt'
};

export type TaskAttachmentRow = {
	id: string;
	taskId: string;
	originalName: string;
	mimeType: string;
	sizeBytes: number;
	url: string;
	createdAt: Date;
};

export function taskAttachmentPublicUrl(taskId: string, attachmentId: string): string {
	return `/api/tasks/attachments/${encodeURIComponent(taskId)}/${encodeURIComponent(attachmentId)}`;
}

export async function userCanAccessTask(userId: string, taskId: string): Promise<boolean> {
	const { userCanAccessTaskById } = await import('./authorization.ts');
	return userCanAccessTaskById(userId, taskId);
}

export async function loadAttachmentsForTasks(
	taskIds: string[]
): Promise<Map<string, TaskAttachmentRow[]>> {
	const map = new Map<string, TaskAttachmentRow[]>();
	if (taskIds.length === 0) return map;

	const rows = await db
		.select()
		.from(taskAttachment)
		.where(inArray(taskAttachment.taskId, taskIds))
		.orderBy(asc(taskAttachment.createdAt));

	for (const row of rows) {
		const list = map.get(row.taskId) ?? [];
		list.push({
			id: row.id,
			taskId: row.taskId,
			originalName: row.originalName,
			mimeType: row.mimeType,
			sizeBytes: row.sizeBytes,
			url: taskAttachmentPublicUrl(row.taskId, row.id),
			createdAt: row.createdAt
		});
		map.set(row.taskId, list);
	}

	return map;
}

function sanitizeOriginalName(name: string): string {
	const base = name.replace(/[/\\]/g, '_').trim();
	return base.slice(0, 255) || 'file';
}

export async function addTaskAttachment(
	userId: string,
	taskId: string,
	file: File
): Promise<TaskAttachmentRow> {
	if (!MIME_TO_EXT[file.type]) {
		throw new Error('File type not allowed. Use JPEG, PNG, GIF, WebP, PDF, or plain text.');
	}
	if (!(await userCanAccessTask(userId, taskId))) {
		throw new Error('Forbidden');
	}

	const [taskRow] = await db
		.select({ wrkspaceId: wrkspaceModule.wrkspaceId })
		.from(taskItem)
		.innerJoin(wrkspaceModule, eq(taskItem.moduleId, wrkspaceModule.id))
		.where(eq(taskItem.id, taskId))
		.limit(1);

	const tier =
		(taskRow && (await getSubscriptionTierForWrkspaceId(taskRow.wrkspaceId))) ??
		DEFAULT_SUBSCRIPTION_TIER;
	const maxBytes = getPlanLimits(tier).maxUploadBytes;

	if (file.size > maxBytes) {
		throw new Error(`File must be ${formatUploadLimit(maxBytes)} or smaller`);
	}

	const ext = MIME_TO_EXT[file.type];
	const id = uniqueId();
	const storageKey = taskAttachmentKey(taskId, id, ext);
	const buffer = Buffer.from(await file.arrayBuffer());

	await putObject(storageKey, buffer, file.type);

	await db.insert(taskAttachment).values({
		id,
		taskId,
		storageKey,
		originalName: sanitizeOriginalName(file.name),
		mimeType: file.type,
		sizeBytes: file.size,
		uploadedBy: userId,
		createdAt: new Date()
	});

	return {
		id,
		taskId,
		originalName: sanitizeOriginalName(file.name),
		mimeType: file.type,
		sizeBytes: file.size,
		url: taskAttachmentPublicUrl(taskId, id),
		createdAt: new Date()
	};
}

export async function getTaskAttachmentForUser(
	userId: string,
	taskId: string,
	attachmentId: string
): Promise<{ row: typeof taskAttachment.$inferSelect; body: Buffer } | undefined> {
	if (!(await userCanAccessTask(userId, taskId))) return undefined;

	const [row] = await db
		.select()
		.from(taskAttachment)
		.where(and(eq(taskAttachment.id, attachmentId), eq(taskAttachment.taskId, taskId)))
		.limit(1);

	if (!row) return undefined;

	const { body } = await getObject(row.storageKey);
	return { row, body };
}

export async function deleteTaskAttachment(userId: string, attachmentId: string): Promise<boolean> {
	const [row] = await db
		.select()
		.from(taskAttachment)
		.where(eq(taskAttachment.id, attachmentId))
		.limit(1);

	if (!row) return false;
	if (!(await userCanAccessTask(userId, row.taskId))) return false;

	try {
		await deleteObject(row.storageKey);
	} catch {
		// continue — remove DB row even if object already gone
	}

	await db.delete(taskAttachment).where(eq(taskAttachment.id, attachmentId));
	return true;
}

export async function deleteAttachmentsForTask(taskId: string): Promise<void> {
	const rows = await db
		.select({ storageKey: taskAttachment.storageKey })
		.from(taskAttachment)
		.where(eq(taskAttachment.taskId, taskId));

	for (const row of rows) {
		try {
			await deleteObject(row.storageKey);
		} catch {
			// best effort
		}
	}
}
