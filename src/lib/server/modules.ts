import { and, asc, count, desc, eq, exists, gte, ilike, inArray, or, type SQL } from 'drizzle-orm';
import { assertModuleTypeAllowed, PlanLimitError, type PlanLimitInfo } from '../shared/plan-limits';
import { getModuleTierMin } from '../shared/modules';
import { db } from './db';
import {
	boardCard,
	calendarEvent,
	cardColumn,
	chatMessage,
	chatMessageAttachment,
	chatMessageReaction,
	user,
	wrkspaceModule
} from './db/schema';
import {
	assertWrkspaceAccess,
	assertWrkspaceModuleLimit,
	getTeamMembership,
	requireWrkspaceCapability,
	planLimitFailMessage,
	planLimitToInfo
} from './authorization';
import { getDocsModulePreview } from './docs';
import { getForumModulePreview } from './forum';
import { recordActivity } from './activity';
import { escapeIlike } from './ilike';
import { getTasksModulePreview } from './tasks';
import { isChatReactionEmoji } from '../shared/chat';
import {
	addChatMessageAttachments,
	deleteAttachmentsForMessage,
	loadAttachmentsForMessages,
	type ChatAttachmentRow
} from './chat-attachments';
import {
	DEFAULT_CARD_COLUMN_COLOR,
	DEFAULT_INBOX_COLUMN_TITLE,
	DEFAULT_WELCOME_CARD_BODY,
	DEFAULT_WELCOME_CARD_TITLE
} from '../shared/cards';
import { normalizeHexColor } from '../shared/tasks-colors';
import {
	defaultModuleTitle,
	getModuleCatalogEntry,
	isModuleType,
	type ModuleType
} from '../shared/modules';
import { localDayBounds } from '../shared/calendar';
import { uniqueId } from '../shared/slug';
import {
	parseIcsEvents,
	serializeIcsCalendar,
	wrkinIcalUid,
	type IcsExportEvent
} from '../calendar/ical';

export type ModulePreview =
	| {
			type: 'chat';
			messages: {
				authorName: string;
				body: string;
				isOwn: boolean;
				attachments: ChatAttachmentRow[];
			}[];
	  }
	| {
			type: 'calendar';
			isEmpty: boolean;
			upcomingEvents: { title: string; startsAt: Date; endsAt: Date | null }[];
	  }
	| {
			type: 'cards';
			columns: { title: string; color: string; cardCount: number }[];
			moreColumnCount: number;
	  }
	| {
			type: 'docs';
			docs: { title: string }[];
			moreCount: number;
	  }
	| {
			type: 'forum';
			openCount: number;
			threads: { title: string; authorName: string; replyCount: number }[];
	  }
	| {
			type: 'tasks';
			openCount: number;
			recent: { title: string; status: string; priority: string }[];
	  }
	| { type: 'other' };

export type WrkspaceModuleWithPreview = {
	id: string;
	type: ModuleType;
	title: string;
	position: number;
	preview: ModulePreview;
};

export type WrkspaceModule = {
	id: string;
	wrkspaceId: string;
	type: ModuleType;
	title: string;
	position: number;
	teamSlug: string;
	wrkspaceSlug: string;
};

async function resolveWrkspaceAccess(userId: string, teamSlug: string, wrkspaceSlug: string) {
	try {
		const access = await assertWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
		return {
			wrkspaceId: access.wrkspaceId,
			teamSlug: access.teamSlug,
			wrkspaceSlug: access.wrkspaceSlug,
			access
		};
	} catch {
		return undefined;
	}
}

async function getChatPreview(moduleId: string, viewerUserId: string): Promise<ModulePreview> {
	const rows = await db
		.select({
			id: chatMessage.id,
			body: chatMessage.body,
			authorName: user.name,
			authorId: chatMessage.authorId
		})
		.from(chatMessage)
		.innerJoin(user, eq(chatMessage.authorId, user.id))
		.where(eq(chatMessage.moduleId, moduleId))
		.orderBy(desc(chatMessage.createdAt))
		.limit(3);

	const ordered = rows.reverse();
	const attachmentsByMessage = await loadAttachmentsForMessages(ordered.map((row) => row.id));

	const messages = ordered.map((row) => ({
		authorName: row.authorName,
		body: row.body,
		isOwn: row.authorId === viewerUserId,
		attachments: attachmentsByMessage.get(row.id) ?? []
	}));

	return { type: 'chat', messages };
}

const CALENDAR_MODULE_PREVIEW_LIMIT = 5;

