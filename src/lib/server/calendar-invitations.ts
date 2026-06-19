import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from './db/index.ts';
import { calendarEventInvitation, user } from './db/schema.ts';
import { uniqueId } from '../shared/slug';

export type CalendarInvitationStatus = 'pending' | 'accepted' | 'declined';

export type CalendarInvitationRow = {
	id: string;
	eventId: string;
	userId: string;
	userName: string;
	userImage: string | null;
	status: CalendarInvitationStatus;
	createdAt: Date;
};

export async function loadInvitationsForEvents(
	eventIds: string[]
): Promise<Map<string, CalendarInvitationRow[]>> {
	const map = new Map<string, CalendarInvitationRow[]>();
	if (eventIds.length === 0) return map;

	const rows = await db
		.select({
			id: calendarEventInvitation.id,
			eventId: calendarEventInvitation.eventId,
			userId: calendarEventInvitation.userId,
			status: calendarEventInvitation.status,
			createdAt: calendarEventInvitation.createdAt,
			userName: user.name,
			userImage: user.image
		})
		.from(calendarEventInvitation)
		.innerJoin(user, eq(calendarEventInvitation.userId, user.id))
		.where(inArray(calendarEventInvitation.eventId, eventIds))
		.orderBy(asc(calendarEventInvitation.createdAt));

	for (const row of rows) {
		const list = map.get(row.eventId) ?? [];
		list.push({
			id: row.id,
			eventId: row.eventId,
			userId: row.userId,
			userName: row.userName,
			userImage: row.userImage,
			status: row.status as CalendarInvitationStatus,
			createdAt: row.createdAt
		});
		map.set(row.eventId, list);
	}

	return map;
}

export async function addEventInvitations(
	eventId: string,
	userIds: string[]
): Promise<CalendarInvitationRow[]> {
	if (userIds.length === 0) return [];

	const existing = await db
		.select({ userId: calendarEventInvitation.userId })
		.from(calendarEventInvitation)
		.where(eq(calendarEventInvitation.eventId, eventId));

	const existingSet = new Set(existing.map((r) => r.userId));
	const newUserIds = userIds.filter((id) => !existingSet.has(id));

	if (newUserIds.length === 0) return [];

	const values = newUserIds.map((uid) => ({
		id: uniqueId(),
		eventId,
		userId: uid,
		status: 'pending' as const,
		createdAt: new Date()
	}));

	await db.insert(calendarEventInvitation).values(values);

	const invitedUserIds = values.map((v) => v.userId);
	const users = await db
		.select({ id: user.id, name: user.name, image: user.image })
		.from(user)
		.where(inArray(user.id, invitedUserIds));

	const userMap = new Map(users.map((u) => [u.id, u]));

	return values.map((v) => ({
		id: v.id,
		eventId: v.eventId,
		userId: v.userId,
		userName: userMap.get(v.userId)?.name ?? 'Unknown',
		userImage: userMap.get(v.userId)?.image ?? null,
		status: v.status,
		createdAt: v.createdAt
	}));
}

export async function removeEventInvitation(invitationId: string): Promise<boolean> {
	const deleted = await db
		.delete(calendarEventInvitation)
		.where(eq(calendarEventInvitation.id, invitationId))
		.returning({ id: calendarEventInvitation.id });

	return deleted.length > 0;
}

export async function updateEventInvitationStatus(
	userId: string,
	eventId: string,
	status: CalendarInvitationStatus
): Promise<boolean> {
	const updated = await db
		.update(calendarEventInvitation)
		.set({ status })
		.where(
			and(
				eq(calendarEventInvitation.eventId, eventId),
				eq(calendarEventInvitation.userId, userId)
			)
		)
		.returning({ id: calendarEventInvitation.id });

	return updated.length > 0;
}

export async function deleteInvitationsForEvent(eventId: string): Promise<void> {
	await db.delete(calendarEventInvitation).where(eq(calendarEventInvitation.eventId, eventId));
}
