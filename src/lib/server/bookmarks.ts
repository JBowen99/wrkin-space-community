import { and, desc, eq } from 'drizzle-orm';
import { db } from './db/index.ts';
import { bookmark } from './db/schema.ts';
import { uniqueId } from '../shared/slug';
import type { BookmarkTargetType, BookmarkRow } from '../shared/bookmarks';
import { getWrkspaceAccess } from './authorization.ts';

function toRow(row: typeof bookmark.$inferSelect): BookmarkRow {
	return {
		id: row.id,
		userId: row.userId,
		teamSlug: row.teamSlug,
		wrkspaceId: row.wrkspaceId,
		wrkspaceName: row.wrkspaceName,
		wrkspaceSlug: row.wrkspaceSlug,
		moduleId: row.moduleId,
		moduleType: row.moduleType,
		targetType: row.targetType as BookmarkTargetType,
		targetId: row.targetId,
		contextId: row.contextId,
		label: row.label,
		createdAt: row.createdAt.toISOString()
	};
}

export async function addBookmark(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	data: {
		moduleId: string | null;
		moduleType: string;
		targetType: BookmarkTargetType;
		targetId: string;
		contextId?: string | null;
		label: string;
	}
): Promise<BookmarkRow | null> {
	const access = await getWrkspaceAccess(userId, teamSlug, wrkspaceSlug);
	if (!access) return null;

	const id = uniqueId();

	await db.insert(bookmark).values({
		id,
		userId,
		teamSlug,
		wrkspaceId: access.wrkspaceId,
		wrkspaceName: access.wrkspaceName,
		wrkspaceSlug: access.wrkspaceSlug,
		moduleId: data.moduleId,
		moduleType: data.moduleType,
		targetType: data.targetType,
		targetId: data.targetId,
		contextId: data.contextId ?? null,
		label: data.label
	});

	const rows = await db.select().from(bookmark).where(eq(bookmark.id, id)).limit(1);
	return rows[0] ? toRow(rows[0]) : null;
}

export async function removeBookmark(userId: string, bookmarkId: string): Promise<boolean> {
	const existing = await db
		.select({ userId: bookmark.userId })
		.from(bookmark)
		.where(eq(bookmark.id, bookmarkId))
		.limit(1);

	const row = existing[0];
	if (!row || row.userId !== userId) return false;

	await db.delete(bookmark).where(eq(bookmark.id, bookmarkId));
	return true;
}

export async function removeBookmarkByTarget(
	userId: string,
	targetType: BookmarkTargetType,
	targetId: string
): Promise<boolean> {
	const result = await db
		.delete(bookmark)
		.where(and(eq(bookmark.userId, userId), eq(bookmark.targetType, targetType), eq(bookmark.targetId, targetId)))
		.returning({ id: bookmark.id });

	return result.length > 0;
}

export async function listBookmarks(
	userId: string,
	options?: { wrkspaceId?: string | null; limit?: number }
): Promise<BookmarkRow[]> {
	const limit = options?.limit ?? 50;

	let rows;
	if (options?.wrkspaceId) {
		rows = await db
			.select()
			.from(bookmark)
			.where(and(eq(bookmark.userId, userId), eq(bookmark.wrkspaceId, options.wrkspaceId)))
			.orderBy(desc(bookmark.createdAt))
			.limit(limit);
	} else {
		rows = await db
			.select()
			.from(bookmark)
			.where(eq(bookmark.userId, userId))
			.orderBy(desc(bookmark.createdAt))
			.limit(limit);
	}

	return rows.map(toRow);
}

export async function getBookmarkByTarget(
	userId: string,
	targetType: BookmarkTargetType,
	targetId: string
): Promise<BookmarkRow | null> {
	const rows = await db
		.select()
		.from(bookmark)
		.where(and(eq(bookmark.userId, userId), eq(bookmark.targetType, targetType), eq(bookmark.targetId, targetId)))
		.limit(1);

	return rows[0] ? toRow(rows[0]) : null;
}