async function getCalendarPreview(moduleId: string): Promise<ModulePreview> {
	const [countRow] = await db
		.select({ value: count() })
		.from(calendarEvent)
		.where(eq(calendarEvent.moduleId, moduleId));

	const total = Number(countRow?.value ?? 0);
	if (total === 0) {
		return { type: 'calendar', isEmpty: true, upcomingEvents: [] };
	}

	// Server-local calendar day at load time (not user timezone).
	const { start } = localDayBounds();
	const rows = await db
		.select({
			title: calendarEvent.title,
			startsAt: calendarEvent.startsAt,
			endsAt: calendarEvent.endsAt
		})
		.from(calendarEvent)
		.where(and(eq(calendarEvent.moduleId, moduleId), gte(calendarEvent.startsAt, start)))
		.orderBy(asc(calendarEvent.startsAt))
		.limit(CALENDAR_MODULE_PREVIEW_LIMIT);

	return {
		type: 'calendar',
		isEmpty: false,
		upcomingEvents: rows.map((row) => ({
			title: row.title,
			startsAt: row.startsAt,
			endsAt: row.endsAt
		}))
	};
}

async function getCardsPreview(moduleId: string): Promise<ModulePreview> {
	const allColumns = await db
		.select({
			id: cardColumn.id,
			title: cardColumn.title,
			color: cardColumn.color
		})
		.from(cardColumn)
		.where(eq(cardColumn.moduleId, moduleId))
		.orderBy(asc(cardColumn.position), asc(cardColumn.createdAt));

	if (allColumns.length === 0) {
		return { type: 'cards', columns: [], moreColumnCount: 0 };
	}

	const columnsWithCounts: { title: string; color: string; cardCount: number }[] = [];

	for (const col of allColumns) {
		const [cardCountRow] = await db
			.select({ value: count() })
			.from(boardCard)
			.where(eq(boardCard.columnId, col.id));
		columnsWithCounts.push({
			title: col.title,
			color: col.color,
			cardCount: Number(cardCountRow?.value ?? 0)
		});
	}

	return {
		type: 'cards',
		columns: columnsWithCounts.slice(0, 3),
		moreColumnCount: Math.max(0, allColumns.length - 3)
	};
}

async function getDocsPreview(moduleId: string): Promise<ModulePreview> {
	const { docs, moreCount } = await getDocsModulePreview(moduleId);
	return { type: 'docs', docs, moreCount };
}

async function getForumPreview(moduleId: string): Promise<ModulePreview> {
	const { openCount, threads } = await getForumModulePreview(moduleId);
	return { type: 'forum', openCount, threads };
}

async function getTasksPreview(moduleId: string): Promise<ModulePreview> {
	const { openCount, recent } = await getTasksModulePreview(moduleId);
	return { type: 'tasks', openCount, recent };
}

export async function listModulesWithPreviews(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<WrkspaceModuleWithPreview[]> {
	const resolved = await resolveWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!resolved) return [];

	const modules = await db
		.select({
			id: wrkspaceModule.id,
			type: wrkspaceModule.type,
			title: wrkspaceModule.title,
			position: wrkspaceModule.position
		})
		.from(wrkspaceModule)
		.where(eq(wrkspaceModule.wrkspaceId, resolved.wrkspaceId))
		.orderBy(asc(wrkspaceModule.position), asc(wrkspaceModule.createdAt));

	const result: WrkspaceModuleWithPreview[] = [];

	for (const mod of modules) {
		if (!isModuleType(mod.type)) continue;

		let preview: ModulePreview = { type: 'other' };
		if (mod.type === 'chat') {
			preview = await getChatPreview(mod.id, userId);
		} else if (mod.type === 'calendar') {
			preview = await getCalendarPreview(mod.id);
		} else if (mod.type === 'cards') {
			preview = await getCardsPreview(mod.id);
		} else if (mod.type === 'docs') {
			preview = await getDocsPreview(mod.id);
		} else if (mod.type === 'forum') {
			preview = await getForumPreview(mod.id);
		} else if (mod.type === 'tasks') {
			preview = await getTasksPreview(mod.id);
		}

		result.push({
			id: mod.id,
			type: mod.type,
			title: mod.title,
			position: mod.position,
			preview
		});
	}

	return result;
}

async function requireManageModulesAccess(userId: string, teamSlug: string, wrkspaceSlug: string) {
	const resolved = await resolveWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!resolved) return undefined;
	try {
		requireWrkspaceCapability(resolved.access, 'manage_modules');
	} catch {
		return undefined;
	}
	return resolved;
}

