import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from './db/index.ts';
import { calendarEvent, calendarEventAttachment, wrkspaceModule } from './db/schema.ts';
import { getSubscriptionTierForWrkspaceId } from './authorization.ts';
import { formatUploadLimit, getPlanLimits } from '../shared/plan-limits';
import { DEFAULT_SUBSCRIPTION_TIER } from '../shared/pricing';
import { deleteObject, getObject, putObject, calendarAttachmentKey } from './storage/index.ts';
import { CALENDAR_ATTACHMENT_MAX_BYTES } from '../shared/calendar-attachments';
import { uniqueId } from '../shared/slug';

export { CALENDAR_ATTACHMENT_MAX_BYTES };

const MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/gif': '.gif',
	'image/webp': '.webp',
	'application/pdf': '.pdf',
	'text/plain': '.txt'
};

export type CalendarAttachmentRow = {
	id: string;
	eventId: string;
	originalName: string;
	mimeType: string;
	sizeBytes: number;
	url: string;
	createdAt: Date;
};

export function calendarAttachmentPublicUrl(eventId: string, attachmentId: string): string {
	return `/api/calendar/attachments/${encodeURIComponent(eventId)}/${encodeURIComponent(attachmentId)}`;
}

export async function loadAttachmentsForEvents(
	eventIds: string[]
): Promise<Map<string, CalendarAttachmentRow[]>> {
	const map = new Map<string, CalendarAttachmentRow[]>();
	if (eventIds.length === 0) return map;

	const rows = await db
		.select()
		.from(calendarEventAttachment)
		.where(inArray(calendarEventAttachment.eventId, eventIds))
		.orderBy(asc(calendarEventAttachment.createdAt));

	for (const row of rows) {
		const list = map.get(row.eventId) ?? [];
		list.push({
			id: row.id,
			eventId: row.eventId,
			originalName: row.originalName,
			mimeType: row.mimeType,
			sizeBytes: row.sizeBytes,
			url: calendarAttachmentPublicUrl(row.eventId, row.id),
			createdAt: row.createdAt
		});
		map.set(row.eventId, list);
	}

	return map;
}

function sanitizeOriginalName(name: string): string {
	const base = name.replace(/[/\\]/g, '_').trim();
	return base.slice(0, 255) || 'file';
}

async function userCanAccessEvent(userId: string, eventId: string): Promise<boolean> {
	const [row] = await db
		.select({ moduleId: calendarEvent.moduleId })
		.from(calendarEvent)
		.where(eq(calendarEvent.id, eventId))
		.limit(1);
	if (!row) return false;

	const { getModuleForUser } = await import('./modules.ts');
	const mod = await getModuleForUser(userId, '', '', row.moduleId);
	return mod !== null;
}

export async function addCalendarEventAttachment(
	userId: string,
	eventId: string,
	file: File
): Promise<CalendarAttachmentRow> {
	if (!MIME_TO_EXT[file.type]) {
		throw new Error('File type not allowed. Use JPEG, PNG, GIF, WebP, PDF, or plain text.');
	}
	if (!(await userCanAccessEvent(userId, eventId))) {
		throw new Error('Forbidden');
	}

	const countResult = await db
		.select({ id: calendarEventAttachment.id })
		.from(calendarEventAttachment)
		.where(eq(calendarEventAttachment.eventId, eventId));

	if (countResult.length >= 5) {
		throw new Error('Maximum 5 attachments per event');
	}

	const [eventRow] = await db
		.select({ wrkspaceId: wrkspaceModule.wrkspaceId })
		.from(calendarEvent)
		.innerJoin(wrkspaceModule, eq(calendarEvent.moduleId, wrkspaceModule.id))
		.where(eq(calendarEvent.id, eventId))
		.limit(1);

	const tier =
		(eventRow && (await getSubscriptionTierForWrkspaceId(eventRow.wrkspaceId))) ??
		DEFAULT_SUBSCRIPTION_TIER;
	const maxBytes = getPlanLimits(tier).maxUploadBytes;

	if (file.size > maxBytes) {
		throw new Error(`File must be ${formatUploadLimit(maxBytes)} or smaller`);
	}

	const ext = MIME_TO_EXT[file.type];
	const id = uniqueId();
	const storageKey = calendarAttachmentKey(eventId, id, ext);
	const buffer = Buffer.from(await file.arrayBuffer());

	await putObject(storageKey, buffer, file.type);

	await db.insert(calendarEventAttachment).values({
		id,
		eventId,
		storageKey,
		originalName: sanitizeOriginalName(file.name),
		mimeType: file.type,
		sizeBytes: file.size,
		uploadedBy: userId,
		createdAt: new Date()
	});

	return {
		id,
		eventId,
		originalName: sanitizeOriginalName(file.name),
		mimeType: file.type,
		sizeBytes: file.size,
		url: calendarAttachmentPublicUrl(eventId, id),
		createdAt: new Date()
	};
}

export async function getCalendarAttachmentForUser(
	userId: string,
	eventId: string,
	attachmentId: string
): Promise<{ row: typeof calendarEventAttachment.$inferSelect; body: Buffer } | undefined> {
	if (!(await userCanAccessEvent(userId, eventId))) return undefined;

	const [row] = await db
		.select()
		.from(calendarEventAttachment)
		.where(
			and(eq(calendarEventAttachment.id, attachmentId), eq(calendarEventAttachment.eventId, eventId))
		)
		.limit(1);

	if (!row) return undefined;

	const { body } = await getObject(row.storageKey);
	return { row, body };
}

export async function deleteCalendarEventAttachment(
	userId: string,
	attachmentId: string
): Promise<boolean> {
	const [row] = await db
		.select()
		.from(calendarEventAttachment)
		.where(eq(calendarEventAttachment.id, attachmentId))
		.limit(1);

	if (!row) return false;
	if (!(await userCanAccessEvent(userId, row.eventId))) return false;

	try {
		await deleteObject(row.storageKey);
	} catch {
		// continue — remove DB row even if object already gone
	}

	await db.delete(calendarEventAttachment).where(eq(calendarEventAttachment.id, attachmentId));
	return true;
}

export async function deleteAttachmentsForEvent(eventId: string): Promise<void> {
	const rows = await db
		.select({ storageKey: calendarEventAttachment.storageKey })
		.from(calendarEventAttachment)
		.where(eq(calendarEventAttachment.eventId, eventId));

	for (const row of rows) {
		try {
			await deleteObject(row.storageKey);
		} catch {
			// best effort
		}
	}
}
