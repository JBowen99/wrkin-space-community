import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import {
	ACTIVITY_CATALOG,
	DEFAULT_CATEGORY_ENABLED,
	NOTIFICATION_CATEGORIES,
	type ActivityEventInput,
	type ActivityMetadata,
	type ActivityType,
	type NotificationCategory
} from '../shared/activity';
import type { ActivityEventDisplay } from '../shared/activity-render';
import { isTeamAdminOrOwner, parseTeamRole } from '../shared/roles';
import { db } from './db';
import {
	activityEvent,
	docPage,
	notification,
	taskAssignee,
	team,
	teamMember,
	user,
	userNotificationPreference,
	wrkspace,
	wrkspaceMember,
	wrkspaceModule
} from './db/schema';
import { uniqueId } from '../shared/slug';

function parseMetadata(raw: string): ActivityMetadata {
	try {
		const parsed = JSON.parse(raw) as ActivityMetadata;
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

function serializeMetadata(metadata: ActivityMetadata | undefined): string {
	return JSON.stringify(metadata ?? {});
}

export type ModuleContext = {
	wrkspaceId: string;
	teamSlug: string;
	wrkspaceSlug: string;
	moduleId: string;
	moduleType: string;
	moduleTitle: string;
};

export async function getModuleContext(moduleId: string): Promise<ModuleContext | undefined> {
	const rows = await db
		.select({
			wrkspaceId: wrkspace.id,
			teamSlug: team.slug,
			wrkspaceSlug: wrkspace.slug,
			moduleId: wrkspaceModule.id,
			moduleType: wrkspaceModule.type,
			moduleTitle: wrkspaceModule.title
		})
		.from(wrkspaceModule)
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(wrkspaceModule.id, moduleId))
		.limit(1);

	return rows[0];
}

export async function getDocContext(
	docId: string
): Promise<(ModuleContext & { docTitle: string }) | undefined> {
	const rows = await db
		.select({
			wrkspaceId: wrkspace.id,
			teamSlug: team.slug,
			wrkspaceSlug: wrkspace.slug,
			moduleId: wrkspaceModule.id,
			moduleType: wrkspaceModule.type,
			moduleTitle: wrkspaceModule.title,
			docTitle: docPage.title
		})
		.from(docPage)
		.innerJoin(wrkspaceModule, eq(docPage.moduleId, wrkspaceModule.id))
		.innerJoin(wrkspace, eq(wrkspaceModule.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(eq(docPage.id, docId))
		.limit(1);

	return rows[0];
}

async function listWrkspaceMemberUserIds(wrkspaceId: string): Promise<string[]> {
	const wsRows = await db
		.select({ teamId: wrkspace.teamId })
		.from(wrkspace)
		.where(eq(wrkspace.id, wrkspaceId))
		.limit(1);
	const teamId = wsRows[0]?.teamId;
	if (!teamId) return [];

	const ids = new Set<string>();

	const explicitMembers = await db
		.select({ userId: wrkspaceMember.userId })
		.from(wrkspaceMember)
		.where(eq(wrkspaceMember.wrkspaceId, wrkspaceId));
	for (const row of explicitMembers) ids.add(row.userId);

	const teamMembers = await db
		.select({ userId: teamMember.userId, role: teamMember.role })
		.from(teamMember)
		.where(eq(teamMember.teamId, teamId));
	for (const row of teamMembers) {
		if (isTeamAdminOrOwner(parseTeamRole(row.role))) {
			ids.add(row.userId);
		}
	}

	return [...ids];
}

async function getTaskAssigneeIds(taskId: string): Promise<string[]> {
	const rows = await db
		.select({ userId: taskAssignee.userId })
		.from(taskAssignee)
		.where(eq(taskAssignee.taskId, taskId));
	return rows.map((r) => r.userId);
}

async function getUserCategoryPreferences(
	userIds: string[]
): Promise<Map<string, Set<NotificationCategory>>> {
	const enabledMap = new Map<string, Set<NotificationCategory>>();
	if (userIds.length === 0) return enabledMap;

	for (const userId of userIds) {
		enabledMap.set(
			userId,
			new Set(NOTIFICATION_CATEGORIES.filter((c) => DEFAULT_CATEGORY_ENABLED[c]))
		);
	}

	const rows = await db
		.select({
			userId: userNotificationPreference.userId,
			category: userNotificationPreference.category,
			enabled: userNotificationPreference.enabled
		})
		.from(userNotificationPreference)
		.where(inArray(userNotificationPreference.userId, userIds));

	for (const row of rows) {
		const category = row.category as NotificationCategory;
		if (!NOTIFICATION_CATEGORIES.includes(category)) continue;
		const set = enabledMap.get(row.userId);
		if (!set) continue;
		if (row.enabled) {
			set.add(category);
		} else {
			set.delete(category);
		}
	}

	return enabledMap;
}

export function resolveRecipientIds(
	input: ActivityEventInput,
	rule: (typeof ACTIVITY_CATALOG)[ActivityType]['notify'],
	assigneeIds: string[],
	wrkspaceMemberIds: string[]
): string[] {
	const metadata = input.metadata ?? {};

	switch (rule) {
		case 'none':
			return [];
		case 'assignees':
			return assigneeIds;
		case 'wrkspace_members':
			return wrkspaceMemberIds;
		case 'mentioned_users':
			return metadata.mentionedUserIds ?? metadata.assigneeIds ?? [];
		default:
			return [];
	}
}

export function filterRecipientsByPreferences(
	recipientIds: string[],
	category: NotificationCategory,
	preferences: Map<string, Set<NotificationCategory>>,
	actorUserId: string
): string[] {
	return recipientIds.filter((userId) => {
		if (userId === actorUserId) return false;
		const enabled = preferences.get(userId);
		if (!enabled) return DEFAULT_CATEGORY_ENABLED[category];
		return enabled.has(category);
	});
}

export async function recordActivity(input: ActivityEventInput): Promise<string | undefined> {
	const catalog = ACTIVITY_CATALOG[input.type];
	if (!catalog) return undefined;

	const eventId = uniqueId();
	const metadata = input.metadata ?? {};

	await db.insert(activityEvent).values({
		id: eventId,
		wrkspaceId: input.wrkspaceId,
		actorUserId: input.actorUserId,
		type: input.type,
		moduleId: input.moduleId ?? null,
		moduleType: input.moduleType ?? null,
		targetType: input.targetType,
		targetId: input.targetId,
		metadata: serializeMetadata(metadata),
		createdAt: new Date()
	});

	if (catalog.notify === 'none') {
		return eventId;
	}

	let assigneeIds: string[] = [];
	if (input.targetType === 'task') {
		assigneeIds =
			input.type === 'task.deleted'
				? (metadata.assigneeIds ?? [])
				: await getTaskAssigneeIds(input.targetId);
	}

	const wrkspaceMemberIds = await listWrkspaceMemberUserIds(input.wrkspaceId);
	const recipientIds = resolveRecipientIds(
		input,
		catalog.notify,
		assigneeIds,
		wrkspaceMemberIds
	);

	if (recipientIds.length === 0) {
		return eventId;
	}

	const preferences = await getUserCategoryPreferences(recipientIds);
	const filtered = filterRecipientsByPreferences(
		recipientIds,
		catalog.category,
		preferences,
		input.actorUserId
	);

	if (filtered.length === 0) {
		return eventId;
	}

	const now = new Date();
	await db.insert(notification).values(
		filtered.map((userId) => ({
			id: uniqueId(),
			userId,
			activityEventId: eventId,
			readAt: null,
			createdAt: now
		}))
	);

	return eventId;
}

function mapActivityRow(row: {
	id: string;
	type: string;
	actorUserId: string;
	actorName: string;
	actorImage: string | null;
	targetType: string;
	targetId: string;
	metadata: string;
	moduleId: string | null;
	moduleType: string | null;
	createdAt: Date;
}): ActivityEventDisplay {
	return {
		id: row.id,
		type: row.type as ActivityType,
		actorUserId: row.actorUserId,
		actorName: row.actorName,
		actorImage: row.actorImage,
		targetType: row.targetType,
		targetId: row.targetId,
		metadata: parseMetadata(row.metadata),
		moduleId: row.moduleId,
		moduleType: row.moduleType,
		createdAt: row.createdAt
	};
}

export async function listWrkspaceActivity(
	wrkspaceId: string,
	options: { limit?: number; cursor?: Date; moduleType?: string | null } = {}
): Promise<{ events: ActivityEventDisplay[]; nextCursor: Date | null }> {
	const limit = options.limit ?? 20;
	const conditions = [eq(activityEvent.wrkspaceId, wrkspaceId)];
	if (options.cursor) {
		conditions.push(lt(activityEvent.createdAt, options.cursor));
	}
	if (options.moduleType) {
		conditions.push(eq(activityEvent.moduleType, options.moduleType));
	}

	const rows = await db
		.select({
			id: activityEvent.id,
			type: activityEvent.type,
			actorUserId: activityEvent.actorUserId,
			actorName: user.name,
			actorImage: user.image,
			targetType: activityEvent.targetType,
			targetId: activityEvent.targetId,
			metadata: activityEvent.metadata,
			moduleId: activityEvent.moduleId,
			moduleType: activityEvent.moduleType,
			createdAt: activityEvent.createdAt
		})
		.from(activityEvent)
		.innerJoin(user, eq(activityEvent.actorUserId, user.id))
		.where(and(...conditions))
		.orderBy(desc(activityEvent.createdAt))
		.limit(limit + 1);

	const hasMore = rows.length > limit;
	const slice = hasMore ? rows.slice(0, limit) : rows;
	const events = slice.map(mapActivityRow);
	const nextCursor = hasMore ? (events[events.length - 1]?.createdAt ?? null) : null;

	return { events, nextCursor };
}

export type NotificationRow = {
	id: string;
	readAt: Date | null;
	createdAt: Date;
	event: ActivityEventDisplay;
	wrkspaceId: string;
	teamSlug: string;
	wrkspaceSlug: string;
	wrkspaceName: string;
};

export async function listUserNotifications(
	userId: string,
	options: {
		limit?: number;
		wrkspaceId?: string | null;
		unreadOnly?: boolean;
	} = {}
): Promise<NotificationRow[]> {
	const limit = options.limit ?? 20;
	const conditions = [eq(notification.userId, userId)];
	if (options.unreadOnly) {
		conditions.push(isNull(notification.readAt));
	}
	if (options.wrkspaceId) {
		conditions.push(eq(activityEvent.wrkspaceId, options.wrkspaceId));
	}

	const rows = await db
		.select({
			id: notification.id,
			readAt: notification.readAt,
			createdAt: notification.createdAt,
			eventId: activityEvent.id,
			type: activityEvent.type,
			actorUserId: activityEvent.actorUserId,
			actorName: user.name,
			actorImage: user.image,
			targetType: activityEvent.targetType,
			targetId: activityEvent.targetId,
			metadata: activityEvent.metadata,
			moduleId: activityEvent.moduleId,
			moduleType: activityEvent.moduleType,
			eventCreatedAt: activityEvent.createdAt,
			wrkspaceId: activityEvent.wrkspaceId,
			teamSlug: team.slug,
			wrkspaceSlug: wrkspace.slug,
			wrkspaceName: wrkspace.name
		})
		.from(notification)
		.innerJoin(activityEvent, eq(notification.activityEventId, activityEvent.id))
		.innerJoin(user, eq(activityEvent.actorUserId, user.id))
		.innerJoin(wrkspace, eq(activityEvent.wrkspaceId, wrkspace.id))
		.innerJoin(team, eq(wrkspace.teamId, team.id))
		.where(and(...conditions))
		.orderBy(desc(notification.createdAt))
		.limit(limit);

	return rows.map((row) => ({
		id: row.id,
		readAt: row.readAt,
		createdAt: row.createdAt,
		wrkspaceId: row.wrkspaceId,
		teamSlug: row.teamSlug,
		wrkspaceSlug: row.wrkspaceSlug,
		wrkspaceName: row.wrkspaceName,
		event: {
			id: row.eventId,
			type: row.type as ActivityType,
			actorUserId: row.actorUserId,
			actorName: row.actorName,
			actorImage: row.actorImage,
			targetType: row.targetType,
			targetId: row.targetId,
			metadata: parseMetadata(row.metadata),
			moduleId: row.moduleId,
			moduleType: row.moduleType,
			createdAt: row.eventCreatedAt
		}
	}));
}

export async function countUnreadNotifications(
	userId: string,
	wrkspaceId?: string | null
): Promise<number> {
	const conditions = [eq(notification.userId, userId), isNull(notification.readAt)];
	if (wrkspaceId) {
		conditions.push(eq(activityEvent.wrkspaceId, wrkspaceId));
	}

	const rows = await db
		.select({ value: sql<number>`count(*)::int` })
		.from(notification)
		.innerJoin(activityEvent, eq(notification.activityEventId, activityEvent.id))
		.where(and(...conditions));

	return Number(rows[0]?.value ?? 0);
}

export async function markNotificationRead(
	userId: string,
	notificationId: string
): Promise<boolean> {
	const updated = await db
		.update(notification)
		.set({ readAt: new Date() })
		.where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
		.returning({ id: notification.id });
	return updated.length > 0;
}

export async function markAllNotificationsRead(
	userId: string,
	wrkspaceId?: string | null
): Promise<number> {
	const now = new Date();
	if (wrkspaceId) {
		const ids = await db
			.select({ id: notification.id })
			.from(notification)
			.innerJoin(activityEvent, eq(notification.activityEventId, activityEvent.id))
			.where(
				and(
					eq(notification.userId, userId),
					isNull(notification.readAt),
					eq(activityEvent.wrkspaceId, wrkspaceId)
				)
			);
		if (ids.length === 0) return 0;
		await db
			.update(notification)
			.set({ readAt: now })
			.where(
				inArray(
					notification.id,
					ids.map((r) => r.id)
				)
			);
		return ids.length;
	}

	const updated = await db
		.update(notification)
		.set({ readAt: now })
		.where(and(eq(notification.userId, userId), isNull(notification.readAt)))
		.returning({ id: notification.id });
	return updated.length;
}

export type NotificationPreferenceRow = {
	category: NotificationCategory;
	enabled: boolean;
};

export async function listNotificationPreferences(
	userId: string
): Promise<NotificationPreferenceRow[]> {
	const rows = await db
		.select({
			category: userNotificationPreference.category,
			enabled: userNotificationPreference.enabled
		})
		.from(userNotificationPreference)
		.where(eq(userNotificationPreference.userId, userId));

	const stored = new Map(rows.map((r) => [r.category as NotificationCategory, r.enabled]));

	return NOTIFICATION_CATEGORIES.map((category) => ({
		category,
		enabled: stored.has(category) ? stored.get(category)! : DEFAULT_CATEGORY_ENABLED[category]
	}));
}

export async function updateNotificationPreferences(
	userId: string,
	updates: NotificationPreferenceRow[]
): Promise<void> {
	for (const update of updates) {
		await db
			.insert(userNotificationPreference)
			.values({
				userId,
				category: update.category,
				enabled: update.enabled,
				updatedAt: new Date()
			})
			.onConflictDoUpdate({
				target: [userNotificationPreference.userId, userNotificationPreference.category],
				set: {
					enabled: update.enabled,
					updatedAt: new Date()
				}
			});
	}
}

const docEditDebounceMs = 15 * 60 * 1000;
const docEditLastRecorded = new Map<string, number>();

export async function recordDocEditedActivity(docId: string, actorUserId: string): Promise<void> {
	const debounceKey = `${docId}:${actorUserId}`;
	const now = Date.now();
	const last = docEditLastRecorded.get(debounceKey);
	if (last != null && now - last < docEditDebounceMs) {
		return;
	}
	docEditLastRecorded.set(debounceKey, now);

	const ctx = await getDocContext(docId);
	if (!ctx) return;

	await recordActivity({
		wrkspaceId: ctx.wrkspaceId,
		actorUserId,
		type: 'doc.edited',
		moduleId: ctx.moduleId,
		moduleType: ctx.moduleType,
		targetType: 'doc',
		targetId: docId,
		metadata: { title: ctx.docTitle }
	});
}