export type AddModuleFailure = { error: string; planLimit?: PlanLimitInfo };

export async function addModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	type: ModuleType
): Promise<WrkspaceModule | AddModuleFailure | undefined> {
	const resolved = await requireManageModulesAccess(userId, teamSlug, wrkspaceSlug);
	if (!resolved) return undefined;

	const membership = await getTeamMembership(userId, teamSlug);
	if (!membership) return undefined;

	try {
		assertModuleTypeAllowed(membership.subscriptionTier, type);
		await assertWrkspaceModuleLimit(resolved.wrkspaceId, membership.subscriptionTier, 1);
	} catch (err) {
		if (err instanceof PlanLimitError) {
			const requiredTier = err.code === 'PLAN_MODULE_GATED' ? getModuleTierMin(type) : undefined;
			return {
				error: planLimitFailMessage(err),
				planLimit: planLimitToInfo(err, requiredTier)
			};
		}
		throw err;
	}

	const [countRow] = await db
		.select({ value: count() })
		.from(wrkspaceModule)
		.where(and(eq(wrkspaceModule.wrkspaceId, resolved.wrkspaceId), eq(wrkspaceModule.type, type)));

	const [maxPos] = await db
		.select({ max: wrkspaceModule.position })
		.from(wrkspaceModule)
		.where(eq(wrkspaceModule.wrkspaceId, resolved.wrkspaceId))
		.orderBy(desc(wrkspaceModule.position))
		.limit(1);

	const title = defaultModuleTitle(type, Number(countRow?.value ?? 0));
	const id = uniqueId();
	const position = (maxPos?.max ?? -1) + 1;

	await db.insert(wrkspaceModule).values({
		id,
		wrkspaceId: resolved.wrkspaceId,
		type,
		title,
		position
	});

	await recordActivity({
		wrkspaceId: resolved.wrkspaceId,
		actorUserId: userId,
		type: 'module.added',
		moduleId: id,
		moduleType: type,
		targetType: 'module',
		targetId: id,
		metadata: { moduleTitle: title, title, moduleType: type }
	});

	return {
		id,
		wrkspaceId: resolved.wrkspaceId,
		type,
		title,
		position,
		teamSlug: resolved.teamSlug,
		wrkspaceSlug: resolved.wrkspaceSlug
	};
}

export async function updateModuleTitle(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	title: string
): Promise<boolean> {
	const resolved = await requireManageModulesAccess(userId, teamSlug, wrkspaceSlug);
	if (!resolved) return false;

	const trimmed = title.trim();
	if (!trimmed) return false;

	await db
		.update(wrkspaceModule)
		.set({ title: trimmed })
		.where(
			and(eq(wrkspaceModule.id, moduleId), eq(wrkspaceModule.wrkspaceId, resolved.wrkspaceId))
		);

	return true;
}

async function rewriteModulePositions(wrkspaceId: string, orderedIds: string[]): Promise<void> {
	for (let i = 0; i < orderedIds.length; i++) {
		await db
			.update(wrkspaceModule)
			.set({ position: i })
			.where(and(eq(wrkspaceModule.id, orderedIds[i]), eq(wrkspaceModule.wrkspaceId, wrkspaceId)));
	}
}

export async function deleteModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<boolean> {
	const resolved = await requireManageModulesAccess(userId, teamSlug, wrkspaceSlug);
	if (!resolved) return false;

	const deleted = await db
		.delete(wrkspaceModule)
		.where(and(eq(wrkspaceModule.id, moduleId), eq(wrkspaceModule.wrkspaceId, resolved.wrkspaceId)))
		.returning({ id: wrkspaceModule.id });

	if (deleted.length === 0) return false;

	const remaining = await db
		.select({ id: wrkspaceModule.id })
		.from(wrkspaceModule)
		.where(eq(wrkspaceModule.wrkspaceId, resolved.wrkspaceId))
		.orderBy(asc(wrkspaceModule.position), asc(wrkspaceModule.createdAt));

	await rewriteModulePositions(
		resolved.wrkspaceId,
		remaining.map((m) => m.id)
	);

	return true;
}

export async function reorderModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	targetPosition: number
): Promise<boolean> {
	const resolved = await requireManageModulesAccess(userId, teamSlug, wrkspaceSlug);
	if (!resolved) return false;

	const modules = await db
		.select({ id: wrkspaceModule.id })
		.from(wrkspaceModule)
		.where(eq(wrkspaceModule.wrkspaceId, resolved.wrkspaceId))
		.orderBy(asc(wrkspaceModule.position), asc(wrkspaceModule.createdAt));

	const ids = modules.map((m) => m.id);
	if (!ids.includes(moduleId)) return false;

	const filtered = ids.filter((id) => id !== moduleId);
	const pos = Math.max(0, Math.min(Math.floor(targetPosition), filtered.length));
	filtered.splice(pos, 0, moduleId);

	await rewriteModulePositions(resolved.wrkspaceId, filtered);
	return true;
}

export async function getModuleForUser(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<WrkspaceModule | undefined> {
	const resolved = await resolveWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!resolved) return undefined;

	const rows = await db
		.select({
			id: wrkspaceModule.id,
			wrkspaceId: wrkspaceModule.wrkspaceId,
			type: wrkspaceModule.type,
			title: wrkspaceModule.title,
			position: wrkspaceModule.position
		})
		.from(wrkspaceModule)
		.where(and(eq(wrkspaceModule.id, moduleId), eq(wrkspaceModule.wrkspaceId, resolved.wrkspaceId)))
		.limit(1);

	const mod = rows[0];
	if (!mod || !isModuleType(mod.type)) return undefined;

	return {
		id: mod.id,
		wrkspaceId: mod.wrkspaceId,
		type: mod.type,
		title: mod.title,
		position: mod.position,
		teamSlug: resolved.teamSlug,
		wrkspaceSlug: resolved.wrkspaceSlug
	};
}

export type ReactionGroup = {
	emoji: string;
	count: number;
	users: { id: string; name: string; image: string | null }[];
};

export type { ChatAttachmentRow };

export type ChatMessageRow = {
	id: string;
	body: string;
	authorId: string;
	authorName: string;
	authorImage: string | null;
	createdAt: Date;
	reactions: ReactionGroup[];
	attachments: ChatAttachmentRow[];
};

function groupReactions(
	rows: {
		messageId: string;
		emoji: string;
		userId: string;
		userName: string;
		userImage: string | null;
	}[]
): Map<string, ReactionGroup[]> {
	const byMessage = new Map<string, Map<string, ReactionGroup>>();

	for (const row of rows) {
		let emojiMap = byMessage.get(row.messageId);
		if (!emojiMap) {
			emojiMap = new Map();
			byMessage.set(row.messageId, emojiMap);
		}

		let group = emojiMap.get(row.emoji);
		if (!group) {
			group = { emoji: row.emoji, count: 0, users: [] };
			emojiMap.set(row.emoji, group);
		}

		group.count += 1;
		group.users.push({ id: row.userId, name: row.userName, image: row.userImage });
	}

	const result = new Map<string, ReactionGroup[]>();
	for (const [messageId, emojiMap] of byMessage) {
		const groups = [...emojiMap.values()].sort((a, b) => {
			if (b.count !== a.count) return b.count - a.count;
			return a.emoji.localeCompare(b.emoji);
		});
		result.set(messageId, groups);
	}

	return result;
}

function chatMessageListWhere(moduleId: string, q?: string): SQL {
	const base = eq(chatMessage.moduleId, moduleId);
	const trimmed = q?.trim();
	if (!trimmed) return base;

	const pattern = `%${escapeIlike(trimmed)}%`;
	return and(
		base,
		or(
			ilike(chatMessage.body, pattern),
			ilike(user.name, pattern),
			exists(
				db
					.select({ id: chatMessageAttachment.id })
					.from(chatMessageAttachment)
					.where(
						and(
							eq(chatMessageAttachment.messageId, chatMessage.id),
							ilike(chatMessageAttachment.originalName, pattern)
						)
					)
			)
		)
	)!;
}

export async function listChatMessages(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	options?: { q?: string }
): Promise<ChatMessageRow[]> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'chat') return [];

	const q = options?.q?.trim() ?? '';

	const messages = await db
		.select({
			id: chatMessage.id,
			body: chatMessage.body,
			authorId: chatMessage.authorId,
			authorName: user.name,
			authorImage: user.image,
			createdAt: chatMessage.createdAt
		})
		.from(chatMessage)
		.innerJoin(user, eq(chatMessage.authorId, user.id))
		.where(chatMessageListWhere(moduleId, q || undefined))
		.orderBy(asc(chatMessage.createdAt));

	if (messages.length === 0) return [];

	const messageIds = messages.map((m) => m.id);
	const reactionRows = await db
		.select({
			messageId: chatMessageReaction.messageId,
			emoji: chatMessageReaction.emoji,
			userId: chatMessageReaction.userId,
			userName: user.name,
			userImage: user.image
		})
		.from(chatMessageReaction)
		.innerJoin(user, eq(chatMessageReaction.userId, user.id))
		.where(inArray(chatMessageReaction.messageId, messageIds));

	const reactionsByMessage = groupReactions(reactionRows);
	const attachmentsByMessage = await loadAttachmentsForMessages(messageIds);

	return messages.map((m) => ({
		...m,
		reactions: reactionsByMessage.get(m.id) ?? [],
		attachments: attachmentsByMessage.get(m.id) ?? []
	}));
}

export async function toggleChatReaction(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	messageId: string,
	emoji: string
): Promise<boolean> {
	if (!isChatReactionEmoji(emoji)) return false;

	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'chat') return false;

	const message = await db
		.select({ id: chatMessage.id })
		.from(chatMessage)
		.where(and(eq(chatMessage.id, messageId), eq(chatMessage.moduleId, moduleId)))
		.limit(1);

	if (!message[0]) return false;

	const existing = await db
		.select({ id: chatMessageReaction.id })
		.from(chatMessageReaction)
		.where(
			and(
				eq(chatMessageReaction.messageId, messageId),
				eq(chatMessageReaction.userId, userId),
				eq(chatMessageReaction.emoji, emoji)
			)
		)
		.limit(1);

	if (existing[0]) {
		await db.delete(chatMessageReaction).where(eq(chatMessageReaction.id, existing[0].id));
	} else {
		await db.insert(chatMessageReaction).values({
			id: uniqueId(),
			messageId,
			userId,
			emoji
		});
	}

	return true;
}

export async function addChatMessage(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	body: string,
	files: File[] = []
): Promise<boolean> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'chat') return false;

	const trimmed = body.trim();
	const validFiles = files.filter((f) => f.size > 0);
	if (!trimmed && validFiles.length === 0) return false;

	const messageId = uniqueId();

	await db.insert(chatMessage).values({
		id: messageId,
		moduleId,
		authorId: userId,
		body: trimmed
	});

	try {
		await addChatMessageAttachments(userId, messageId, validFiles);
	} catch {
		await deleteAttachmentsForMessage(messageId);
		await db.delete(chatMessage).where(eq(chatMessage.id, messageId));
		return false;
	}

	return true;
}

export type CalendarEventRow = {
	id: string;
	title: string;
	description: string;
	icalUid: string | null;
	startsAt: Date;
	endsAt: Date | null;
	createdAt: Date;
};

export type CalendarIcsImportResult = {
	imported: number;
	updated: number;
	skipped: number;
};

export async function listCalendarEvents(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<CalendarEventRow[]> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'calendar') return [];

	return db
		.select({
			id: calendarEvent.id,
			title: calendarEvent.title,
			description: calendarEvent.description,
			icalUid: calendarEvent.icalUid,
			startsAt: calendarEvent.startsAt,
			endsAt: calendarEvent.endsAt,
			createdAt: calendarEvent.createdAt
		})
		.from(calendarEvent)
		.where(eq(calendarEvent.moduleId, moduleId))
		.orderBy(asc(calendarEvent.startsAt));
}

function normalizeEventDescription(description?: string): string {
	return description?.trim() ?? '';
}

export async function addCalendarEvent(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	data: {
		title: string;
		description?: string;
		startsAt: Date;
		endsAt?: Date | null;
		icalUid?: string | null;
	}
): Promise<boolean> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'calendar') return false;

	const trimmed = data.title.trim();
	if (!trimmed) return false;

	const id = uniqueId();
	const icalUid = data.icalUid?.trim() || wrkinIcalUid(id);

	await db.insert(calendarEvent).values({
		id,
		moduleId,
		title: trimmed,
		description: normalizeEventDescription(data.description),
		icalUid,
		startsAt: data.startsAt,
		endsAt: data.endsAt ?? null
	});

	return true;
}

export async function updateCalendarEvent(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	eventId: string,
	data: {
		title: string;
		description?: string;
		startsAt: Date;
		endsAt?: Date | null;
	}
): Promise<boolean> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'calendar') return false;

	const trimmed = data.title.trim();
	if (!trimmed) return false;

	const updated = await db
		.update(calendarEvent)
		.set({
			title: trimmed,
			description: normalizeEventDescription(data.description),
			startsAt: data.startsAt,
			endsAt: data.endsAt ?? null
		})
		.where(and(eq(calendarEvent.id, eventId), eq(calendarEvent.moduleId, moduleId)))
		.returning({ id: calendarEvent.id });

	return updated.length > 0;
}

export async function importCalendarEventsFromIcs(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	icsText: string
): Promise<CalendarIcsImportResult | null> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'calendar') return null;

	const { events, skippedRecurring } = parseIcsEvents(icsText);
	let imported = 0;
	let updated = 0;
	let skipped = skippedRecurring;

	for (const draft of events) {
		if (!draft.icalUid) {
			const ok = await addCalendarEvent(userId, teamSlug, wrkspaceSlug, moduleId, {
				title: draft.title,
				description: draft.description,
				startsAt: draft.startsAt,
				endsAt: draft.endsAt
			});
			if (ok) imported += 1;
			else skipped += 1;
			continue;
		}

		const existing = await db
			.select({ id: calendarEvent.id })
			.from(calendarEvent)
			.where(and(eq(calendarEvent.moduleId, moduleId), eq(calendarEvent.icalUid, draft.icalUid)))
			.limit(1);

		if (existing.length > 0) {
			const ok = await updateCalendarEvent(
				userId,
				teamSlug,
				wrkspaceSlug,
				moduleId,
				existing[0].id,
				{
					title: draft.title,
					description: draft.description,
					startsAt: draft.startsAt,
					endsAt: draft.endsAt
				}
			);
			if (ok) updated += 1;
			else skipped += 1;
		} else {
			const id = uniqueId();
			await db.insert(calendarEvent).values({
				id,
				moduleId,
				title: draft.title,
				description: normalizeEventDescription(draft.description),
				icalUid: draft.icalUid,
				startsAt: draft.startsAt,
				endsAt: draft.endsAt
			});
			imported += 1;
		}
	}

	return { imported, updated, skipped };
}

export async function buildCalendarIcsExport(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<string | null> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'calendar') return null;

	const rows = await listCalendarEvents(userId, teamSlug, wrkspaceSlug, moduleId);
	const exportEvents: IcsExportEvent[] = rows.map((row) => ({
		id: row.id,
		title: row.title,
		description: row.description,
		startsAt: row.startsAt,
		endsAt: row.endsAt,
		icalUid: row.icalUid,
		createdAt: row.createdAt
	}));

	return serializeIcsCalendar(exportEvents);
}

export async function deleteCalendarEvent(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	eventId: string
): Promise<boolean> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'calendar') return false;

	const deleted = await db
		.delete(calendarEvent)
		.where(and(eq(calendarEvent.id, eventId), eq(calendarEvent.moduleId, moduleId)))
		.returning({ id: calendarEvent.id });

	return deleted.length > 0;
}

export function moduleTypeLabel(type: ModuleType): string {
	return getModuleCatalogEntry(type).label;
}

export type BoardCardRow = {
	id: string;
	title: string;
	body: string;
	position: number;
};

export type CardColumnRow = {
	id: string;
	title: string;
	color: string;
	position: number;
	cards: BoardCardRow[];
};

export type CardBoard = {
	columns: CardColumnRow[];
};

async function assertCardsModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<boolean> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	return mod?.type === 'cards';
}

export async function ensureCardBoardSeed(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<void> {
	if (!(await assertCardsModule(userId, teamSlug, wrkspaceSlug, moduleId))) return;

	const [columnCountRow] = await db
		.select({ value: count() })
		.from(cardColumn)
		.where(eq(cardColumn.moduleId, moduleId));

	if (Number(columnCountRow?.value ?? 0) > 0) return;

	const columnId = uniqueId();
	const cardId = uniqueId();

	await db.insert(cardColumn).values({
		id: columnId,
		moduleId,
		title: DEFAULT_INBOX_COLUMN_TITLE,
		color: DEFAULT_CARD_COLUMN_COLOR,
		position: 0
	});

	await db.insert(boardCard).values({
		id: cardId,
		columnId,
		title: DEFAULT_WELCOME_CARD_TITLE,
		body: DEFAULT_WELCOME_CARD_BODY,
		position: 0
	});
}

export async function listCardBoard(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<CardBoard> {
	if (!(await assertCardsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return { columns: [] };
	}

	const columns = await db
		.select({
			id: cardColumn.id,
			title: cardColumn.title,
			color: cardColumn.color,
			position: cardColumn.position
		})
		.from(cardColumn)
		.where(eq(cardColumn.moduleId, moduleId))
		.orderBy(asc(cardColumn.position), asc(cardColumn.createdAt));

	if (columns.length === 0) return { columns: [] };

	const columnIds = columns.map((c) => c.id);
	const cards = await db
		.select({
			id: boardCard.id,
			columnId: boardCard.columnId,
			title: boardCard.title,
			body: boardCard.body,
			position: boardCard.position
		})
		.from(boardCard)
		.where(inArray(boardCard.columnId, columnIds))
		.orderBy(asc(boardCard.position), asc(boardCard.createdAt));

	const cardsByColumn = new Map<string, BoardCardRow[]>();
	for (const col of columns) {
		cardsByColumn.set(col.id, []);
	}

	for (const card of cards) {
		const list = cardsByColumn.get(card.columnId);
		if (list) {
			list.push({
				id: card.id,
				title: card.title,
				body: card.body,
				position: card.position
			});
		}
	}

	return {
		columns: columns.map((col) => ({
			id: col.id,
			title: col.title,
			color: col.color,
			position: col.position,
			cards: cardsByColumn.get(col.id) ?? []
		}))
	};
}

export async function addCardColumn(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	title: string
): Promise<boolean> {
	if (!(await assertCardsModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const trimmed = title.trim();
	if (!trimmed) return false;

	const [maxPos] = await db
		.select({ max: cardColumn.position })
		.from(cardColumn)
		.where(eq(cardColumn.moduleId, moduleId))
		.orderBy(desc(cardColumn.position))
		.limit(1);

	const color = normalizeHexColor(DEFAULT_CARD_COLUMN_COLOR) ?? DEFAULT_CARD_COLUMN_COLOR;

	await db.insert(cardColumn).values({
		id: uniqueId(),
		moduleId,
		title: trimmed,
		color,
		position: (maxPos?.max ?? -1) + 1
	});

	return true;
}

export async function updateCardColumn(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	columnId: string,
	data: { title: string; color: string }
): Promise<boolean> {
	if (!(await assertCardsModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const trimmedTitle = data.title.trim();
	if (!trimmedTitle) return false;

	const color = normalizeHexColor(data.color);
	if (!color) return false;

	const column = await db
		.select({ id: cardColumn.id })
		.from(cardColumn)
		.where(and(eq(cardColumn.id, columnId), eq(cardColumn.moduleId, moduleId)))
		.limit(1);

	if (!column[0]) return false;

	const updated = await db
		.update(cardColumn)
		.set({ title: trimmedTitle, color })
		.where(eq(cardColumn.id, columnId))
		.returning({ id: cardColumn.id });

	return updated.length > 0;
}

export async function addBoardCard(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	columnId: string,
	title: string,
	body = ''
): Promise<boolean> {
	if (!(await assertCardsModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const trimmed = title.trim();
	if (!trimmed) return false;

	const column = await db
		.select({ id: cardColumn.id })
		.from(cardColumn)
		.where(and(eq(cardColumn.id, columnId), eq(cardColumn.moduleId, moduleId)))
		.limit(1);

	if (!column[0]) return false;

	const [maxPos] = await db
		.select({ max: boardCard.position })
		.from(boardCard)
		.where(eq(boardCard.columnId, columnId))
		.orderBy(desc(boardCard.position))
		.limit(1);

	await db.insert(boardCard).values({
		id: uniqueId(),
		columnId,
		title: trimmed,
		body: body.trim(),
		position: (maxPos?.max ?? -1) + 1
	});

	return true;
}

async function rewriteCardPositions(columnId: string, orderedIds: string[]): Promise<void> {
	for (let i = 0; i < orderedIds.length; i++) {
		await db
			.update(boardCard)
			.set({ position: i })
			.where(and(eq(boardCard.id, orderedIds[i]), eq(boardCard.columnId, columnId)));
	}
}

async function rewriteColumnPositions(moduleId: string, orderedIds: string[]): Promise<void> {
	for (let i = 0; i < orderedIds.length; i++) {
		await db
			.update(cardColumn)
			.set({ position: i })
			.where(and(eq(cardColumn.id, orderedIds[i]), eq(cardColumn.moduleId, moduleId)));
	}
}

export async function moveBoardCard(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	cardId: string,
	targetColumnId: string,
	targetPosition: number
): Promise<boolean> {
	if (!(await assertCardsModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const card = await db
		.select({
			id: boardCard.id,
			columnId: boardCard.columnId
		})
		.from(boardCard)
		.innerJoin(cardColumn, eq(boardCard.columnId, cardColumn.id))
		.where(and(eq(boardCard.id, cardId), eq(cardColumn.moduleId, moduleId)))
		.limit(1);

	if (!card[0]) return false;

	const targetColumn = await db
		.select({ id: cardColumn.id })
		.from(cardColumn)
		.where(and(eq(cardColumn.id, targetColumnId), eq(cardColumn.moduleId, moduleId)))
		.limit(1);

	if (!targetColumn[0]) return false;

	const sourceColumnId = card[0].columnId;
	const pos = Math.max(0, Math.floor(targetPosition));

	if (sourceColumnId === targetColumnId) {
		const cards = await db
			.select({ id: boardCard.id })
			.from(boardCard)
			.where(eq(boardCard.columnId, sourceColumnId))
			.orderBy(asc(boardCard.position), asc(boardCard.createdAt));

		const ids = cards.map((c) => c.id).filter((id) => id !== cardId);
		ids.splice(Math.min(pos, ids.length), 0, cardId);
		await rewriteCardPositions(sourceColumnId, ids);
		return true;
	}

	const sourceCards = await db
		.select({ id: boardCard.id })
		.from(boardCard)
		.where(eq(boardCard.columnId, sourceColumnId))
		.orderBy(asc(boardCard.position), asc(boardCard.createdAt));

	const targetCards = await db
		.select({ id: boardCard.id })
		.from(boardCard)
		.where(eq(boardCard.columnId, targetColumnId))
		.orderBy(asc(boardCard.position), asc(boardCard.createdAt));

	const sourceIds = sourceCards.map((c) => c.id).filter((id) => id !== cardId);
	const targetIds = targetCards.map((c) => c.id);
	targetIds.splice(Math.min(pos, targetIds.length), 0, cardId);

	await db.update(boardCard).set({ columnId: targetColumnId }).where(eq(boardCard.id, cardId));

	await rewriteCardPositions(sourceColumnId, sourceIds);
	await rewriteCardPositions(targetColumnId, targetIds);

	return true;
}

export async function moveCardColumn(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	columnId: string,
	targetPosition: number
): Promise<boolean> {
	if (!(await assertCardsModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const columns = await db
		.select({ id: cardColumn.id })
		.from(cardColumn)
		.where(eq(cardColumn.moduleId, moduleId))
		.orderBy(asc(cardColumn.position), asc(cardColumn.createdAt));

	const ids = columns.map((c) => c.id);
	if (!ids.includes(columnId)) return false;

	const filtered = ids.filter((id) => id !== columnId);
	const pos = Math.max(0, Math.min(Math.floor(targetPosition), filtered.length));
	filtered.splice(pos, 0, columnId);

	await rewriteColumnPositions(moduleId, filtered);
	return true;
}

export async function updateBoardCard(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	cardId: string,
	data: { title: string; body: string }
): Promise<boolean> {
	if (!(await assertCardsModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const trimmedTitle = data.title.trim();
	if (!trimmedTitle) return false;

	const card = await db
		.select({ id: boardCard.id })
		.from(boardCard)
		.innerJoin(cardColumn, eq(boardCard.columnId, cardColumn.id))
		.where(and(eq(boardCard.id, cardId), eq(cardColumn.moduleId, moduleId)))
		.limit(1);

	if (!card[0]) return false;

	const updated = await db
		.update(boardCard)
		.set({ title: trimmedTitle, body: data.body.trim() })
		.where(eq(boardCard.id, cardId))
		.returning({ id: boardCard.id });

	return updated.length > 0;
}

export async function deleteBoardCard(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	cardId: string
): Promise<boolean> {
	if (!(await assertCardsModule(userId, teamSlug, wrkspaceSlug, moduleId))) return false;

	const card = await db
		.select({ id: boardCard.id, columnId: boardCard.columnId })
		.from(boardCard)
		.innerJoin(cardColumn, eq(boardCard.columnId, cardColumn.id))
		.where(and(eq(boardCard.id, cardId), eq(cardColumn.moduleId, moduleId)))
		.limit(1);

	if (!card[0]) return false;

	const deleted = await db
		.delete(boardCard)
		.where(eq(boardCard.id, cardId))
		.returning({ id: boardCard.id });

	if (deleted.length === 0) return false;

	const remaining = await db
		.select({ id: boardCard.id })
		.from(boardCard)
		.where(eq(boardCard.columnId, card[0].columnId))
		.orderBy(asc(boardCard.position), asc(boardCard.createdAt));

	await rewriteCardPositions(
		card[0].columnId,
		remaining.map((c) => c.id)
	);

	return true;
}
